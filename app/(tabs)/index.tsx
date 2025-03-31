import { Text, View, TouchableOpacity, StyleSheet, StatusBar, Animated } from "react-native";
import { Link } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';

export default function Index() {
  
  // Page variables
  const [username, setUsername] = useState('');
  const displayName = username ? username : "User";
  
  // Hook: Load settings when component mounts
  useEffect(() => {
    loadUsername();
  }, []);
  
  // Hook: Set status bar when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBackgroundColor("#151020");
      StatusBar.setBarStyle("light-content");
      
      // Refresh username when screen comes into focus
      loadUsername();
      
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };
    }, [])
  );

  // Function: Returns the username from storage
  const loadUsername = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if(savedSettings !== null) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.username) {
          setUsername(parsedSettings.username);
        }
      }
    } catch (error) {
      console.log('Error loading username:', error);
    }
  };
  
  // Time dependent greeting
  let greeting;
  let emoji = "👋";

  const now = new Date();
  const hours = now.getHours();
  
  if (hours < 12) {
    greeting = "Good Morning";
    emoji = "☀️";
  } 
  else if (hours < 18) {
    greeting = "Good Afternoon";
    emoji = "🌤️";
  } 
  else {
    greeting = "Good Evening";
    emoji = "🌙";
  }

  // View: Welcome screen
  return (
    <LinearGradient
      colors={['#151020', '#232030', '#282830']}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.headingOne}>{greeting}, {displayName}!</Text>                       
        <Text style={styles.headingTwo}>Welcome to Perception</Text>
        <Text style={styles.subtitle}>Your vision assistant</Text>
        <TouchableOpacity style={styles.button}>
          <Link href="/camera" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.buttonText}>Start Guide</Text>
            <AntDesign name="arrowright" size={18} color="#232020" style={styles.buttonIcon} />
          </Link>
        </TouchableOpacity>
      </View>
      <StatusBar backgroundColor="#151020" barStyle="light-content"/>
    </LinearGradient>
  );
}

// CSS Styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  headingOne: {
    color: "white",
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  headingTwo: {
    color: "white",
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
  },
  buttonText: {
    color: "#232020",
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 8,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 50,
    marginTop: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginLeft: 5,
  },
});
