const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function geminiTest(): Promise<string> {
    let promise = new Promise<string>(async function(resolve) {
        const prompt = "Choose a random number between 1 and 1000";

        const result = await model.generateContent(prompt);

        resolve(result.response.text());
    })
    
    return promise;
}

