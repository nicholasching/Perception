// Importing necessary modules
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, StyleSheet, Text, View, StatusBar, Animated } from 'react-native';
import * as Speech from "expo-speech";
import { GeminiService } from '../utils/gemini_util';
import { DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Main View
export default function App() {

  // State variables (saves variable data between renders)
  const [geminiService] = useState<GeminiService>(GeminiService.getInstance());
  const [serviceInitialized, setServiceInitialized] = useState<boolean>(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
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
  const [isCurrentlySpeaking, setIsCurrentlySpeaking] = useState(false);
  const [isCurrentlyProcessing, setIsCurrentlyProcessing] = useState(false);

  // Reference hook variables for function use (workaround for useState closure)
  const rotationRef = useRef(rotation);
  const uprightAngleRef = useRef(uprightAngle);
  const audioTimeoutRef = useRef(audioTimeout);
  const lastTranscriptRef = useRef(lastTranscript);
  const finalTranscriptRef = useRef(finalTranscript);
  const isCurrentlySpeakingRef = useRef(isCurrentlySpeaking);
  const isCurrentlyProcessingRef = useRef(isCurrentlyProcessing);
  const isCurrentlyRecognizingRef = useRef(recognizing);

  // State and reference variables for animations
  const [prevStatusText, setPrevStatusText] = useState("");
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Hook: Load settings when component mounts
  useEffect(() => {
    loadSettings();
  }, []);

  // Hook: Initialize Gemini when page is focused
  useFocusEffect(
    useCallback(() => {
      const initializeService = async () => {
        try {
          if (await geminiService.initialize()) {
            console.log("Gemini initialized successfully");
            setServiceInitialized(true);
          } 
          else {
            console.error("Failed to initialize Gemini");
          }
        } 
        catch (error) {
          console.error("Error initializing Gemini:", error);
        }
      };
      
      initializeService();

      // Helper: Terminates instance, runs when the component unmounts (ensures model is updated should settings change)
      return () => {
        console.log("Terminating Gemini");
        geminiService.terminate();
        setServiceInitialized(false);
      }
    }, [])
  );

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

  // Hook: Updates current speech output status 
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(async () => {
        // Update speaking status
        let isSpeaking = await Speech.isSpeakingAsync();
        setIsCurrentlySpeaking(isSpeaking);

        // Initialize speech recognition if not already recognizing, processing, speaking, and angle is above threshold
        if (!isCurrentlyRecognizingRef.current && !isCurrentlyProcessingRef.current && !isSpeaking && (rotationRef.current.beta * (180/Math.PI)) > uprightAngleRef.current){
          setRecognizing(true); // Temporary solution: need to check if actually sucessfully started
          handleStart();
          console.log("Speech recognition initiated.");
        }
      }, 100);

      // Helper: Terminates the interval, runs when the component unmounts
      return () => {
        console.log("Terminating speech output status interval")
        clearInterval(interval);
      };
    }, [])
  );
  
  // Hook: Starts speech recognition and loads settings when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      
      // Reload settings when screen comes into focus
      loadSettings();
      
      // Make sure any previous instances are stopped first
      ExpoSpeechRecognitionModule.stop();
      
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
            setIsCurrentlyProcessing(true);
            ExpoSpeechRecognitionModule.stop();
            console.log("Stopping speech recognition due to processing start")
            resetPhoto();
            
            try {
              console.log("Taking picture...");
              const photoUri = await takePicture();
              
              if (photoUri) {
                console.log("URI captured, generating description...");
                await generateResponse(photoUri, finalTranscriptRef.current);
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

  // Hook: Updates the reference value of the speaking state
  useEffect (() => {
    isCurrentlySpeakingRef.current = isCurrentlySpeaking;
  }, [isCurrentlySpeaking]);

  // Hook: Updates the reference value of the processing state
  useEffect (() => {
    isCurrentlyProcessingRef.current = isCurrentlyProcessing;
  }, [isCurrentlyProcessing]);

  // Hook: Updates the reference value of the recognizing state
  useEffect (() => {
    isCurrentlyRecognizingRef.current = recognizing;
  }, [recognizing]);
  
  // Hook: Updates rotation reference value, triggered upon change of the rotation state variable
  useEffect(() => {
    // Haptic feedback when phone crosses the threshold angle, reset camera state
    if ((rotationRef.current.beta * (180/Math.PI)) < uprightAngleRef.current && (rotation.beta * (180/Math.PI)) > uprightAngleRef.current || (rotationRef.current.beta * (180/Math.PI)) > uprightAngleRef.current && (rotation.beta * (180/Math.PI)) < uprightAngleRef.current){
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      resetCamera();
    }
    // Stopping speech recognition if the phone is below the threshold angle
    if (rotation.beta * (180/Math.PI) < uprightAngleRef.current && recognizing){
      ExpoSpeechRecognitionModule.stop();
      console.log("Stopping speech recognition due to phone angle");
    }
    rotationRef.current = rotation;
  }, [rotation]);

  // Hook: Speaks the generated text, triggered upon change of the generated text state variable
  useEffect(() => {
    if (genText){
      setIsCurrentlyProcessing(false);
      speak();
    }
  },[genText]);

  // Hook: Animate status text when it changes
  useEffect(() => {
    let statusText;
    
    if (!isCameraReady) {
      statusText = "Preparing Camera";
    } 
    else if (!recognizing && !isCurrentlyProcessing && !isCurrentlySpeaking) {
      statusText = "Recording";
    } 
    else if (finalTranscript == "" && !isCurrentlyProcessing && !isCurrentlySpeaking) {
      statusText = "Listening";
    } 
    else if (!isCurrentlyProcessing && !isCurrentlySpeaking) {
      statusText = finalTranscript;
    } 
    else if (!isCurrentlySpeaking) {
      statusText = "Processing";
    } 
    else {
      statusText = "Responding";
    }
    
    if (prevStatusText !== statusText) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPrevStatusText(statusText);
        
        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [isCameraReady, recognizing, isCurrentlyProcessing, isCurrentlySpeaking, finalTranscript]);

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
      try {
        // Check if service is initialized
        if (!serviceInitialized) {
          if (!await geminiService.initialize()) {
            setGenText("Sorry, the vision model was not initialized properly. Please check your settings and try again.");
            return;
          }
        }
        
        const base64 = await geminiService.uriToBase64(imageUri);
        const text = await geminiService.customRequest(base64, prompt);
        setGenText(text);
        console.log("Gemini Vision to Text Received");
        
        // Deleting captured photo
        try {
          await FileSystem.deleteAsync(imageUri, { idempotent: true });
          console.log("Image file deleted successfully");
        } catch (deleteError) {
          console.error("Error deleting image file:", deleteError);
        }
      } 
      catch (error) {
        console.error("Error generating response:", error);
        setGenText("Sorry, there was an error. Please try again.");
        
        // Deleting captured photo
        try {
          await FileSystem.deleteAsync(imageUri, { idempotent: true });
          console.log("Image file deleted after error");
        } catch (deleteError) {
          console.error("Error deleting image file after processing error:", deleteError);
        }
      }
    } 
    else {
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
          key={cameraKey}
          ref={cameraRef}
          style={styles.camera} 
          facing={facing}
          onCameraReady={() => {
            console.log("Camera is ready");
            setIsCameraReady(true);
          }}
        >
        </CameraView>
        <View style={styles.statusContainer}>
          <Animated.Text 
            style={[
              styles.recordingtext,
              { 
                opacity: fadeAnim,
                transform: [{scale: scaleAnim}] 
              }
            ]}
          >
            {prevStatusText}
          </Animated.Text>
        </View>
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
  statusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});