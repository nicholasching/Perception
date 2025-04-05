import { Text, View, StyleSheet, TextInput, StatusBar, Linking, TouchableOpacity, Pressable, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  // State variables
  const [username, setUsername] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [compressionQuality, setCompressionQuality] = useState(80);
  const [activationAngle, setActivationAngle] = useState(45);
  const [audioTimeout, setAudioTimeout] = useState(2.0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  
  // Array of tick marks for sliders
  const audioTimeoutTicks = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5);
  const angleTicks = Array.from({ length: 10 }, (_, i) => i * 10);
  const qualityTicks = Array.from({ length: 7 }, (_, i) => 40 + i * 10);

  // Array of Gemini model options
  const modelOptions = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (more accurate responses)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (quicker responses)' },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (legacy model)" },
  ];
  
  // Hook: Load settings when component mounts
  useEffect(() => {
    loadSettings();
  }, []);

  // Hook: Set status bar when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBackgroundColor("#151020");
      StatusBar.setBarStyle("light-content");
      
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };
    }, [])
  );

    // Function: Toast animation handlers
    const showToast = () => {
      setToastVisible(true);
      
      Animated.parallel([
        Animated.timing(toastAnim, {
          toValue: 10,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(() => {
          setToastVisible(false);
        });
      }, 2000);
    };
  
    // Function: Button animation handlers
    const handlePressIn = () => {
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };
  
    const handlePressOut = () => {
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
      }).start();
    };
  
  // Function: Save settings to storage
  const saveSettings = async () => {
    try {
      // Assembling JSON Object
      const settings = {
        username,
        geminiApiKey,
        geminiModel,
        compressionQuality,
        activationAngle,
        audioTimeout,
      };
      
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast();
    } catch (error) {
      console.log('Error saving settings: ', error);
    }
  };
  
  // Function: Load settings from storage
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if(savedSettings !== null) {
        // Convert string to JSON object
        const parsedSettings = JSON.parse(savedSettings);
        setUsername(parsedSettings.username);
        if (parsedSettings.activationAngle !== undefined) {
          setActivationAngle(parsedSettings.activationAngle);
        }
        if (parsedSettings.audioTimeout !== undefined) {
          setAudioTimeout(parsedSettings.audioTimeout);
        }
        if (parsedSettings.geminiApiKey !== undefined) {
          setGeminiApiKey(parsedSettings.geminiApiKey);
        }
        if (parsedSettings.geminiModel !== undefined) {
          setGeminiModel(parsedSettings.geminiModel);
        }
        if (parsedSettings.compressionQuality !== undefined) {
          setCompressionQuality(parsedSettings.compressionQuality);
        }
      }
    } catch (error) {
      console.log('Error loading settings: ', error);
    }
  };

  // Function: Render toast notification
  const renderToast = () => {
    return (
      <Animated.View 
        style={[
          styles.toast, 
          { 
            transform: [{ translateY: toastAnim }],
            opacity: toastOpacity,
          }
        ]}
      >
        <AntDesign name="checkcircle" size={20} color="#4CD964" style={styles.toastIcon} />
        <Text style={styles.toastText}>Settings saved successfully!</Text>
      </Animated.View>
    );
  };

  // View: Settings screen
  return (
    <LinearGradient
      colors={['#151020', '#232030', '#282830']}
      style={styles.container}
    >
      {toastVisible && renderToast()}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Settings</Text>
          <Ionicons name="settings-outline" size={28} color="white" style={styles.headerIcon} />
        </View>
        
        <View style={styles.separator} />
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>User Profile</Text>
          
          <Text style={styles.label}>Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
            <TextInput 
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>API Configuration</Text>
          
          <Text style={styles.label}>Gemini API Key</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
            <TextInput 
              style={styles.textInput}
              value={geminiApiKey}
              onChangeText={setGeminiApiKey}
              placeholder="Enter your Gemini API key"
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry={true}
            />
          </View>
          
          <Text style={styles.label}>Gemini Model</Text>
          <Pressable 
            style={styles.dropdownButton}
            onPress={() => setDropdownOpen(!dropdownOpen)}
          >
            <Text style={styles.dropdownButtonText}>
              {modelOptions.find(option => option.value === geminiModel)?.label || 'Select a model'}
            </Text>
            <AntDesign 
              name={dropdownOpen ? "up" : "down"} 
              size={16} 
              color="rgba(255,255,255,0.7)" 
            />
          </Pressable>
          
          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {modelOptions.map((option) => (
                <Pressable 
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    geminiModel === option.value && styles.dropdownItemActive
                  ]}
                  onPress={() => {
                    setGeminiModel(option.value);
                    setDropdownOpen(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    geminiModel === option.value && styles.dropdownItemTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {geminiModel === option.value && (
                    <AntDesign name="check" size={18} color="#3B82F6" />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          <Animated.View style={[{ transform: [{ scale: buttonScale }] }, styles.buttonContainer]}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={() => Linking.openURL('https://scribehow.com/shared/Create_and_Copy_Google_API_Key__tCLcrHRDSTyneNx8QwXoWA')}
            >
              <AntDesign name="link" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Get an API Key</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Image Settings</Text>
          
          <Text style={styles.label}>Image Compression Quality: <Text style={styles.valueText}>{compressionQuality}%</Text></Text>
          <Slider
            style={styles.slider}
            minimumValue={40}
            maximumValue={100}
            step={10}
            value={compressionQuality}
            onValueChange={(value) => {
              setCompressionQuality(value);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            minimumTrackTintColor="#3B82F6"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#3B82F6"
            tapToSeek={true}
          />
          <View style={styles.ticksContainer}>
            {qualityTicks.map((value) => (
              <View key={value} style={styles.tick}>
                <View style={[styles.tickMark, compressionQuality >= value && styles.activeTickMark]} />
                <Text style={[styles.tickText, compressionQuality === value && styles.activeTickText]}>{value}%</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Accessibility Settings</Text>
          
          <Text style={styles.label}>Activation Angle: <Text style={styles.valueText}>{activationAngle}°</Text></Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={90}
            step={10}
            value={activationAngle}
            onValueChange={(value) => {
              setActivationAngle(value);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            minimumTrackTintColor="#3B82F6"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#3B82F6"
            tapToSeek={true}
          />
          <View style={styles.ticksContainer}>
            {angleTicks.map((value) => (
              <View key={value} style={styles.tick}>
                <View style={[styles.tickMark, activationAngle >= value && styles.activeTickMark]} />
                <Text style={[styles.tickText, activationAngle === value && styles.activeTickText]}>{value}°</Text>
              </View>
            ))}
          </View>
          
          <Text style={styles.label}>Audio Recognition Timeout: <Text style={styles.valueText}>{audioTimeout} seconds</Text></Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={5.0}
            step={0.5}
            value={audioTimeout}
            onValueChange={(value) => {
              setAudioTimeout(value);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            minimumTrackTintColor="#3B82F6"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#3B82F6"
            tapToSeek={true}
          />
          <View style={styles.ticksContainer}>
            {audioTimeoutTicks.map((value) => (
              <View key={value} style={styles.tick}>
                <View style={[styles.tickMark, audioTimeout >= value && styles.activeTickMark]} />
                <Text style={[styles.tickText, audioTimeout === value && styles.activeTickText]}>{value}s</Text>
              </View>
            ))}
          </View>
        </View>
        
        <Animated.View style={[{ transform: [{ scale: buttonScale }] }, styles.buttonContainer]}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={saveSettings}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <AntDesign name="save" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Save Settings</Text>
          </TouchableOpacity>
        </Animated.View>
        <Text 
          style={styles.version} 
          onPress={() => Linking.openURL('https://www.nicholasching.ca/perception-privacy-policy')}
        >
          © 2025 Perception | v2.0
        </Text>
      </ScrollView>
      <StatusBar backgroundColor="#151020" barStyle="light-content"/>
    </LinearGradient>
  );
}

// CSS Styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  headerIcon: {
    marginLeft: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginBottom: 15,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginBottom: 8,
  },
  valueText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    padding: 12,
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  dropdownMenu: {
    backgroundColor: 'rgba(45, 45, 60, 0.95)',
    borderRadius: 8,
    marginTop: -10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  dropdownItemTextSelected: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  ticksContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  tick: {
    alignItems: 'center',
  },
  tickMark: {
    width: 2,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeTickMark: {
    backgroundColor: '#3B82F6',
  },
  tickText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 4,
  },
  activeTickText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  version: {
    color: 'rgba(255,255,255,0.4)',
    marginTop: 30,
    marginBottom: -15,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(45, 45, 60, 0.95)',
    zIndex: 999,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 217, 100, 0.3)',
  },
  toastText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toastIcon: {
    marginRight: 10,
  },
});
