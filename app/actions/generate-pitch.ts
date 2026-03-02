'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export type PitchInput = {
  businessName: string;
  businessType: string;
  whatTheySell: string;
  area: string;
  dealIdeas: string;
  contactName: string;
};

export type PitchContent = {
  heroTagline: string;
  heroSubtitle: string;
  nearbyTowns: string[];
  businessBenefits: {
    title: string;
    description: string;
  }[];
  suggestedDeals: {
    title: string;
    description: string;
    originalPrice: number;
    dealPrice: number;
  }[];
  talkingPoints: string[];
  areaInsight: string;
  personalizedPitch: string;
  dashboardStats: {
    totalRedemptions: number;
    uniqueCustomers: number;
    estimatedRevenue: number;
  };
  dummyDeals: {
    title: string;
    description: string;
    originalPriceCents: number;
    priceCents: number;
    savingsCents: number;
    totalLimit: number;
    redeemedCount: number;
  }[];
};

export async function generatePitchContent(input: PitchInput): Promise<PitchContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a pitch deck content generator for "Today's Stash", a local deals and promotions platform in Australia. Generate pitch deck content for a sales meeting.

BUSINESS DETAILS:
- Name: "${input.businessName}"
- Type: "${input.businessType}"
- What they sell: "${input.whatTheySell || 'Not specified'}"
- Location/Area: "${input.area}"
- Contact: "${input.contactName || 'Business Owner'}"
- Sales notes/deal ideas: "${input.dealIdeas || 'No specific notes'}"

Generate the following JSON (return ONLY valid JSON, no markdown):
{
  "heroTagline": "A short compelling tagline for the pitch deck cover (8-12 words)",
  "heroSubtitle": "A brief subtitle about how Today's Stash can help this specific business (15-25 words)",
  "nearbyTowns": ["List of 3-5 real towns/suburbs near the business area"],
  "businessBenefits": [
    {
      "title": "Short benefit title (3-5 words)",
      "description": "How Today's Stash specifically helps this type of business (20-35 words)"
    }
  ],
  "suggestedDeals": [
    {
      "title": "Catchy deal title like '2-for-1 Tuesday Pizza'",
      "description": "Brief deal description (10-20 words)",
      "originalPrice": 25,
      "dealPrice": 15
    }
  ],
  "talkingPoints": ["5-7 key points the salesperson should mention during the call, specific to this business"],
  "areaInsight": "A paragraph about the local area and how Today's Stash connects residents from nearby towns to local businesses (40-60 words)",
  "personalizedPitch": "A compelling 2-3 paragraph sales pitch written as if speaking directly to the business owner, explaining why Today's Stash is perfect for their specific business. Reference their area, type, and any deal ideas mentioned. (80-120 words)",
  "dashboardStats": {
    "totalRedemptions": 47,
    "uniqueCustomers": 32,
    "estimatedRevenue": 1250
  },
  "dummyDeals": [
    {
      "title": "Deal title relevant to this business",
      "description": "Deal description",
      "originalPriceCents": 2500,
      "priceCents": 1500,
      "savingsCents": 1000,
      "totalLimit": 10,
      "redeemedCount": 6
    }
  ]
}

IMPORTANT RULES:
- Generate 4 businessBenefits
- Generate 3 suggestedDeals with realistic prices for this business type
- Generate 3 dummyDeals for the merchant dashboard demo (these simulate what their dashboard would look like)
- dashboardStats should look realistic for a first month (not too high, not too low)
- All monetary values in dummyDeals are in CENTS (Australian dollars * 100)
- nearbyTowns must be REAL Australian towns/suburbs near "${input.area}"
- Tailor everything to "${input.businessType}" and the specific area
- Be enthusiastic but professional — this is read aloud during a Zoom call
- Keep language conversational and Australian`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('AI response did not contain valid JSON');
    }

    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const content = JSON.parse(jsonString) as PitchContent;

    return content;
  } catch (error) {
    console.error('Gemini generation error:', error);
    throw new Error('Failed to generate pitch content. Please try again.');
  }
}
