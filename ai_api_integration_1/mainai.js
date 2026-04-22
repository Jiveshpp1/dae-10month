console.log("Main AI script loaded");
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// 1. Initialize the API with your Firebase-generated key
const genAI = new GoogleGenerativeAI("secretkeyu");

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
console.log("Gemini Model Initialized"); // Add this line!



// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "secretkeyu",
  authDomain: "aistudy-c918e.firebaseapp.com",
  projectId: "aistudy-c918e",
  storageBucket: "aistudy-c918e.firebasestorage.app",
  messagingSenderId: "1092891072334",
  appId: "1:1092891072334:web:60d7251dbb869c6bfe701f"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export async function askGemini(prompt) {
  try {
    console.log("Sending to Gemini:", prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    
    console.error("Detailed API Error:", error);
    return "Error: " + error.message;
  }
}
async function openRouter() {
  try {
    console.log("Sending request to OpenRouter...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "key",
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "AI Study App"
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [
          { role: "user", content: "What is the meaning of life?" }
        ]
      })
    });

    console.log("Status:", response.status);

    const data = await response.json();
    console.log("FULL RESPONSE:", data);

    if (!data.choices) {
      console.error("No choices returned:", data);
      return;
    }

    console.log("AI:", data.choices[0].message.content);

  } catch (err) {
    console.error("Fetch failed:", err);
  }
}



//openRouter();

