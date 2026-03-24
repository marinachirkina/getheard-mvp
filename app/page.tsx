'use client';

import { useState } from 'react';

type Step = 1 | 2 | 3 | 4;

type OutputData = {
  userLanguage: string;
  userLanguageBooking: string;
  userLanguageGp: string;
  englishBooking: string;
  englishGp: string;
  raw?: string;
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
  const [step, setStep] = useState<Step>(1);
  const [problem, setProblem] = useState('');
  const [duration, setDuration] = useState('');
  const [impact, setImpact] = useState('');
  const [output, setOutput] = useState<OutputData | null>(null);
  const [loading, setLoading] = useState(false);

  const isEnglish =
    output?.userLanguage?.trim().toLowerCase().includes('english') ?? false;

  async function handleNext() {
    if (step === 1 && !problem.trim()) return;
    if (step === 2 && !duration.trim()) return;
    if (step === 3 && !impact.trim()) return;

    if (step < 3) {
      setStep((prev) => (prev + 1) as Step);
      return;
    }

    setLoading(true);
    setOutput(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, duration, impact }),
      });

      const data = await res.json();

      setOutput({
        userLanguage: data.userLanguage,
        userLanguageBooking: data.userLanguageBooking,
        userLanguageGp: data.userLanguageGp,
        englishBooking: data.englishBooking,
        englishGp: data.englishGp,
        raw: data.raw,
      });

      setStep(4);
    } catch {
      setOutput({
        userLanguage: 'Error',
        userLanguageBooking: '',
        userLanguageGp: '',
        englishBooking: '',
        englishGp: '',
        raw: 'Something went wrong.',
      });
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setStep(1);
    setProblem('');
    setDuration('');
    setImpact('');
    setOutput(null);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-4xl font-bold">GetHeard</h1>

        <p className="mb-8 max-w-3xl text-slate-300">
          Describe your problem in your own language. We will help you prepare
          both a short booking version and a more detailed GP version, in your
          language and in English.
        </p>

        {step === 1 && (
          <div className="max-w-2xl space-y-4">
            <label className="block text-lg font-medium">
              1. What’s the problem?
            </label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Write freely in your own language..."
              className="h-40 w-full rounded-xl border border-slate-700 bg-slate-900 p-4"
            />
            <button
              onClick={handleNext}
              className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl space-y-4">
            <label className="block text-lg font-medium">
              2. How long has this been going on?
            </label>
            <textarea
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Example: 3 days, 2 weeks, since yesterday..."
              className="h-32 w-full rounded-xl border border-slate-700 bg-slate-900 p-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl space-y-4">
            <label className="block text-lg font-medium">
              3. How is it affecting you / what worries you most?
            </label>
            <textarea
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="Example: getting worse, affecting sleep, hard to walk, worried because..."
              className="h-32 w-full rounded-xl border border-slate-700 bg-slate-900 p-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={loading}
                className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black"
              >
                {loading ? 'Working...' : 'Generate summary'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && output && (
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
              onClick={handleRestart}
              className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black"
            >
              Start again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}