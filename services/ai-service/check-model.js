import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function list() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  
  console.log("--- Available Models ---");
  data.models?.forEach(m => {
    if (m.supportedGenerationMethods.includes("generateContent")) {
      console.log(`${m.name} (Supports Generation)`);
    }
  });
}

list();