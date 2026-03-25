import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const prompt = `
You are a structured health intake assistant for NHS-related preparation in the UK.

You are NOT a doctor.
Do NOT diagnose.
Do NOT suggest diseases.
Do NOT give treatment advice.

Your job:
- read the conversation
- identify what is already known
- ask ONLY ONE best next question
- ask in the SAME LANGUAGE as the user
- NEVER ask for something already clearly stated

We want to collect enough context for a useful GP/help-request summary:
1. Who is this about? (adult / child)
2. Child age, if relevant
3. What the problem is
4. How long it has been happening
5. What worries the person most / how it affects them

Rules:
- If it is unclear whether this is about the user or a child, ask that first
- If it is about a child and age is missing, ask age
- If duration is already clearly stated, do NOT ask duration again
- If concern/impact is already clear, do NOT ask it again
- Keep the question natural, short, supportive
- If there is enough information, return READY
- If the user input is clearly not about health, return NON_HEALTH

Conversation:
${text}

Return ONLY valid JSON.

If more info is needed:
{
  "ready": false,
  "question": "..."
}

If enough info is available:
{
  "ready": true
}

If this is not a health-related query:
{
  "ready": false,
  "question": "This tool is for health concerns and preparing for NHS care. Please describe a health symptom or concern.",
  "non_health": true
}
`;

    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
    });

    const raw = response.output_text || '';

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        ready: false,
        question: 'Could you tell me a bit more about the health concern?',
      });
    }
  } catch (error) {
    console.error('OPENAI ERROR:', error);

    return NextResponse.json({
      ready: false,
      question: 'Could you tell me a bit more about the health concern?',
    });
  }
}