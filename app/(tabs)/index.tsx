import { Text, View, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { Link } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import * as Haptics from "expo-haptics";

export default function Index() {
  
  // Set status bar to blue when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBackgroundColor("#0000FF");
      StatusBar.setBarStyle("light-content");
      
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };
    }, [])
  );
  
  // Future update: Replace "Kimberly" with user's name and make greeting dynamic
  return (
    <View
      style={{
        backgroundColor: "#232020",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={styles.headingOne}>Good Morning, Kimberly!</Text>                       
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
