const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function geminiTest(): Promise<string> {
    let promise = new Promise<string>(async function(resolve) {
        const prompt = "Say Hi!";

        const result = await model.generateContent(prompt);

        resolve(result.response.text());
    })
    
    return promise;
}

