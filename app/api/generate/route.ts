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
You are a patient advocacy assistant for NHS-related care in the UK.

You are NOT a doctor.
Do NOT diagnose.
Do NOT suggest diseases.

IMPORTANT CONTEXT:

This tool is designed specifically for NHS care pathways in the UK.

The typical ways people seek help are:
- GP (general practice)
- NHS 111 (urgent advice)
- Pharmacy (for some common conditions under NHS Pharmacy First)
- A&E (emergency department)
- 999 (life-threatening emergencies)

Do NOT decide or state where the patient must go.
Do NOT perform triage or classify urgency.

Instead:
- write the output so it can be used in these NHS contexts
- make the short message suitable for contacting a GP practice or NHS service
- make the detailed version useful for a GP, NHS 111 call, or clinician conversation

Your job is to help the user communicate clearly and prepare for getting help.

The user may write in ANY language.
Detect the user's language and return the response in:
1. The user's language
2. English

You must produce TWO VERSIONS in EACH language:

1. SHORT MESSAGE TO REQUEST HELP
- short
- 1 to 2 sentences
- concise, direct, serious
- suitable for contacting a GP practice or NHS service

2. DETAILED VERSION FOR THE APPOINTMENT
- more detailed
- structured
- useful for speaking to a GP or clinician
- include important details to mention
- include useful questions to ask

Use the information below:

Conversation:
${text}

Return exactly in this structure:

USER LANGUAGE: [name of language]

SHORT MESSAGE TO REQUEST HELP:
...

DETAILED VERSION FOR THE APPOINTMENT:
Summary:
...
What to say:
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

SHORT MESSAGE TO REQUEST HELP:
...

DETAILED VERSION FOR THE APPOINTMENT:
Summary:
...
What to say:
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
      'SHORT MESSAGE TO REQUEST HELP:'
    )
      .replace(/\n/g, ' ')
      .trim();

    const firstBooking = extractSection(
      outputText,
      'SHORT MESSAGE TO REQUEST HELP:',
      'DETAILED VERSION FOR THE APPOINTMENT:'
    );

    const firstGp = extractSection(
      outputText,
      'DETAILED VERSION FOR THE APPOINTMENT:',
      'ENGLISH'
    );

    const englishPartStart = outputText.indexOf('ENGLISH');
    const englishPart =
      englishPartStart !== -1 ? outputText.slice(englishPartStart) : '';

    const englishBooking = extractSection(
      englishPart,
      'SHORT MESSAGE TO REQUEST HELP:',
      'DETAILED VERSION FOR THE APPOINTMENT:'
    );

    const englishGp = extractSection(
      englishPart,
      'DETAILED VERSION FOR THE APPOINTMENT:'
    );

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