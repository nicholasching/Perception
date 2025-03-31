# Perception
An assistive mobile app created to empower visually impaired users; automatically converts camera images into spoken descriptions with intutive voice command activation and prompting.

## Overview
Perception is a mobile application designed to assist visually impaired individuals in navigating their surroundings through an intuitive interface, on-device prompt transcription, and AI-powered image recognition. The app captures images through the device's camera and converts visual information into detailed audio descriptions in real-time. The intuitive voice command interface allows users to interact with the application completely hands-free and address specific objects within their environment, making it truly accessible for those with visual impairments.

## Features
**Core Feature - Real-Time Guidance**: Simply speak to the app directly as if it is a human and recieve near instant audio responses with spacial awareness.

**Spacial Awareness:**
- **Visual Awareness:** With every prompt, the application also captures and processes an image of your nearby surroundings.
- **Locational Awareness:** The application can access the user's location to address location-related prompts. 
- **Environmental Awareness:** The application can provides real-time weather information and forecasts to address weather-related prompts.
- **Time Awareness:** The application can provide information about the current time, date, and time zone when prompted.

**Common Use Cases:**
- **Text Recognition**: Extract and read text from images, documents, signs, and labels
- **Object Recognition**: Identify common objects, people, and environments with high accuracy
- **Scene Understanding**: Receive contextual descriptions of surroundings for better spatial awareness
- **Intuitive Audio Feedback**: Clear voice prompts guide users through the application
- **Customizable Settings**: Adjust recognition models, activation threshold angle, speech recognition timeout period, and compression settings.

## Tech Stack
#### Frontend
- **Frameworks:** React Native with [`Expo`](https://expo.dev)
- **Language:** TypeScript
- **Text-to-Speech:** [`expo-speech`](https://docs.expo.dev/versions/latest/sdk/speech/) 
#### Backend
- **Speech transcription:** [`SFSpeechRecognizer`](https://developer.apple.com/documentation/speech/sfspeechrecognizer) (iOS) and [`SpeechRecognizer`](https://developer.android.com/reference/android/speech/SpeechRecognizer) (Android) for local transcription
- **Image recognition:** Gemini Vision for its low latency and cost

## Get Started

1. Install dependencies:

   ```bash
   npm install
   ```

#### Android
2. Ensure the [Android SDK](https://developer.android.com/studio) is installed

3. Create a development build:

   ```bash
   npx expo prebuild --platform android
   ```
4. Create `android/local.properties` to point to Android SDK path:

   ```text
   sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
   ```
5. Compile into native Android code
##### Option 1: Development Testing with (Android Studio Emulator or Connected Android Device)
   ```bash
   npx expo run:android
   ```
- Reflects real-time code changes
- Automatically connects to local development server after app is started

##### Option 2: Development Build APK
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
- Located at `android/app/build/outputs/apk/debug/app-debug.apk`
- Once installed on testing device, open dev settings (by shaking the device), and change the build location to `YOUR_LOCAL_IP:8081`
- Used for distribution of a development build for initial testing

##### Option 3: Standalone APK
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
- Located at `android/app/build/outputs/apk/release/app-release.apk`
- Bundles all JavaScript into the APK
- Suitable for distribution to end users

##### Option 4: Standalone Distribution Bundle (AAB)
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
- Located at `android/app/build/outputs/bundle/release/app-release.aab`
- Bundles all JavaScript into the APK
- Suitable for distribution on the Play Store

#### iOS
2. Ensure [Xcode](https://developer.apple.com/xcode/) is installed (Mac only)

3. Create a development build:

   ```bash
   npx expo prebuild --platform ios
   ```

4. Install iOS dependencies:

   ```bash
   cd ios
   pod install
   cd ..
   ```

5. Compile and run on simulator or device:

   ```bash
   npx expo run:ios
   ```

##### To create a standalone iOS build:
   ```bash
   cd ios
   xcodebuild -workspace iSight.xcworkspace -scheme iSight -configuration Release -archivePath iSight.xcarchive archive
   ```

6. Start the app
   ```bash
   npx expo start
   ```

## Privacy and Security
Perception prioritizes user privacy. All image processing happens on-device when possible, and any data sent to cloud services is anonymized and not stored permanently.

## License
[MIT License](LICENSE)