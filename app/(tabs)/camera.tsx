// Importing necessary modules
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Image, StatusBar } from 'react-native';
import * as Speech from "expo-speech";
import { uriToBase64, imgToText } from './gemini_util';
import { DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

// Main View
export default function App() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [uri, setUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [testText, settestText] = useState<string | null>(null);
  // FUTURE FEATURE: Implement mode switching
  const [mode, setMode] = useState<Number>(0);
  const [rotation, setRotation] = useState({alpha: 0, beta: 0, gamma: 0,});
  const speak = () => {
    Speech.speak(testText!=null ? testText: "Error: There is nothing to say.", {voice: "en-GB-Female"});
  };

  // Configuration Constants
  const uprightAngle = 50;
  const modeCount = 2;

  // Initializes ActionListener to record rotation data
  useEffect(()=>{
    DeviceMotion.setUpdateInterval(50);
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

    // Clean up subscription when component unmounts
    return () => {
      DeviceMotion.removeAllListeners();
    };
  }, [])

  // Creates ref to track current rotation value for use (workaround for useState closure)
  const rotationRef = useRef(rotation);

  // Updates ref when rotation changes
  useEffect(() => {
    if ((rotationRef.current.beta * (180/Math.PI)) < uprightAngle && (rotation.beta * (180/Math.PI)) > uprightAngle || (rotationRef.current.beta * (180/Math.PI)) > uprightAngle && (rotation.beta * (180/Math.PI)) < uprightAngle){
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    }
    rotationRef.current = rotation;
  }, [rotation]);

  // Regularly takes a photo
  useEffect(() => {
    console.log("Initiating interval.")
    const interval = setInterval(async () => {
      // Access the current rotation value from the ref
      console.log("x: " + (rotationRef.current.beta * (180/Math.PI)).toFixed(2) + "°");

      if ((rotationRef.current.beta * (180/Math.PI)) > uprightAngle){
        resetPhoto();
        try{
          await retrieveDescription();
        }
        catch (error){
          console.error('Error retrieving description:', error);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures interval is only set up once


  useEffect(() => {
    if (testText){
      speak();
    }
  },[testText]);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  function toggleMode(){
    console.log("Changing Mode.")
    if(mode.valueOf() < (modeCount - 1)){
      setMode(mode.valueOf() + 1);
    }
    else{
      setMode(0);
    }
    console.log("Mode Selected: "+ mode.valueOf())
  }

  function resetPhoto(){
    console.log("Photo storage has been reset.")
    setUri(null);
    settestText(null);
  }

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync();
    if (photo?.uri) {
      setUri(photo.uri);
    }
  };

  const generateDescription = async () => {
    if (uri) {
      settestText(await imgToText(await uriToBase64(uri), mode));
    }
    console.log("Gemini Vision to Text Recieved");
  }

  async function retrieveDescription(){
    try{
      await takePicture();
      await generateDescription();
    }
    catch(error){
      console.error('Error retrieving description:', error);
    }
  }

  // Recording view: Displayed when phone is upright
  if ((rotationRef.current.beta * (180/Math.PI)) > uprightAngle){
    return (
      <View style={styles.background}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera} 
          facing={facing}
        >
        </CameraView>
        <Text style={styles.recordingtext}>Recording</Text>
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
