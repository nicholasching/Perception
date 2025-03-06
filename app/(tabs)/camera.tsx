// Importing necessary modules
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { Button, StyleSheet, Text, View, StatusBar } from 'react-native';
import * as Speech from "expo-speech";
import { uriToBase64, imgToText } from './gemini_util';
import { DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

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
  const [mode, setMode] = useState<Number>(0);
  const [rotation, setRotation] = useState({alpha: 0, beta: 0, gamma: 0,});

  // Reference hook variables for function use (workaround for useState closure)
  const rotationRef = useRef(rotation);
  const modeRef = useRef(mode);

  // Configuration constants
  const uprightAngle = 50;
  const modeCount = 2;

  // Hook: Initializes action listener to record rotation data - used to ensure the listener is not re-setup across renders (no dependencies)
  useEffect(()=>{
    DeviceMotion.setUpdateInterval(1000/60);
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
      DeviceMotion.removeAllListeners();
    };
  }, [])

  // Hook: Updates rotation reference value, triggered upon change of the rotation state variable
  useEffect(() => {
    // Haptic feedback when phone crosses the threshold angle, reset camera state
    if ((rotationRef.current.beta * (180/Math.PI)) < uprightAngle && (rotation.beta * (180/Math.PI)) > uprightAngle || (rotationRef.current.beta * (180/Math.PI)) > uprightAngle && (rotation.beta * (180/Math.PI)) < uprightAngle){
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      resetCamera();
    }
    rotationRef.current = rotation;
  }, [rotation]);

  // Hook: Updates mode reference value, triggered upon change of the mode state variable
  useEffect(() => {
    console.log("Mode Selected: "+ mode.valueOf())
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    modeRef.current = mode;
  }, [mode]);

  // Hook: Speaks the generated text, triggered upon change of the generated text state variable
  useEffect(() => {
    if (genText){
      speak();
    }
  },[genText]);

  // Hook: Initalizes the interval that automatically takes a photo - used to ensure the listener is not re-setup across renders (only dependent on camera ready state)
  useEffect(() => {
    console.log("Initiating interval.")
    let isProcessing = false;
    
    const interval = setInterval(async () => {
      // Access the current rotation value from the ref
      const currentAngle = (rotationRef.current.beta * (180/Math.PI));
      console.log("x: " + currentAngle.toFixed(2) + "°, Camera ready: " + isCameraReady);
      
      // Only proceed if camera is ready, phone is upright, and we're not already processing
      if (currentAngle > uprightAngle && isCameraReady && !isProcessing && cameraRef.current) {
        isProcessing = true;
        resetPhoto();
        
        try {
          console.log("Taking picture...");
          const photoUri = await takePicture(); // Capture the returned URI
          
          if (photoUri) {
            // Use the URI directly instead of depending on state update
            console.log("URI captured, generating description...");
            await generateDescription(photoUri); // Pass the URI explicitly
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
    }, 10000);

    // Helper: Terminates the interval, runs when the component unmounts
    return () => {
      clearInterval(interval);
    };
  }, [isCameraReady]); // Depend on camera ready state

  // Helper function: Camera re-mounting
  const resetCamera = () => {
    console.log("Resetting camera component");
    setIsCameraReady(false);
    setCameraKey(prevKey => prevKey + 1);
  };

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

  // Function: Voice output
  const speak = () => {
    Speech.speak(genText!=null ? genText: "Error: There is nothing to say.", {voice: "en-GB-Female"});
  };

  // Helper function: Mode toggle
  function toggleMode(){  // Implement check to ensure function is not processing
    console.log("Changing Mode.")
    if(mode.valueOf() < (modeCount - 1)){
      setMode(mode.valueOf() + 1);
    }
    else{
      setMode(0);
    }
  }

  // Helper function: Reset photo storage to prepare for new photo
  function resetPhoto(){
    console.log("Photo storage has been reset.")
    setUri(null);
    setGenText(null);
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

  // Function: Generates a description for the captured photo
  const generateDescription = async (photoUri: string | null = null) => {
    // The passed URI is used if available, otherwise the state URI is used
    const imageUri = photoUri || uri;
    
    // Generates the description of the image if the URI is available
    if (imageUri) {
      const base64 = await uriToBase64(imageUri);
      const text = await imgToText(base64, modeRef.current);
      setGenText(text);
      console.log("Gemini Vision to Text Received");
    } else {
      console.log("No URI available for description");
    }
  };

  // Recording view: Displayed when phone is upright
  if ((rotationRef.current.beta * (180/Math.PI)) > uprightAngle){
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
      <Text style={styles.inactivetext}>Tilt your phone above an angle of {uprightAngle}° to activate the camera.</Text>
      <Text style={styles.inactivetext}>Current Angle: {(rotationRef.current.beta * (180/Math.PI)).toFixed(1)}°</Text>
      <Button color = {"#00FF00"} onPress={toggleMode} title={"Toggle Mode"} />
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

// Deprecated code: View to test image and orientation data
  /*
  if (uri){
    return (
    <View>
        <Image
        source={{ uri }}
        resizeMode="contain"
        style={{ width: "100%", aspectRatio: 1 }}
        />
        <Text>x: {(rotation.beta * (180/Math.PI)).toFixed(2)}°</Text>
        <Text>y: {(rotation.gamma * (180/Math.PI)).toFixed(2)}°</Text>
        <Text>z: {(rotation.alpha * (180/Math.PI)).toFixed(2)}°</Text>
        <Button onPress={resetPhoto} title={"Take Another Picture"} />
    </View>
    );
  }
  */

// Deprecated code: Function to toggle camera direction
  /*
  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }
  */
