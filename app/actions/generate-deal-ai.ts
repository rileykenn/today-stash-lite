'use server';

import OpenAI from 'openai';

// Define the shape of the generated deal
export type GeneratedDeal = {
    title: string;
    description: string;
    scheduleDays: string[]; // e.g. ["monday", "tuesday"]
    timeStrategy?: {
        start: string; // "open" | "close" | "HH:MM" (24h)
        end: string;   // "open" | "close" | "HH:MM" (24h)
    };
};

export async function generateDealSuggestions(businessDescription: string): Promise<GeneratedDeal[]> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    const openai = new OpenAI({
        apiKey: apiKey,
    });

    const prompt = `
    You are a marketing expert helping a local business create a promotional deal.
    
    The business description is: "${businessDescription}"
    
    Please generate 3 distinct deal ideas that would be attractive to customers.
    For each deal, provide:
    1. A catchy title (short, e.g., "50% Off Pizza").
    2. A brief description (1-2 sentences).
    3. An array of days this deal applies to, based on the description (e.g. if it says "Taco Tuesday", return ["tuesday"]). If no specific days are mentioned, return an empty array [].
    4. A time strategy if a time of day is mentioned (e.g. "mornings", "happy hour", "afternoon").
       - "Mornings" -> start: "open", end: "11:00"
       - "Afternoon" -> start: "13:00", end: "17:00" (or "close" if implied)
       - "Evening" / "Dinner" -> start: "17:00", end: "close"
       - Specific times -> Use 24h format "HH:MM"
    5. Handle day typos or abbreviations intelligently (e.g., "wensday" -> ["wednesday"], "tmrw" -> ignore/ask or map if context clear).
    6. If the user implies "Today", do NOT guess the day name. Return empty array [].

    Return ONLY a JSON array of objects. Do not include markdown code blocks.
    The JSON structure should be:
    [
      {
        "title": "...",
        "description": "...",
        "scheduleDays": ["monday", "wednesday"],
        "timeStrategy": { "start": "open", "end": "11:00" } // Optional
      }
    ]
  `;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // or gpt-3.5-turbo depending on availability/cost preference
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content?.trim();

        if (!content) {
            throw new Error('No content received from OpenAI');
        }

        // Robust JSON extraction
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
