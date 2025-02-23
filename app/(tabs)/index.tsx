import { Text, View, TouchableOpacity, StyleSheet } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        backgroundColor: "#25292e",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={styles.text}>Hi.</Text>
      <Text style={styles.text}>This is an test. </Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => alert("Welcome to React Native!")}
      >
        <Text style={styles.buttonText}>Press me too</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "white",
    fontSize: 16,
  },
  button: {
    backgroundColor: '#25292e',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
