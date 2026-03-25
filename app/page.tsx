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
    generate: 'Generate summary',
    restart: 'Start again',
    shortTitle: 'Short message to request help',
    detailedTitle: 'Detailed version for your appointment',
    english: 'English',
    yourLanguage: 'Your language',
    showYourLanguage: 'Show version in your language',
    hideYourLanguage: 'Hide version in your language',
    nextStepsTitle: 'Where to go next',
    nextStepsUrgentNote:
      'If symptoms get worse or become urgent, consider A&E or calling 999.',
    gpDesc: 'Book an appointment for ongoing or non-urgent issues',
    pharmacyDesc:
      'You may be able to get help quickly without an appointment',
    nhs111Desc: 'Get advice if you are unsure what to do',
    heroHelpText:
      'This is the main text you can copy and use to contact a service.',
    copyMessage: 'Copy message',
    copiedReady: 'Copied — ready to send',
  },
  ru: {
    title: 'GetHeard',
    subtitle:
      'Создано для NHS в Великобритании. Опишите проблему со здоровьем на своём языке. Мы поможем подготовить короткий текст для записи/обращения и более подробную версию для приёма — на вашем языке и на английском.',
    inputPlaceholder: 'Опишите вашу ситуацию...',
    send: 'Отправить',
    generate: 'Сформировать summary',
    restart: 'Начать заново',
    shortTitle: 'Короткий текст для обращения',
    detailedTitle: 'Подробная версия для приёма',
    english: 'Английский',
    yourLanguage: 'Ваш язык',
    showYourLanguage: 'Показать версию на вашем языке',
    hideYourLanguage: 'Скрыть версию на вашем языке',
    nextStepsTitle: 'Что делать дальше',
    nextStepsUrgentNote:
      'Если состояние ухудшается или становится срочным, обратитесь в A&E или позвоните 999.',
    gpDesc:
      'Запишитесь к GP, если проблема продолжается и не требует экстренной помощи',
    pharmacyDesc:
      'В некоторых случаях фармацевт может помочь быстрее и без записи',
    nhs111Desc:
      'Если вы не уверены, что делать дальше, можно обратиться в NHS 111',
    heroHelpText:
      'Это основной текст, который можно скопировать и использовать для обращения.',
    copyMessage: 'Скопировать текст',
    copiedReady: 'Скопировано — можно отправлять',
  },
};

function detectUserLanguage(messages: Message[]): UiLang {
  const text = messages.map((m) => m.content).join(' ');
  return /[а-яё]/i.test(text) ? 'ru' : 'en';
}

function CopyButton({
  text,
  label = 'Copy',
  successText = 'Copied — ready to send',
}: {
  text: string;
  label?: string;
  successText?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleCopy}
        className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
      >
        {label}
      </button>

      <div className="min-h-[18px] text-xs text-emerald-300">
        {copied ? successText : ''}
      </div>
    </div>
  );
}

function ResultCard({
  title,
  subtitle,
  text,
  showCopy = true,
}: {
  title: string;
  subtitle?: string;
  text: string;
  showCopy?: boolean;
}) {
  return (
    <div className="w-full rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {showCopy && <CopyButton text={text} />}
      </div>

      <div className="whitespace-pre-wrap text-slate-100 leading-7">{text}</div>
    </div>
  );
}

function parseDetailedSections(text: string) {
  function getSection(startLabel: string, endLabel?: string) {
    const start = text.indexOf(startLabel);
    if (start === -1) return '';

    const from = start + startLabel.length;
    const to = endLabel ? text.indexOf(endLabel, from) : -1;

    if (to === -1) return text.slice(from).trim();
    return text.slice(from, to).trim();
  }

  const summary = getSection('Summary:', 'What to say:');
  const whatToSay = getSection('What to say:', 'Questions to ask:');
  const questionsRaw = getSection('Questions to ask:', 'Important to mention:');
  const importantRaw = getSection('Important to mention:');

  const questions = questionsRaw
    .split('\n')
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean);

  const important = importantRaw
    .split('\n')
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean);

  return {
    summary,
    whatToSay,
    questions,
    important,
  };
}

