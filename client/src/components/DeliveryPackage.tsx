import { useCallback, useEffect, useState } from 'react';

interface Props {
  run: any;
  onUpdate: () => void;
  onError: (msg: string) => void;
}

export default function DeliveryPackage({ run, onUpdate, onError }: Props) {
  const [slides, setSlides] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [postIds, setPostIds] = useState({
    ig_post_id: '',
    li_post_id: '',
    x_post_id: '',
  });
  const [checklist, setChecklist] = useState({
    downloaded: false,
    instagram: false,
    linkedin: false,
    x: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/runs/${run.id}/slides`).then(r => r.json()).then(setSlides).catch(() => {});
  }, [run.id]);

  const markPosted = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/runs/${run.id}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postIds),
      });
      if (!res.ok) throw new Error('Failed to mark as posted');
      onUpdate();
    } catch (err: any) {
      onError(err.message);
    }
    setSubmitting(false);
  };

  const downloadSlide = (src: string, index: number) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `slide-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAll = () => {
    slides.forEach((src, i) => {
      setTimeout(() => downloadSlide(src, i), i * 200);
    });
  };

  return (
    <div className="space-y-6">
      {/* Slide previews */}
      {slides.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-delta-text">Carousel Slides</h3>
            <button
              onClick={downloadAll}
              className="inline-flex items-center gap-1.5 text-sm text-delta-green hover:text-delta-green font-medium transition"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Download all
            </button>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {slides.map((src, i) => (
              <div key={i} className="group relative">
                <button
                  onClick={() => setViewerIndex(i)}
                  className="block w-full text-left"
                >
                  <img
                    src={src}
                    alt={`Slide ${i + 1}`}
                    className="rounded-2xl border border-delta-border group-hover:border-delta-green/40 shadow-card group-hover:shadow-card-hover transition w-full cursor-zoom-in"
                  />
                </button>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-delta-muted font-medium">Slide {i + 1}</p>
                  <button
                    onClick={() => downloadSlide(src, i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Download slide ${i + 1}`}
                  >
                    <span className="material-symbols-outlined text-sm text-delta-muted hover:text-delta-green transition">download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image viewer lightbox */}
      {viewerIndex !== null && (
        <SlideViewer
          slides={slides}
          currentIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onChange={setViewerIndex}
          onDownload={downloadSlide}
        />
      )}

      {/* Local folder */}
      {run.drive_folder_url && (
        <div className="gradient-green rounded-3xl border border-emerald-200 dark:border-emerald-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">folder</span>
            </div>
            <div>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">Slides saved locally</p>
              <code className="text-sm text-delta-muted mt-0.5 block font-mono">exports/{run.id}/</code>
            </div>
          </div>
        </div>
      )}

      {/* Captions */}
      <div>
        <h3 className="font-bold text-delta-text mb-4">Captions</h3>
        <div className="grid grid-cols-3 gap-4">
          <CaptionBlock label="Instagram" text={run.instagram_caption || ''} />
          <CaptionBlock label="LinkedIn" text={run.linkedin_caption || ''} />
          <CaptionBlock label="X (Twitter)" text={run.x_caption || ''} />
        </div>
      </div>

      {/* Posting checklist */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
        <h3 className="font-bold text-delta-text mb-4">Posting Checklist</h3>
        <div className="space-y-3">
          {[
            { key: 'downloaded', label: 'Get slides from exports folder' },
            { key: 'instagram', label: 'Post carousel to Instagram' },
            { key: 'linkedin', label: 'Post to LinkedIn' },
            { key: 'x', label: 'Post to X' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer py-1 group">
              <input
                type="checkbox"
                checked={checklist[item.key as keyof typeof checklist]}
                onChange={e =>
                  setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))
                }
                className="w-5 h-5 rounded-lg border-2 border-delta-border"
              />
              <span className={`text-sm transition ${
                checklist[item.key as keyof typeof checklist] ? 'text-delta-muted line-through' : 'text-delta-text'
              }`}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Post ID form */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
        <h3 className="font-bold text-delta-text mb-4">Enter Post IDs</h3>
        <p className="text-sm text-delta-muted mb-4">Optional — only needed if you want to track analytics for this post.</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-delta-muted uppercase tracking-wider font-medium">Instagram Post ID</label>
            <input
              type="text"
              value={postIds.ig_post_id}
              onChange={e => setPostIds(prev => ({ ...prev, ig_post_id: e.target.value }))}
              placeholder="Optional"
              className="w-full mt-1.5 bg-delta-subtle border border-delta-border rounded-xl px-4 py-2.5 text-sm text-delta-text placeholder-delta-muted/40"
            />
          </div>
          <div>
            <label className="text-xs text-delta-muted uppercase tracking-wider font-medium">LinkedIn Post ID</label>
            <input
              type="text"
              value={postIds.li_post_id}
              onChange={e => setPostIds(prev => ({ ...prev, li_post_id: e.target.value }))}
              placeholder="Optional"
              className="w-full mt-1.5 bg-delta-subtle border border-delta-border rounded-xl px-4 py-2.5 text-sm text-delta-text placeholder-delta-muted/40"
            />
          </div>
          <div>
            <label className="text-xs text-delta-muted uppercase tracking-wider font-medium">X Post ID</label>
            <input
              type="text"
              value={postIds.x_post_id}
              onChange={e => setPostIds(prev => ({ ...prev, x_post_id: e.target.value }))}
              placeholder="Optional"
              className="w-full mt-1.5 bg-delta-subtle border border-delta-border rounded-xl px-4 py-2.5 text-sm text-delta-text placeholder-delta-muted/40"
            />
          </div>
        </div>
        <button
          onClick={markPosted}
          disabled={submitting}
          className="mt-5 bg-delta-green text-white dark:text-delta-bg font-semibold px-7 py-3 rounded-2xl hover:shadow-glow hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Mark as Posted'}
        </button>
      </div>
    </div>
  );
}

// ── Slide Viewer Lightbox ──

interface ViewerProps {
  slides: string[];
  currentIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
  onDownload: (src: string, index: number) => void;
}

function SlideViewer({ slides, currentIndex, onClose, onChange, onDownload }: ViewerProps) {
  const goPrev = useCallback(() => {
    onChange(currentIndex > 0 ? currentIndex - 1 : slides.length - 1);
  }, [currentIndex, slides.length, onChange]);

  const goNext = useCallback(() => {
    onChange(currentIndex < slides.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, slides.length, onChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center max-w-3xl w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between w-full mb-4">
          <p className="text-white/70 text-sm font-medium">
            Slide {currentIndex + 1} of {slides.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(slides[currentIndex], currentIndex)}
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition px-3 py-1.5 rounded-xl hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Download
            </button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative w-full flex items-center justify-center">
          {/* Prev button */}
          <button
            onClick={goPrev}
            className="absolute left-0 -translate-x-14 text-white/50 hover:text-white transition p-2 rounded-2xl hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-3xl">chevron_left</span>
          </button>

          <img
            src={slides[currentIndex]}
            alt={`Slide ${currentIndex + 1}`}
            className="max-h-[75vh] w-auto rounded-3xl shadow-2xl"
          />

          {/* Next button */}
          <button
            onClick={goNext}
            className="absolute right-0 translate-x-14 text-white/50 hover:text-white transition p-2 rounded-2xl hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-3xl">chevron_right</span>
          </button>
        </div>

        {/* Thumbnail strip */}
        <div className="flex items-center gap-2 mt-4">
          {slides.map((src, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition ${
                i === currentIndex
                  ? 'border-white shadow-lg scale-110'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={src} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Caption Block ──

function CaptionBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">{label}</p>
        <button onClick={copy} className="text-xs text-delta-green hover:text-delta-green font-medium">
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-delta-subtle border border-delta-border rounded-2xl p-4 text-sm text-delta-text whitespace-pre-wrap max-h-64 overflow-y-auto scrollbar-thin">
        {text}
      </pre>
    </div>
  );
}
