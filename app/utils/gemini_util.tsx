// Importing modules
const { GoogleGenerativeAI } = require("@google/generative-ai");
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location'
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

export class GeminiService {
  private static instance: GeminiService | null = null;
  private gemini;
  private model;
  private apiKey: string = "notyetinitialized";
  private modelType: string = "gemini-2.0-flash";
  private compressionQuality: number = 0.7;
  private username: string = "User";
  private isInitialized: boolean = false;

  // Function: Constructor
  private constructor() {
    this.gemini = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_API_KEY);
    this.model = this.gemini.getGenerativeModel({ model: "gemini-2.0-flash", temperature: 1, topP: 0.8, topK: 40 });
  }

  // Function: Retrieves an instance of the GeminiService class
  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  // Function: Initialize model with settings from storage
  public async initialize(): Promise<boolean> {
    if (this.isInitialized){
      return true;
    } 
    
    this.isInitialized = await this.getSettings();

    if (!this.isInitialized) {
      console.error("Gemini failed to initialize");
      return false;
    }
    else {
      this.gemini = new GoogleGenerativeAI(this.apiKey);
      this.model = this.gemini.getGenerativeModel({ model: this.modelType, temperature: 1, topP: 0.8, topK: 40  });
      
      // Testing and warming up the model
      let result = await this.model.generateContent(["Good morning! How are you doing?"]);
      console.log(result.response.text());
      return true;
    }
  }

  // Function: Disables the model for use
  public async terminate(): Promise<void> {
    this.isInitialized = false;
  }

  // Function: Retrieve settings from storage
  private async getSettings(): Promise<boolean> {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings !== null) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.username && parsedSettings.username.trim() !== '') {
          this.username = parsedSettings.username;
        }
        if (parsedSettings.geminiApiKey && parsedSettings.geminiApiKey.trim() !== '') {
          this.apiKey = parsedSettings.geminiApiKey;
        }
        else {
          alert("Please enter a valid API key in settings.");
          return false;
        }
        if (parsedSettings.geminiModel && parsedSettings.geminiModel.trim() !== '') {
          this.modelType = parsedSettings.geminiModel;
        }
        if (parsedSettings.compressionQuality !== undefined) {
          this.compressionQuality = parsedSettings.compressionQuality / 100;
        }
        return true;
      }
      alert("Please enter a valid API key in settings.");
      return false;
    } 
    catch (error) {
      console.error("Error getting settings:", error);
      alert("Error retrieving settings");
      return false;
    }
  }

  // Function: Convert image URI to base64 format with compression
  public async uriToBase64(uri: string): Promise<object> {
    try {
      // Image compression to reduce latency
      const compressedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: Math.round(1536 * this.compressionQuality) } }],
        { compress: 0.5 + this.compressionQuality * 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );
            
      const response = await fetch(compressedImage.uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          resolve({
            inlineData: {
              data: base64String.split(',')[1],
              mimeType: base64String.split(',')[0].substring(5, base64String.split(',')[0].length - 7)
            }
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } 
    catch (error) {
      console.error("Error compressing and converting URI to base64:", error);
      throw error;
    }
  }

  // Function: Recieves a response to a user request with image context
  public async customRequest(imgBase64: object, userPrompt: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const contextString = await this.addContext(userPrompt);
    const prompt = `You are a computer vision model; your task is a act as a guide for the visually imparied. ${contextString}. Your output is going to be turned into speech, please respond to ${this.username}'s prompt in a concise manner: ${userPrompt}`;
    const imageParts = imgBase64;
    
    try {
      const result = await this.model.generateContent([prompt, imageParts]);
      const responseText = result.response.text();
      console.log(responseText);
      return responseText;
    } 
    catch (error) {
      console.error("Error generating content:", error);
      return `Sorry ${this.username}, there was an error in processing that image. Please try again.`;
    }
  }

  // Function: Adds context to a user's request
  private async addContext(userPrompt: string): Promise<string> {

    userPrompt = userPrompt.toLowerCase();
    let contextString = "Here is some additional context about the user's current surroundings: ";

    if (userPrompt.includes("time") || userPrompt.includes("date") || userPrompt.includes("today") || userPrompt.includes("tomorrow")) {
      contextString += "Time: " + Date().toString();
    }

    if (userPrompt.includes("weather") || userPrompt.includes("temperature") || userPrompt.includes("outside") || userPrompt.includes("rain") || userPrompt.includes("snow") || userPrompt.includes("do i need") || userPrompt.includes("is it going to")) {
      contextString += "Weather: " + await this.getWeather();
    }

    if (userPrompt.includes("location") || userPrompt.includes("where") || userPrompt.includes("get to") || userPrompt.includes("at")) {
      contextString += "Location: " + await this.getLocation();
    }

    console.log(contextString);

    return contextString;
  }

  private async getLastLocation(): Promise<string> {
    try {
      const {status} = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return '';
      }

      const lastLocation = await Location.getLastKnownPositionAsync({});
      if (lastLocation) {
        return `${lastLocation.coords.latitude},${lastLocation.coords.longitude}`;
      }
      return await this.getLocation();
    } 
    catch (error) {
      console.error('Error getting last location:', error);
      return '';
    }

  }

  private async getLocation(): Promise<string> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return '';
      }
  
      const location = await Location.getCurrentPositionAsync({});
      return `${location.coords.latitude},${location.coords.longitude}`;
    } catch (error) {
      console.error('Error getting current location:', error);
      return '';
    }
  }

  private async getWeather(): Promise<string> {
    const location = await this.getLastLocation();

    if(!location) {
      return ''
    }
    
    const url = `http://api.weatherapi.com/v1/forecast.json?key=6323f6e1107c48e5957210846230705&q=${location}&days=3`;

    const response = await fetch(url);

    if(response.ok) {
      let data = await response.json();
      return JSON.stringify(data);
    }
    return "";
  }
}
