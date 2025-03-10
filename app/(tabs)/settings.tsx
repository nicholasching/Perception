import { Text, View, StyleSheet, TextInput, Button, StatusBar, Linking, TouchableOpacity, Pressable } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';

export default function SettingsScreen() {
  // State variables (store current setting values)
  const [username, setUsername] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [compressionQuality, setCompressionQuality] = useState(80); // Default compression quality
  const [activationAngle, setActivationAngle] = useState(45);
  const [audioTimeout, setAudioTimeout] = useState(2.0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Generates array of tick marks
  const audioTimeoutTicks = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5);
  const angleTicks = Array.from({ length: 10 }, (_, i) => i * 10);
  const qualityTicks = Array.from({ length: 7 }, (_, i) => 40 + i * 10); // From 40 to 100 in steps of 10

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

  // Hook: Set status bar to blue when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBackgroundColor("#0000FF");
      StatusBar.setBarStyle("light-content");
      
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };
    }, [])
  );
  
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      alert('Settings saved!');
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

  // View: Settings screen
  return (
    <View style={styles.background}>
      <Text style={styles.title}>Settings</Text>
      
      <View style={styles.separator} />
      
      <Text style={styles.label}>Name:</Text>
      <TextInput 
        style={styles.textInput}
        value={username}
        onChangeText={setUsername}
        placeholder="Enter your name"
      />
      
      <Text style={styles.label}>Gemini API Key:</Text>
      <TextInput 
        style={styles.textInput}
        value={geminiApiKey}
        onChangeText={setGeminiApiKey}
        placeholder="Enter your Gemini API key"
        secureTextEntry={true}
      />
      <Text style={styles.label}>Gemini Model:</Text>
      <View style={styles.dropdownContainer}>
        <Pressable 
          style={styles.dropdown}
          onPress={() => setDropdownOpen(!dropdownOpen)}
        >
          <Text style={styles.dropdownText}>
            {modelOptions.find(option => option.value === geminiModel)?.label || 'Select a model'}
          </Text>
        </Pressable>
        
        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {modelOptions.map((option) => (
              <Pressable 
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => {
                  setGeminiModel(option.value);
                  setDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  geminiModel === option.value && styles.dropdownItemSelected
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      
      <Text style={styles.label}>Image Compression Quality: {compressionQuality}%</Text>
      <View>
        <Slider
          style={styles.slider}
          minimumValue={40}
          maximumValue={100}
          step={10}
          value={compressionQuality}
          onValueChange={(value) => setCompressionQuality(value)}
          minimumTrackTintColor="#2196F3"
          maximumTrackTintColor="#FFFFFF"
          thumbTintColor="#2196F3"
          tapToSeek={false}
        />
        <View style={styles.ticksContainer}>
          {qualityTicks.map((value) => (
            <View key={value} style={styles.tick}>
              <View style={styles.tickMark} />
              <Text style={styles.tickText}>{value}%</Text>
            </View>
          ))}
        </View>
      </View>
      
      <Text style={styles.label}>Activation Angle: {activationAngle}°</Text>
      <View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={90}
          step={10}
          value={activationAngle}
          onValueChange={(value) => setActivationAngle(value)}
          minimumTrackTintColor="#2196F3"
          maximumTrackTintColor="#FFFFFF"
          thumbTintColor="#2196F3"
          tapToSeek={false}
        />
        <View style={styles.ticksContainer}>
          {angleTicks.map((value) => (
            <View key={value} style={styles.tick}>
              <View style={styles.tickMark} />
              <Text style={styles.tickText}>{value}°</Text>
            </View>
          ))}
        </View>
      </View>
      
      <Text style={styles.label}>Audio Recognition Timeout: {audioTimeout} seconds</Text>
      <View>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={5.0}
          step={0.5}
          value={audioTimeout}
          onValueChange={(value) => setAudioTimeout(value)}
          minimumTrackTintColor="#2196F3"
          maximumTrackTintColor="#FFFFFF"
          thumbTintColor="#2196F3"
          tapToSeek={false}
        />
        <View style={styles.ticksContainer}>
          {audioTimeoutTicks.map((value) => (
            <View key={value} style={styles.tick}>
              <View style={styles.tickMark} />
              <Text style={styles.tickText}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <Button 
        title="Save Settings" 
        onPress={saveSettings} 
        color="#2196F3"
      />
    </View>
  );
}

// CSS Styling
const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#232020',
    padding: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
    marginBottom: 15,
    opacity: 0.5,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    padding: 10,
    fontSize: 16,
    width: '100%',
    borderRadius: 5,
    marginBottom: 10,
  },
  dropdownContainer: {
    marginBottom: 10,
    zIndex: 1,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 5,
    marginBottom: 5,
  },
  dropdownText: {
    fontSize: 16,
    color: '#000000',
  },
  dropdownMenu: {
    backgroundColor: '#333333',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#444444',
    marginTop: -5,
  },
  dropdownItem: {
    padding: 12,
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  dropdownItemSelected: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: -24,
  },
  ticksContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  tick: {
    alignItems: 'center',
  },
  tickMark: {
    width: 2,
    height: 8,
    backgroundColor: '#FFFFFF',
  },
  tickText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 2,
  }
});
