import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractSection(text: string, startLabel: string, endLabel?: string) {
  const start = text.indexOf(startLabel);
  if (start === -1) return '';

  const from = start + startLabel.length;
  const to = endLabel ? text.indexOf(endLabel, from) : -1;

  if (to === -1) {
    return text.slice(from).trim();
  }

  return text.slice(from, to).trim();
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const prompt = `
You are a patient advocacy assistant for UK healthcare.

You are NOT a doctor.
Do NOT diagnose.
Do NOT suggest that the user has a specific condition.
Your job is to help the user communicate clearly and prepare for NHS/GP interaction.

The user may write in ANY language.
First, detect the user's language.
Then return the response in TWO LANGUAGES:
1. The user's original language
2. English

You must produce TWO VERSIONS in EACH language:

1. BOOKING VERSION
- short
- 1 to 2 sentences
- concise, direct, weighty
- suitable for requesting a GP appointment
- should help the user sound clear and serious without exaggeration

2. GP VERSION
- more detailed
- structured
- useful for speaking to the GP
- include red flags or important details to mention if relevant
- include useful questions to ask the GP

Use the information below:

Conversation:
${text}

Return exactly in this structure:

USER LANGUAGE: [name of language]

BOOKING VERSION:
...

GP VERSION:
Summary:
...
What to say to the GP:
...
Questions to ask:
- ...
- ...
- ...
Important to mention:
- ...
- ...
- ...

ENGLISH

BOOKING VERSION:
...

GP VERSION:
Summary:
...
What to say to the GP:
...
Questions to ask:
- ...
- ...
- ...
Important to mention:
- ...
- ...
- ...
`;

    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
    });

    const outputText = response.output_text || '';

    const userLanguageRaw = extractSection(
      outputText,
      'USER LANGUAGE:',
      'BOOKING VERSION:'
    )
      .replace(/\n/g, ' ')
      .trim();

    const firstBooking = extractSection(
      outputText,
      'BOOKING VERSION:',
      'GP VERSION:'
    );

    const firstGp = extractSection(outputText, 'GP VERSION:', 'ENGLISH');

    const englishPartStart = outputText.indexOf('ENGLISH');
    const englishPart =
      englishPartStart !== -1 ? outputText.slice(englishPartStart) : '';

    const englishBooking = extractSection(
      englishPart,
      'BOOKING VERSION:',
      'GP VERSION:'
    );

    const englishGp = extractSection(englishPart, 'GP VERSION:');

    return NextResponse.json({
      userLanguage: userLanguageRaw || 'User language',
      userLanguageBooking: firstBooking || '',
      userLanguageGp: firstGp || '',
      englishBooking: englishBooking || '',
      englishGp: englishGp || '',
      raw: outputText || 'No response generated.',
    });
  } catch (error) {
    console.error('OPENAI ERROR:', error);

    return NextResponse.json(
      {
        userLanguage: '',
        userLanguageBooking: '',
        userLanguageGp: '',
        englishBooking: '',
        englishGp: '',
        raw: 'Error generating response.',
      },
      { status: 500 }
    );
  }
}