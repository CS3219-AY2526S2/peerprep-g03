import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const getAiExplanation = async (req, res) => {
  console.log("--- New AI Request Started ---");
  
  // 1. Initialize inside the function
  const googleProvider = google('models/gemini-2.5-flash', {
    apiKey: process.env.GEMINI_AI_API_KEY, 
  });

  try {
    const { prompt, body } = req.body;
    const context = body?.context || 'general';

    console.log(`DEBUG: Using API Key (start): ${process.env.GEMINI_AI_API_KEY?.substring(0, 7)}`);

    const result = await streamText({
      model: googleProvider, // Using the locally created provider
      system: `You are a supportive PeerPrep CS Tutor. 
      The user has highlighted a specific part of a ${context}.
      
      Your goal is to act as a mentor:
      - Do NOT explain the exact code or text.
      - DO explain the underlying CONCEPT (e.g., if they highlight a loop, explain iteration).
      - Provide a unique, separate code example that demonstrates the same idea.
      - End with a question that prompts the student to look closer at their own work.`,
      
      // Use the 'prompt' directly as the subject
      prompt: prompt,
      onError: ({ error }) => {
        console.error("SDK STREAM ERROR DETAILS:", error);
      }
    });

    result.pipeDataStreamToResponse(res, {
        getErrorMessage: (error) => {
            return error instanceof Error ? error.message : String(error);
        }
    });

  } catch (error) {
    console.error("CONTROLLER FATAL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};