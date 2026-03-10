'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export type GeneratedDeal = {
  title: string;
  description: string;
  scheduleDays: string[];
  timeStrategy?: {
    start: string;
    end: string;
  };
};

export async function generateDealSuggestions(businessDescription: string): Promise<GeneratedDeal[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
    You are a marketing expert helping a local business create a promotional deal.
    
    The business description is: "${businessDescription}"
    
    Please generate 3 distinct deal ideas that would be attractive to customers.
    For each deal, provide:
    1. A catchy title (short, e.g., "50% Off Pizza").
    2. A brief description (1 to 2 sentences).
    3. An array of days this deal applies to, based on the description (e.g. if it says "Taco Tuesday", return ["tuesday"]). If no specific days are mentioned, return an empty array [].
    4. A time strategy if a time of day is mentioned (e.g. "mornings", "happy hour", "afternoon").
       - "Mornings" -> start: "open", end: "11:00"
       - "Afternoon" -> start: "13:00", end: "17:00"
       - "Evening" / "Dinner" -> start: "17:00", end: "close"
       - Specific times -> Use 24h format "HH:MM"

    Return ONLY a JSON array of objects. Do not include markdown code blocks.
    The JSON structure should be:
    [
      {
        "title": "...",
        "description": "...",
        "scheduleDays": ["monday", "wednesday"],
        "timeStrategy": { "start": "open", "end": "11:00" }
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    const jsonStart = content.indexOf('[');
    const jsonEnd = content.lastIndexOf(']');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Failed to parse AI response: No JSON array found.");
    }

    const jsonString = content.substring(jsonStart, jsonEnd + 1);
    const deals = JSON.parse(jsonString);

    return deals;
  } catch (error) {
    console.error('Error generating deals:', error);
    throw new Error('Failed to generate deal suggestions. Please try again.');
  }
}
