// Importing modules and configuring Gemini API
const { GoogleGenerativeAI } = require("@google/generative-ai");
import AsyncStorage from '@react-native-async-storage/async-storage';
const gemini = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_API_KEY);
const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

// Function: Returns the username from storage
async function getUsername(): Promise<string> {
  try {
    const savedSettings = await AsyncStorage.getItem('userSettings');
    if (savedSettings !== null) {
      const parsedSettings = JSON.parse(savedSettings);
      if (parsedSettings.username && parsedSettings.username.trim() !== '') {
        return parsedSettings.username;
      }
    }

    // Fallback if no username is found
    return "User";
  } catch (error) {
    console.error('Error getting username:', error);
    return "User";
  }
}

// Function: Converts an image (pointed to via URI) to Base64 String
export async function uriToBase64(uri: string): Promise<object> {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result as string;
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                resolve({inlineData:{
                    data: base64String.split(',')[1],
                    mimeType: base64String.split(',')[0].substring(5, base64String.split(',')[0].length - 7)
                }})
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error converting URI to base64:', error);
        throw error;
    }
}

// Function: Recieves an text description of the image
export async function imgToText(imgBase64: object, mode: Number): Promise<string> {
    let promise = new Promise<string>(async function(resolve) {
        
        const username = await getUsername();
        let prompt = "";

        if(mode == 0){
            console.log("Mode 0: General Image Description");
            prompt = `You are a computer vision model; your task is a act as a guide for the visually imparied. Your output is going to be turned into speech, please provide a concise, one sentence description of the image that addresses ${username} by telling her what is in front of her.`;
        }
        else if(mode == 1){
            console.log("Mode 1: Reading out small or far away text");
            prompt = `You are a computer vision model; your task is a act as a guide for the visually imparied. ${username} struggles with seeing small, far away text. Your output is going to be turned into speech, please provide a concise, one sentence description of the image that addresses ${username} by only reading out small or far away text that may appear in the image.`;
        }
        
        const imageParts = imgBase64;
        console.log("Attempting to generate content");
        const result = await model.generateContent([prompt, imageParts]);
        console.log(result.response.text());
        resolve(result.response.text());
    })
    
    return promise;
}

// Function: Recieves a response to a user request with image context
export async function customRequest(imgBase64: object, userPrompt: string): Promise<string> {
    let promise = new Promise<string>(async function(resolve) {

        const username = await getUsername();
        const prompt = `You are a computer vision model; your task is a act as a guide for the visually imparied. Your output is going to be turned into speech, please respond to ${username}'s prompt in a concise manner: ${userPrompt}`;
        const imageParts = imgBase64;
        const result = await model.generateContent([prompt, imageParts]);
        console.log(result.response.text());
        resolve(result.response.text());
    
    })
    
    return promise;
}