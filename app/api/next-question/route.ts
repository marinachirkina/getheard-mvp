import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const prompt = `
You are a structured medical intake assistant (NOT a doctor).

Your job:
- Read the conversation
- Identify what is already known
- Ask ONLY ONE best next question
- NEVER ask for something already clearly stated

We care about collecting:
1. Problem (what is happening)
2. Duration (how long)
3. Impact or concern (how it affects or worries the user)

Rules:
- If duration is already mentioned (e.g. "3 days", "since yesterday") → DO NOT ask duration
- If impact or concern is already described → DO NOT ask it again
- Ask only ONE question
- Keep it natural, short, human
- If enough info is available → return READY

Conversation:
${text}

Return ONLY JSON:

If more info needed:
{
  "ready": false,
  "question": "your question"
}

If enough info:
{
  "ready": true
}
`;

    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
    });

    const raw = response.output_text || '';

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({
        ready: false,
        question: 'Could you tell me a bit more about your situation?',
      });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      ready: false,
      question: 'Could you tell me a bit more?',
    });
  }
}