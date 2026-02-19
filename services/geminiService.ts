
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSystemInsight = async (scenario: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `As an expert Backend Engineer, explain the technical mechanism for the following movie booking scenario: "${scenario}". 
      Focus on Spring Boot concepts like @Transactional, Pessimistic Locking (SELECT FOR UPDATE), Deadlock prevention, and @Scheduled tasks for lock release. 
      Keep the explanation concise (max 3 sentences) and highly technical.`,
    });
    return response.text || "Insight unavailable.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The system is currently handling high-concurrency transactions. Ensure ACID compliance.";
  }
};
