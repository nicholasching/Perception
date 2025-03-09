import { Text, View, StyleSheet, TextInput } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings Placeholder</Text>
      <TextInput style={styles.textInput}> Hi</TextInput>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
  },
  textInput: {
    tintColor: '#FF0000',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    textAlign: 'center',
    fontSize: 20,
    width: 200,
  }
});
