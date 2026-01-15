'use server';

import OpenAI from 'openai';

// Define the shape of the generated deal
export type GeneratedDeal = {
    title: string;
    description: string;
    terms: string;
    originalPrice: number;
    newPrice: number;
    savings: number; // calculated as original - new
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
    3. Terms and conditions (short, e.g., "Dine-in only, one per person").
    4. An estimated original price (number).
    5. An estimated new price (number).

    Return ONLY a JSON array of objects. Do not include markdown code blocks.
    The JSON structure should be:
    [
      {
        "title": "...",
        "description": "...",
        "terms": "...",
        "originalPrice": 20,
        "newPrice": 10
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

        // Clean up if the model wraps it in markdown code blocks
        const cleanContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        const deals = JSON.parse(cleanContent);

        // Add calculated savings and validate
        return deals.map((d: any) => ({
            ...d,
            savings: d.originalPrice - d.newPrice
        }));

    } catch (error) {
        console.error('Error generating deals:', error);
        throw new Error('Failed to generate deal suggestions. Please try again.');
    }
}
