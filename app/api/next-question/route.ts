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
    - identify whether this is actually a health-related issue
    - if it is health-related or still unclear, ask ONLY ONE best next question
    - ask in the SAME LANGUAGE as the user
    - NEVER ask for something already clearly stated

    We want to collect enough context for a useful NHS/GP summary:
    1. Who is this about? (adult / child)
    2. Child age, if relevant
    3. What the health problem is
    4. How long it has been happening
    5. What worries the person most / how it affects them

    IMPORTANT RULES:
    - If it is CLEARLY not about health, symptoms, illness, injury, pain, bodily changes, mental health, behaviour change, or another medical concern, return NON_HEALTH
    - But if it is still UNCLEAR whether there is a real health concern, ask ONE clarifying question and keep the conversation open
    - Distress alone does NOT automatically mean a health problem
    - Losing an item, school issues, admin issues, transport issues, or family logistics are usually NON_HEALTH
    - If it is unclear whether this is about the user or a child, ask that first
    - If it is about a child and age is missing, ask age
    - If duration is already clearly stated, do NOT ask duration again
    - If concern/impact is already clear, do NOT ask it again
    - Keep the question natural, short, supportive
    - If enough HEALTH-RELATED information is available, return READY
    - Do NOT return non_health: true together with a question that expects the user to continue the conversation
    - If you return non_health: true, the "question" field must contain a short FINAL message, not a question
    - That final message should explain that the tool is for health concerns and NHS-related care, and invite the user to restart only if they want to describe a health symptom or medical concern

    Conversation:
    ${text}

    Return ONLY valid JSON.

    If more information is needed:
    {
    "ready": false,
    "question": "..."
    }

    If enough health-related information is available:
    {
    "ready": true
    }

    If this is clearly NOT a health-related issue:
    {
    "ready": false,
    "non_health": true,
    "question": "..."
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