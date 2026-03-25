'use client';

import { useEffect, useMemo, useState } from 'react';

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
type UiLang = 'en' | 'ru';

const copy = {
  en: {
    title: 'GetHeard',
    subtitle:
      'Built for NHS care in the UK. Describe the health issue in your own language. We will help prepare a short message to request help and a more detailed version for the appointment, in your language and in English.',
    inputPlaceholder: 'Describe your situation...',
    send: 'Send',
    thinkingQuestion: 'Thinking about the best next question...',
    thinkingSummary: 'Preparing your summary...',
    generate: 'Generate summary',
    restart: 'Start again',
    shortTitle: 'Short message to request help',
    detailedTitle: 'Detailed version for your appointment',
    english: 'English',
    yourLanguage: 'Your language',
    resultsIntro:
      'The first cards are for your own understanding and to help you speak clearly. The English version is there in case you need to show or send it.',
  },
  ru: {
    title: 'GetHeard',
    subtitle:
      'Создано для NHS в Великобритании. Опишите проблему со здоровьем на своём языке. Мы поможем подготовить короткий текст для записи/обращения и более подробную версию для приёма — на вашем языке и на английском.',
    inputPlaceholder: 'Опишите вашу ситуацию...',
    send: 'Отправить',
    thinkingQuestion: 'Подбираю следующий уточняющий вопрос...',
    thinkingSummary: 'Готовлю summary...',
    generate: 'Сформировать summary',
    restart: 'Начать заново',
    shortTitle: 'Короткий текст для обращения',
    detailedTitle: 'Подробная версия для приёма',
    english: 'Английский',
    yourLanguage: 'Ваш язык',
    resultsIntro:
      'Первые карточки — на вашем языке, чтобы вам было проще понять и использовать текст. Английская версия нужна, если вы хотите показать или отправить её дальше.',
  },
};

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
  const [uiLang, setUiLang] = useState<UiLang>('en');

  useEffect(() => {
    const lang = navigator.language?.toLowerCase() || 'en';
    if (lang.startsWith('ru')) {
      setUiLang('ru');
    } else {
      setUiLang('en');
    }
  }, []);

  const t = copy[uiLang];

  async function handleSend() {
    if (!input.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: input },
    ];

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
            role: 'assistant' as const,
            content:
              uiLang === 'ru'
                ? 'Информации уже достаточно. Можно сформировать summary.'
                : 'I have enough information. You can generate your summary now.',
          },
        ]);
        setMode('ready');
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant' as const,
            content: data.question,
          },
        ]);
        setMode('chat');
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant' as const,
          content:
            uiLang === 'ru'
              ? 'Можете рассказать чуть подробнее?'
              : 'Could you tell me a bit more?',
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
        messages[messages.length - 1]?.content.toLowerCase().includes('generate')
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

  const resultIntro = useMemo(() => {
    if (isEnglish) {
      return uiLang === 'ru'
        ? 'Ниже — готовые тексты на английском для обращения и для приёма.'
        : 'Below are ready-to-use English versions for requesting help and for the appointment.';
    }
    return t.resultsIntro;
  }, [isEnglish, t, uiLang]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-3 text-3xl font-bold">{t.title}</h1>

        <p className="mb-6 max-w-3xl text-slate-300">{t.subtitle}</p>

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
            {mode === 'ready' ? t.thinkingSummary : t.thinkingQuestion}
          </div>
        )}

        {mode === 'ready' && !loading && (
          <div className="mb-6 flex gap-3">
            <button
              onClick={generateSummary}
              className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black"
            >
              {t.generate}
            </button>

            <button
              onClick={handleReset}
              className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white"
            >
              {t.restart}
            </button>
          </div>
        )}

        {mode === 'summary' && output && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-300">
              {resultIntro}
            </div>

            {output.userLanguageBooking ||
            output.userLanguageGp ||
            output.englishBooking ||
            output.englishGp ? (
              <div className="grid gap-6 md:grid-cols-2">
                <ResultCard
                  title={t.shortTitle}
                  subtitle={isEnglish ? t.english : output.userLanguage || t.yourLanguage}
                  text={output.userLanguageBooking || 'No content.'}
                />
                <ResultCard
                  title={t.detailedTitle}
                  subtitle={isEnglish ? t.english : output.userLanguage || t.yourLanguage}
                  text={output.userLanguageGp || 'No content.'}
                />

                {!isEnglish && (
                  <>
                    <ResultCard
                      title={t.shortTitle}
                      subtitle={t.english}
                      text={output.englishBooking || 'No content.'}
                    />
                    <ResultCard
                      title={t.detailedTitle}
                      subtitle={t.english}
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
              {t.restart}
            </button>
          </div>
        )}

        {mode === 'chat' && !loading && (
          <div className="flex gap-2">
            <textarea
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t.inputPlaceholder}
              className="min-h-[72px] flex-1 rounded-xl bg-slate-800 p-4 text-white placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              className="rounded-xl bg-amber-400 px-5 font-semibold text-black"
            >
              {t.send}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}