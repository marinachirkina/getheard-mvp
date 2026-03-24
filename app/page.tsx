'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type OutputData = {
  userLanguage: string;
  userLanguageBooking: string;
  userLanguageGp: string;
  englishBooking: string;
  englishGp: string;
  raw?: string;
};

type ViewMode = 'chat' | 'ready' | 'summary';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ResultCard({
  title,
  subtitle,
  text,
}: {
  title: string;
  subtitle?: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        <CopyButton text={text} />
      </div>

      <div className="whitespace-pre-wrap text-slate-100 leading-7">{text}</div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ViewMode>('chat');
  const [output, setOutput] = useState<OutputData | null>(null);

  async function handleSend() {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const combined = newMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const res = await fetch('/api/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combined }),
      });

      const data = await res.json();

      if (data.ready) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content:
              'I have enough information. You can generate your summary now.',
          },
        ]);
        setMode('ready');
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: data.question,
          },
        ]);
        setMode('chat');
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Could you tell me a bit more?',
        },
      ]);
      setMode('chat');
    } finally {
      setLoading(false);
    }
  }

  async function generateSummary() {
    setLoading(true);

    try {
      const cleanedMessages =
        messages[messages.length - 1]?.role === 'assistant' &&
        messages[messages.length - 1]?.content.includes(
          'I have enough information. You can generate your summary now.'
        )
          ? messages.slice(0, -1)
          : messages;

      const combined = cleanedMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combined }),
      });

      const data = await res.json();

      setMessages(cleanedMessages);
      setOutput({
        userLanguage: data.userLanguage,
        userLanguageBooking: data.userLanguageBooking,
        userLanguageGp: data.userLanguageGp,
        englishBooking: data.englishBooking,
        englishGp: data.englishGp,
        raw: data.raw,
      });
      setMode('summary');
    } catch {
      setOutput({
        userLanguage: 'Error',
        userLanguageBooking: '',
        userLanguageGp: '',
        englishBooking: '',
        englishGp: '',
        raw: 'Something went wrong.',
      });
      setMode('summary');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([]);
    setInput('');
    setLoading(false);
    setMode('chat');
    setOutput(null);
  }

  const isEnglish =
    output?.userLanguage?.trim().toLowerCase().includes('english') ?? false;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-3 text-3xl font-bold">GetHeard</h1>

        <p className="mb-6 max-w-3xl text-slate-300">
          Describe your problem in your own language. We’ll ask a few smart
          follow-up questions, then prepare a short booking version and a more
          detailed GP version in your language and in English.
        </p>

        {messages.length > 0 && (
          <div className="mb-6 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-2xl p-4 text-[18px] leading-8 ${
                  m.role === 'user'
                    ? 'bg-amber-400 text-black'
                    : 'bg-slate-800 text-white'
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="mb-6 rounded-xl bg-slate-800 p-4 text-slate-300">
            {mode === 'ready'
              ? 'Preparing your summary...'
              : 'Thinking about the best next question...'}
          </div>
        )}

        {mode === 'ready' && !loading && (
          <div className="mb-6 flex gap-3">
            <button
              onClick={generateSummary}
              className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black"
            >
              Generate summary
            </button>

            <button
              onClick={handleReset}
              className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white"
            >
              Start again
            </button>
          </div>
        )}

        {mode === 'summary' && output && (
          <div className="space-y-6">
            {output.userLanguageBooking ||
            output.userLanguageGp ||
            output.englishBooking ||
            output.englishGp ? (
              <div className="grid gap-6 md:grid-cols-2">
                <ResultCard
                  title="Booking version"
                  subtitle={isEnglish ? 'English' : output.userLanguage}
                  text={output.userLanguageBooking || 'No content.'}
                />
                <ResultCard
                  title="GP version"
                  subtitle={isEnglish ? 'English' : output.userLanguage}
                  text={output.userLanguageGp || 'No content.'}
                />

                {!isEnglish && (
                  <>
                    <ResultCard
                      title="Booking version"
                      subtitle="English"
                      text={output.englishBooking || 'No content.'}
                    />
                    <ResultCard
                      title="GP version"
                      subtitle="English"
                      text={output.englishGp || 'No content.'}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap rounded-2xl border border-slate-700 bg-slate-900 p-5">
                {output.raw || 'Something went wrong.'}
              </div>
            )}

            <button
              onClick={handleReset}
              className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black"
            >
              Start again
            </button>
          </div>
        )}

        {mode === 'chat' && !loading && (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your situation..."
              className="flex-1 rounded-xl bg-slate-800 p-4 text-white placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              className="rounded-xl bg-amber-400 px-5 font-semibold text-black"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </main>
  );
}