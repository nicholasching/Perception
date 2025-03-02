const { GoogleGenerativeAI } = require("@google/generative-ai");
const gemini = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_API_KEY);
const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

export async function geminiTest(): Promise<string> {
    let promise = new Promise<string>(async function(resolve) {
        const prompt = "Choose a random number between 1 and 1000";

        const result = await model.generateContent(prompt);

        resolve(result.response.text());
    })
    
    return promise;
}

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

                // Implement later using and returing data within: https://ai.google.dev/gemini-api/docs/vision?lang=node#local-images
                // MimeType contained within a portion of base64String.split(',')[0]
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error converting URI to base64:', error);
        throw error;
    }
}

export async function imgToText(imgBase64: object): Promise<string> {
    let promise = new Promise<string>(async function(resolve) {
        const prompt = "You are a computer vision model; your task is a act as a guide for the visually imparied. Your output is going to be turned into speech, please provide a concise, one sentence description of the image that addresses Kimberly by telling her what is in front of her.";
        const imageParts = imgBase64;
        console.log("Attempting to generate content");
        const result = await model.generateContent([prompt, imageParts]);
        console.log(result.response.text());
        resolve(result.response.text());
    })
    
    return promise;
}