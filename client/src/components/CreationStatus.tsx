import { useState, useEffect } from 'react';

interface Props {
  runId: number;
  run: any;
  onComplete: () => void;
  onError: (msg: string) => void;
}

export default function CreationStatus({ runId, run, onComplete, onError }: Props) {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [markingReady, setMarkingReady] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const slides = (() => {
    try { return JSON.parse(run.slides_json || '[]'); } catch { return []; }
  })();

  useEffect(() => {
    fetch('/api/figma/url')
      .then(r => r.json())
      .then(d => setFigmaUrl(d.url || ''))
      .catch(() => {});
  }, []);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllSlideText = () => {
    const allText = slides.map((slide: any, i: number) => {
      const num = i + 1;
      const parts: string[] = [`--- Slide ${num} ---`];
      if (slide.title) parts.push(`Title: ${slide.title}`);
      if (slide.subtitle) parts.push(`Subtitle: ${slide.subtitle}`);
      if (slide.description) parts.push(`Description: ${slide.description}`);
      if (slide.swipe_cta) parts.push(`CTA: ${slide.swipe_cta}`);
      if (slide.cta) parts.push(`CTA: ${slide.cta}`);
      return parts.join('\n');
    }).join('\n\n');

    navigator.clipboard.writeText(allText);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const markReady = async () => {
    setMarkingReady(true);
    try {
      const res = await fetch(`/api/runs/${runId}/mark-ready`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark ready');
      }
      onComplete();
    } catch (err: any) {
      onError(err.message);
    }
    setMarkingReady(false);
  };

  const getSlideFields = (slide: any, index: number) => {
    const num = index + 1;
    const fields: Array<{ label: string; value: string; key: string }> = [];
    if (num === 1) {
      if (slide.title) fields.push({ label: 'Title', value: slide.title, key: `s${num}-title` });
      if (slide.subtitle) fields.push({ label: 'Subtitle', value: slide.subtitle, key: `s${num}-subtitle` });
      if (slide.description) fields.push({ label: 'Description', value: slide.description, key: `s${num}-desc` });
      if (slide.swipe_cta) fields.push({ label: 'Swipe CTA', value: slide.swipe_cta, key: `s${num}-cta` });
    } else if (num === 6) {
      if (slide.cta) fields.push({ label: 'CTA', value: slide.cta, key: `s${num}-cta` });
    } else {
      if (slide.title) fields.push({ label: 'Title', value: slide.title, key: `s${num}-title` });
      if (slide.description) fields.push({ label: 'Description', value: slide.description, key: `s${num}-desc` });
    }
    return fields;
  };

  return (
    <div className="space-y-6">
      {/* Figma link */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-green/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-delta-subtle flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 38 57" fill="none">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-delta-text">Open in Figma</p>
              <p className="text-sm text-delta-muted">Edit the carousel template directly</p>
            </div>
          </div>
          {figmaUrl && (
            <a
              href={figmaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-delta-green text-white font-semibold px-6 py-2.5 rounded-2xl hover:shadow-glow text-sm transition"
            >
              Open Figma →
            </a>
          )}
        </div>
      </div>

      {/* Copy all button */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-delta-text">Slide Content</h2>
        <button
          onClick={copyAllSlideText}
          className="text-sm text-delta-green hover:text-delta-green border border-delta-green/30 px-4 py-2 rounded-xl font-medium hover:bg-delta-green/10 transition"
        >
          {copiedField === 'all' ? '✓ Copied all!' : 'Copy all text'}
        </button>
      </div>

      {/* Slide cards */}
      <div className="grid grid-cols-2 gap-4">
        {slides.map((slide: any, i: number) => {
          const num = i + 1;
          const fields = getSlideFields(slide, i);
          const isCtaSlide = num === 6;

          return (
            <div
              key={i}
              className={`rounded-2xl p-5 border ${
                isCtaSlide
                  ? 'gradient-green border-emerald-200'
                  : 'bg-delta-card shadow-card border-delta-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isCtaSlide ? 'text-emerald-600' : 'text-delta-muted'
                }`}>
                  Slide {num}{isCtaSlide ? ' — CTA' : num === 1 ? ' — Hook' : ''}
                </span>
                <span className="text-[10px] text-delta-muted bg-delta-subtle px-2 py-0.5 rounded-full">
                  {fields.length} field{fields.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-3">
                {fields.map(field => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-delta-muted uppercase tracking-wider font-medium">{field.label}</span>
                      <button
                        onClick={() => copyText(field.value, field.key)}
                        className="text-[10px] text-delta-green/70 hover:text-delta-green font-medium"
                      >
                        {copiedField === field.key ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <p className={`text-sm ${
                      field.label === 'Title' || field.label === 'CTA'
                        ? 'font-bold text-delta-text'
                        : 'text-delta-muted'
                    }`}>
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weavy.ai Mockup Step */}
      {run.visual_direction_json && (() => {
        const vd = JSON.parse(run.visual_direction_json || '{}');
        const imagery = vd.imagery || {};

        return (
          <>
            {imagery.use_mockup && (
              <div className="bg-delta-card rounded-3xl shadow-card border border-purple-200 dark:border-purple-500/30 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-xl">
                    📱
                  </div>
                  <div>
                    <p className="font-bold text-delta-text">Weavy.ai Mockup</p>
                    <p className="text-sm text-delta-muted">Generate a phone mockup, then replace the screen with the Delta app</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="gradient-purple rounded-2xl p-4 border border-purple-200 dark:border-purple-500/30">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-delta-muted uppercase tracking-wider font-medium">Step 1 — Delta App Screen to Use</p>
                      <button
                        onClick={() => copyText(imagery.mockup_screen || '', 'mockup-screen')}
                        className="text-[10px] text-purple-500 hover:text-purple-700 font-medium"
                      >
                        {copiedField === 'mockup-screen' ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-delta-text font-semibold">{imagery.mockup_screen}</p>
                  </div>

                  <div className="gradient-purple rounded-2xl p-4 border border-purple-200 dark:border-purple-500/30">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-delta-muted uppercase tracking-wider font-medium">Step 2 — Weavy Mockup Generation Prompt</p>
                      <button
                        onClick={() => copyText(imagery.mockup_prompt || '', 'mockup-prompt')}
                        className="text-[10px] text-purple-500 hover:text-purple-700 font-medium"
                      >
                        {copiedField === 'mockup-prompt' ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-delta-muted italic">{imagery.mockup_prompt}</p>
                  </div>

                  <div className="gradient-purple rounded-2xl p-4 border border-purple-200 dark:border-purple-500/30">
                    <p className="text-[10px] text-delta-muted uppercase tracking-wider font-medium mb-2">Step 3 — Generate in Weavy</p>
                    <div className="flex items-center gap-3">
                      <a
                        href="https://weavy.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-purple-100 text-purple-700 px-5 py-2.5 rounded-xl text-sm hover:bg-purple-200 inline-flex items-center gap-2 font-semibold transition"
                      >
                        Open Weavy.ai →
                      </a>
                      <p className="text-xs text-delta-muted">Generate mockup → replace screen → download</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {imagery.use_spanning_image && (
              <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">🖼</span>
                  <p className="font-bold text-sm text-delta-text">Spanning Image (Slides 1–2)</p>
                </div>
                <p className="text-sm text-delta-muted ml-8">{imagery.spanning_image_description}</p>
              </div>
            )}
          </>
        );
      })()}

      {/* Mark as ready */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6 flex items-center justify-between">
        <div>
          <p className="font-bold text-delta-text">Done editing in Figma?</p>
          <p className="text-sm text-delta-muted">
            This will export preview thumbnails and advance to the posting step.
          </p>
        </div>
        <button
          onClick={markReady}
          disabled={markingReady}
          className="bg-delta-green text-white font-semibold px-7 py-3 rounded-2xl hover:shadow-glow hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {markingReady ? 'Exporting...' : 'Mark as Ready'}
        </button>
      </div>
    </div>
  );
}
