// Importing necessary modules
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, StyleSheet, Text, View, StatusBar } from 'react-native';
import * as Speech from "expo-speech";
import { uriToBase64, imgToText, customRequest } from '../utils/gemini_util';
import { DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Main View
export default function App() {
  // Camera remounting mechanism
  const [cameraKey, setCameraKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // State variables (saves variable data between renders)
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [uri, setUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [genText, setGenText] = useState<string | null>(null);
  const [rotation, setRotation] = useState({alpha: 0, beta: 0, gamma: 0,});
  const [uprightAngle, setUprightAngle] = useState(50);
  const [audioTimeout, setAudioTimeout] = useState(1000);
  const [recognizing, setRecognizing] = useState(false);
  const [activeTranscript, setActiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");

  // Reference hook variables for function use (workaround for useState closure)
  const rotationRef = useRef(rotation);
  const uprightAngleRef = useRef(uprightAngle);
  const audioTimeoutRef = useRef(audioTimeout);
  const lastTranscriptRef = useRef(lastTranscript);
  const finalTranscriptRef = useRef(finalTranscript);

  // Hook: Load settings when component mounts
  useEffect(() => {
    loadSettings();
  }, []);

  // Hook: Initializes action listener to record rotation data - used to ensure the listener is not re-setup across renders (no dependencies). Focus effect used to ensure listener is removed when swapping to a different page.
  useFocusEffect(
    useCallback(()=>{
      DeviceMotion.setUpdateInterval(1000/30);
      DeviceMotion.addListener(deviceMotionData => {
        const { rotation } = deviceMotionData;
        if (rotation) {
          setRotation({
            alpha: rotation.alpha,
            beta: rotation.beta,
            gamma: rotation.gamma
          });
        }
      })

      // Helper: Removes listener, runs when the component unmounts
      return () => {
        console.log("Removing rotation action listener");
        DeviceMotion.removeAllListeners();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };
    }, [])
  );  
  
  // Hook: Starts speech recognition and loads settings when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      
      // Reload settings when screen comes into focus
      loadSettings();
      
      // Add a flag to track if speech recognition has been started
      console.log("Focus effect triggered, attempting to start speech recognition");
      
      // Make sure any previous instances are stopped first
      ExpoSpeechRecognitionModule.stop();
      
      // Small delay before starting to ensure proper cleanup
      setTimeout(() => {
        handleStart();
        console.log("Speech recognition initiated.");
      }, 300);
      
      return () => {
        setIsFocused(false);
        console.log("Stopping speech recognition due to focus lost");
        ExpoSpeechRecognitionModule.stop();
      };
    }, [])
  );  

  // Hook: Initiates the interval that checks for prompt updates and triggers the camera capture
  useFocusEffect(
    useCallback(() => {
      console.log("Initiating interval.")
      let isProcessing = false;

      const interval = setInterval(async () => {
        if (finalTranscriptRef.current == "" && lastTranscriptRef.current == "") {
          // Nothing has been said
        }
        else if (finalTranscriptRef.current != lastTranscriptRef.current){
          setLastTranscript(finalTranscriptRef.current);
        }
        else {
          // Access the current rotation value from the ref
          const currentAngle = (rotationRef.current.beta * (180/Math.PI));
          console.log("x: " + currentAngle.toFixed(2) + "°, Camera ready: " + isCameraReady);
          
          // Only proceed if camera is ready, phone is upright, and not already processing
          if (currentAngle > uprightAngleRef.current && isCameraReady && !isProcessing && cameraRef.current) {
            isProcessing = true;
            resetPhoto();
            
            try {
              console.log("Taking picture...");
              const photoUri = await takePicture(); // Capture the returned URI
              
              if (photoUri) {
                // Use the URI directly instead of depending on state update
                console.log("URI captured, generating description...");
                await generateResponse(photoUri, finalTranscriptRef.current); // Pass the URI explicitly
              } else {
                console.log("No URI after taking picture");
              }
            } catch (error) {
              console.error('Error in photo cycle:', error);
              resetCamera(); // Reset camera on error
            } finally {
              isProcessing = false;
            }
          }
          else {
            // Implement a variable trigger to display a warning that audio has been detected and not in use and advising the user to raise the phone to activate
          }
          setFinalTranscript("");
        }
      }, audioTimeoutRef.current);

      // Helper: Terminates the interval, runs when the component unmounts
      return () => {
        console.log("Terminating camera capture interval")
        clearInterval(interval);
      };
    }, [isCameraReady])
  );

  // Hooks: Speech recognition event listeners
  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  useSpeechRecognitionEvent("result", (event) => {
    setActiveTranscript(event.results[0]?.transcript.trimStart());
    let text = (handleText(event.results[0]?.transcript.trimStart()));
    setFinalTranscript(text);
    setIsFinal(event.isFinal);
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (isFocused && event.error == "no-speech"){
      console.log("No speech has been detected")
    }
    else if (isFocused){
      console.log("Transcription terminated due to page unfocus")
    }
    else{
      console.log("error code:", event.error, "error message:", event.message);
    }
  });

  // Hook: Logs the active transcript and recognizing state
  useEffect(() => {
    console.log("Transcript:", activeTranscript, "; isFinal:", isFinal);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [activeTranscript, isFinal]);

  // Hook: Logs the ongoing transcript and updates the reference value
  useEffect (() => {
    console.log("Ongoing Transcript:", finalTranscript);
    finalTranscriptRef.current = finalTranscript;
  }, [finalTranscript]);

  // Hook: Updates the reference value of the last transcript
  useEffect (() => {
    lastTranscriptRef.current = lastTranscript;
  }, [lastTranscript]);

  // Hook: Updates rotation reference value, triggered upon change of the rotation state variable
  useEffect(() => {
    // Haptic feedback when phone crosses the threshold angle, reset camera state
    if ((rotationRef.current.beta * (180/Math.PI)) < uprightAngleRef.current && (rotation.beta * (180/Math.PI)) > uprightAngleRef.current || (rotationRef.current.beta * (180/Math.PI)) > uprightAngleRef.current && (rotation.beta * (180/Math.PI)) < uprightAngleRef.current){
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      resetCamera();
    }
    rotationRef.current = rotation;
  }, [rotation]);

  // Hook: Speaks the generated text, triggered upon change of the generated text state variable
  useEffect(() => {
    if (genText){
      speak();
    }
  },[genText]);

  // Function: Load settings from storage
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if(savedSettings !== null) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // Load activation angle
        if (parsedSettings.activationAngle !== undefined) {
          setUprightAngle(parsedSettings.activationAngle);
          uprightAngleRef.current = parsedSettings.activationAngle;
        }
        
        // Load audio timeout and convert from seconds to milliseconds
        if (parsedSettings.audioTimeout !== undefined) {
          const timeoutMs = parsedSettings.audioTimeout * 1000;
          setAudioTimeout(timeoutMs);
          audioTimeoutRef.current = timeoutMs;
        }
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  // Function: Starts speech recognition
  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn("Permissions not granted", result);
      return;
    }
    
    // Small delay to ensure component is fully mounted before starting speech recognition
    setTimeout(() => {
      console.log("Starting speech recognition after delay");
      // Start speech recognition
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,                           
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        contextualStrings: ["Carlsen", "Nepomniachtchi", "Praggnanandhaa"],
      });
    }, 500);
  };

  // Function: Handles new text from speech recognition stream
  const handleText = (activeTranscript: string) => {
    // Current active transcript is empty
    if (activeTranscript == ""){
      console.log('Text handler: No new text has been detected.')
    }
    // Current active transcript has been reset and does not contain any of the existing data
    else if (finalTranscript.indexOf(activeTranscript.split(" ")[0]) == -1){
      return (finalTranscript + " " + activeTranscript);
    }
    // Current active transcript is a continuation of the existing data
    else if (activeTranscript.substring(0, finalTranscript.length - finalTranscript.indexOf(activeTranscript.split(" ")[0])) == finalTranscript.substring(finalTranscript.indexOf(activeTranscript.split(" ")[0]), finalTranscript.length)){
      return (finalTranscript + activeTranscript.substring(finalTranscript.length - finalTranscript.indexOf(activeTranscript.split(" ")[0]), activeTranscript.length));
    }
    return finalTranscript;
  }

  // Function: Takes a photo and returns the URI pointing to the location of the photo
  const takePicture = async () => {
    // Ensure the camera reference is available and properly loaded
    if (!cameraRef.current) {
      console.log("Camera ref not available");
      throw new Error("Camera reference not available");
    }
    
    // Attempt capturing a photo
    try {
      const photo = await cameraRef.current.takePictureAsync();
      console.log("Photo taken:", photo ? "Success" : "Failed");
      
      if (photo?.uri) {
        setUri(photo.uri);
        return photo.uri;
      } else {
        console.log("No URI in photo object");
        return null;
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      throw error;
    }
  };

  // Function: Generates a response for the given prompt with photo context
  const generateResponse = async (photoUri: string | null = null, prompt: string) => {
    // The passed URI is used if available, otherwise the state URI is used
    const imageUri = photoUri || uri;
    
    // Generates the description of the image if the URI is available
    if (imageUri) {
      const base64 = await uriToBase64(imageUri);
      const text = await customRequest(base64, prompt);
      setGenText(text);
      console.log("Gemini Vision to Text Received");
    } else {
      console.log("No URI available for description");
    }
  };

  // Function: Voice output
  const speak = () => {
    Speech.speak(genText!=null ? genText: "Error: There is nothing to say.", {voice: "en-GB-Female"});
  };

  // Helper function: Camera re-mounting
  const resetCamera = () => {
    console.log("Resetting camera component");
    setIsCameraReady(false);
    setCameraKey(prevKey => prevKey + 1);
  };

  // Helper function: Reset photo storage to prepare for new photo
  function resetPhoto(){
    console.log("Photo storage has been reset.")
    setUri(null);
    setGenText(null);
  }

  // Check for whether camera permissions are still loading
  if (!permission) {
    return <View />;
  }

  // Check for whether camera permissions are granted
  else if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  // Recording view: Displayed when phone is upright
  if ((rotationRef.current.beta * (180/Math.PI)) > uprightAngleRef.current){
    return (
      <View style={styles.background}>
        <CameraView 
          key={cameraKey} // Key used to force camera remounting
          ref={cameraRef}
          style={styles.camera} 
          facing={facing}
          onCameraReady={() => {
            console.log("Camera is ready");
            setIsCameraReady(true);
          }}
        >
        </CameraView>
        <Text style={styles.recordingtext}>
          {isCameraReady ? "Recording" : "Preparing camera..."}
        </Text>
        <StatusBar backgroundColor = "#FF0000" barStyle="light-content"/>
      </View>
    );
  }

  // Inactive View: Displayed when phone is not upright
  return (
    <View style={styles.background}>
      <Text style={styles.inactivetext}>The camera is currently inactive.</Text>
      <Text style={styles.inactivetext}>Tilt your phone above an angle of {uprightAngleRef.current}° to activate the camera.</Text>
      <Text style={styles.inactivetext}>Current Angle: {(rotationRef.current.beta * (180/Math.PI)).toFixed(1)}°</Text>
      <StatusBar backgroundColor = "#00FF00" barStyle="light-content"/>
    </View>
  );
}

// CSS Styling
const styles = StyleSheet.create({
  background:{
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#232020',
  },
  recordingtext:{
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF0000',
    padding: 10,
  },
  inactivetext:{
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF00',
    padding: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});