function DetailedResultCard({
  title,
  subtitle,
  text,
  showCopy = true,
}: {
  title: string;
  subtitle?: string;
  text: string;
  showCopy?: boolean;
}) {
  const sections = parseDetailedSections(text);

  return (
    <div className="w-full rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>

        {showCopy && (
          <CopyButton
            text={text}
            label="Copy"
            successText="Copied — ready to send"
          />
        )}
      </div>

      <div className="space-y-4">
        {sections.summary && (
          <div className="rounded-xl bg-slate-800 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-300">Summary</div>
            <div className="whitespace-pre-wrap leading-7 text-slate-100">
              {sections.summary}
            </div>
          </div>
        )}

        {sections.whatToSay && (
          <div className="rounded-xl bg-slate-800 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-300">What to say</div>
            <div className="whitespace-pre-wrap leading-7 text-slate-100">
              {sections.whatToSay}
            </div>
          </div>
        )}

        {sections.questions.length > 0 && (
          <div className="rounded-xl bg-slate-800 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-300">
              Questions to ask
            </div>
            <ul className="space-y-2 leading-7 text-slate-100">
              {sections.questions.map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
          </div>
        )}

        {sections.important.length > 0 && (
          <div className="rounded-xl bg-slate-800 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-300">
              Important to mention
            </div>
            <ul className="space-y-2 leading-7 text-slate-100">
              {sections.important.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {!sections.summary &&
          !sections.whatToSay &&
          sections.questions.length === 0 &&
          sections.important.length === 0 && (
            <div className="whitespace-pre-wrap leading-7 text-slate-100">
              {text}
            </div>
          )}
      </div>
    </div>
  );
}

function getCareOptions(output: OutputData | null, t: (typeof copy)['en']) {
  if (!output) return [];

  const text = `${output.userLanguageGp} ${output.englishGp}`.toLowerCase();
  const options: { key: string; title: string; desc: string }[] = [];

  options.push({
    key: 'gp',
    title: 'GP',
    desc: t.gpDesc,
  });

  if (
    text.includes('pain') ||
    text.includes('cough') ||
    text.includes('ear') ||
    text.includes('rash') ||
    text.includes('fever') ||
    text.includes('sore throat') ||
    text.includes('sinus') ||
    text.includes('bite')
  ) {
    options.push({
      key: 'pharmacy',
      title: 'Pharmacy',
      desc: t.pharmacyDesc,
    });
  }

  options.push({
    key: '111',
    title: 'NHS 111',
    desc: t.nhs111Desc,
  });

  return options;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ViewMode>('chat');
  const [output, setOutput] = useState<OutputData | null>(null);
  const [uiLang, setUiLang] = useState<UiLang>('en');
  const [conversationLang, setConversationLang] = useState<UiLang>('en');
  const [nonHealth, setNonHealth] = useState(false);
  const [showUserLanguageCards, setShowUserLanguageCards] = useState(false);

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

    const detectedLang = detectUserLanguage(newMessages);
    setConversationLang(detectedLang);

    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const combined = newMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const res = await fetch('/api/next-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lang': detectedLang,
        },
        body: JSON.stringify({
          text: combined,
          language: detectedLang,
        }),
      });

      const data = await res.json();

      if (data.non_health) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant' as const,
            content: data.question,
          },
        ]);
        setNonHealth(true);
        setMode('chat');
      } else if (data.ready) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant' as const,
            content:
              detectedLang === 'ru'
                ? 'Похоже, информации уже достаточно — можно сформировать summary.'
                : 'Looks like we have enough information — you can generate your summary now.',
          },
        ]);
        setNonHealth(false);
        setMode('ready');
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant' as const,
            content: data.question,
          },
        ]);
        setNonHealth(false);
        setMode('chat');
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant' as const,
          content:
            detectedLang === 'ru'
              ? 'Можете рассказать чуть подробнее?'
              : 'Could you tell me a bit more?',
        },
      ]);
      setNonHealth(false);
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
        /summary|сформировать/i.test(messages[messages.length - 1]?.content)
          ? messages.slice(0, -1)
          : messages;

      const combined = cleanedMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lang': conversationLang,
        },
        body: JSON.stringify({
          text: combined,
          language: conversationLang,
        }),
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
      setShowUserLanguageCards(false);
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
      setShowUserLanguageCards(false);
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
    setNonHealth(false);
    setShowUserLanguageCards(false);
    setConversationLang(uiLang);
  }

  const isEnglish =
    output?.userLanguage?.trim().toLowerCase().includes('english') ?? false;

  const careOptions = useMemo(() => getCareOptions(output, t), [output, t]);

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
            {mode === 'ready'
              ? conversationLang === 'ru'
                ? 'Готовлю summary...'
                : 'Preparing your summary...'
              : conversationLang === 'ru'
                ? 'Подбираю следующий уточняющий вопрос...'
                : 'Thinking about the best next question...'}
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
            {output.englishBooking && (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{t.shortTitle}</h3>
                    <p className="mt-1 text-sm text-amber-100/80">{t.english}</p>
                  </div>
                  <CopyButton
                    text={output.englishBooking}
                    label={t.copyMessage}
                    successText={t.copiedReady}
                  />
                </div>

                <div className="mb-3 text-sm text-slate-300">{t.heroHelpText}</div>

                <div className="whitespace-pre-wrap text-slate-100 leading-7">
                  {output.englishBooking}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
              <h3 className="text-lg font-semibold">{t.nextStepsTitle}</h3>

              {careOptions.map((opt) => (
                <div key={opt.key} className="rounded-xl bg-slate-800 p-4">
                  <div className="font-semibold">{opt.title}</div>
                  <div className="text-sm text-slate-400">{opt.desc}</div>
                </div>
              ))}

              <div className="text-sm text-slate-400">{t.nextStepsUrgentNote}</div>
            </div>

            {output.englishGp && (
              <div className="w-full">
                <DetailedResultCard
                  title={t.detailedTitle}
                  subtitle={t.english}
                  text={output.englishGp}
                  showCopy={true}
                />
              </div>
            )}

            {!isEnglish && (output.userLanguageBooking || output.userLanguageGp) && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowUserLanguageCards((prev) => !prev)}
                  className="text-sm text-slate-400 underline"
                >
                  {showUserLanguageCards
                    ? t.hideYourLanguage
                    : t.showYourLanguage}
                </button>

                {showUserLanguageCards && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {output.userLanguageBooking && (
                      <ResultCard
                        title={t.shortTitle}
                        subtitle={output.userLanguage || t.yourLanguage}
                        text={output.userLanguageBooking}
                        showCopy={false}
                      />
                    )}

                    {output.userLanguageGp && (
                      <DetailedResultCard
                        title={t.detailedTitle}
                        subtitle={output.userLanguage || t.yourLanguage}
                        text={output.userLanguageGp}
                        showCopy={false}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {!isEnglish &&
              !output.englishBooking &&
              !output.englishGp &&
              output.raw && (
                <div className="whitespace-pre-wrap rounded-2xl border border-slate-700 bg-slate-900 p-5">
                  {output.raw}
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

        {mode === 'chat' && !loading && !nonHealth && (
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

        {mode === 'chat' && !loading && nonHealth && (
          <button
            onClick={handleReset}
            className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black"
          >
            {t.restart}
          </button>
        )}
      </div>
    </main>
  );
}