import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY, SYSTEM_INSTRUCTION } from "../constants";

export const generateAIResponse = async (userPrompt: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return "I am currently offline (API Key missing). Please contact the administrator.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the knowledge base right now.";
  }
};