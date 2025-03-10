// Importing modules
const { GoogleGenerativeAI } = require("@google/generative-ai");
import AsyncStorage from '@react-native-async-storage/async-storage';

export class GeminiService {
  private static instance: GeminiService | null = null;
  private gemini;
  private model;
  private apiKey: string = "notyetinitialized";
  private modelType: string = "gemini-2.0-flash";
  private username: string = "User";
  private isInitialized: boolean = false;

  // Function: Constructor
  private constructor() {
    this.gemini = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_API_KEY);
    this.model = this.gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
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
      this.model = this.gemini.getGenerativeModel({ model: this.modelType });
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
          alert('Please enter a valid API key in settings.');
          return false;
        }
        if (parsedSettings.geminiModel && parsedSettings.geminiModel.trim() !== '') {
          this.modelType = parsedSettings.geminiModel;
        }
        return true;
      }
      return false;
    } 
    catch (error) {
      console.error('Error getting settings:', error);
      alert('Error retrieving settings');
      return false;
    }
  }

  // Function: Convert image URI to base64 format
  public async uriToBase64(uri: string): Promise<object> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
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
      console.error('Error converting URI to base64:', error);
      throw error;
    }
  }

  // Function: Recieves a response to a user request with image context
  public async customRequest(imgBase64: object, userPrompt: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const prompt = `You are a computer vision model; your task is a act as a guide for the visually imparied. Your output is going to be turned into speech, please respond to ${this.username}'s prompt in a concise manner: ${userPrompt}`;
    const imageParts = imgBase64;
    
    try {
      const result = await this.model.generateContent([prompt, imageParts]);
      const responseText = result.response.text();
      console.log(responseText);
      return responseText;
    } 
    catch (error) {
      console.error('Error generating content:', error);
      return `Sorry ${this.username}, there was an error in processing that image. Please try again.`;
    }
  }
}