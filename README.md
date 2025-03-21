# iSight
An assistive mobile app created to empower visually impaired users; automatically converts camera images into spoken descriptions with intutive voice command activation and prompting.

## Overview

## Features




## Tech Stack
#### Frontend
- **Frameworks:** React Native with [`Expo`](https://expo.dev)
- **Language:** TypeScript
- **Text-to-Speech:** [`expo-speech`](https://docs.expo.dev/versions/latest/sdk/speech/) 
#### Backend
- **Speech transcription:** [`SFSpeechRecognizer`](https://developer.apple.com/documentation/speech/sfspeechrecognizer) (iOS) and [`SpeechRecognizer`](https://developer.android.com/reference/android/speech/SpeechRecognizer) (Android) for local transcription
- **Image recognition:** Gemini 2.0 Flash Lite for its low latency



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
5. Complile into native Android code
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
- Used for distribuition of a development build for initial testing

##### Option 3: Standalone APK
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
- Located at `android/app/build/outputs/apk/release/app-release.apk`
- Bundles all JavaScript into the APK
- Suitable for distribuition to end users

##### Option 4: Standalone Distribuition Bundle (AAB)
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
- Located at `android/app/build/outputs/bundle/release/app-release.aab`
- Bundles all JavaScript into the APK
- Suitable for distribuition on the Play Store

6. Start the app
   ```bash
    npx expo start
   ```