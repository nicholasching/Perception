import { Text, View, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { Link } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import * as Haptics from "expo-haptics";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  
  // State variables (store current setting values)
  const [username, setUsername] = useState('');

  // Use the saved username if available, otherwise use a default greeting
  const displayName = username ? username : "User";
  
  // Hook: Load settings when component mounts
  useEffect(() => {
    loadUsername();
  }, []);
  
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
  
  // Hook: Set status bar to blue when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBackgroundColor("#0000FF");
      StatusBar.setBarStyle("light-content");
      
      // Refresh username when screen comes into focus
      loadUsername();
      
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };
    }, [])
  );
  
  // Time dependent greeting
  let greeting;

  const now = new Date();
  const hours = now.getHours();
  
  if (hours < 12) {
    greeting = "Good Morning";
  } 
  else if (hours < 18) {
    greeting = "Good Afternoon";
  } 
  else {
    greeting = "Good Evening";
  }


  // View: Welcome screen
  return (
    <View
      style={{
        backgroundColor: "#232020",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={styles.headingOne}>{greeting}, {displayName}!</Text>                       
      <Text style={styles.headingTwo}>Welcome to iSight.</Text>
      
      <Link href="/camera" asChild>
        <TouchableOpacity 
          style={styles.button}
        >
          <Text style={styles.buttonText}>Start Guide</Text>
        </TouchableOpacity>
      </Link>
      <StatusBar backgroundColor = "#0000FF" barStyle="light-content"/>
    </View>
  );
}

// CSS Styling
const styles = StyleSheet.create({
  headingOne:{
    color: "white",
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  headingTwo: {
    color: "white",
    fontSize: 25,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonText: {
    color: "#232020",
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
