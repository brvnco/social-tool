import { useEffect, useState } from 'react';

interface Props {
  run: any;
  onUpdate: () => void;
  onError: (msg: string) => void;
}

export default function DeliveryPackage({ run, onUpdate, onError }: Props) {
  const [slides, setSlides] = useState<string[]>([]);
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

  return (
    <div className="space-y-6">
      {/* Slide previews */}
      {slides.length > 0 && (
        <div>
          <h3 className="font-bold text-delta-text mb-4">Carousel Slides</h3>
          <div className="grid grid-cols-6 gap-3">
            {slides.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block group">
                <img
                  src={src}
                  alt={`Slide ${i + 1}`}
                  className="rounded-2xl border border-delta-border group-hover:border-delta-green/40 shadow-card group-hover:shadow-card-hover transition w-full"
                />
                <p className="text-[10px] text-delta-muted text-center mt-1.5 font-medium">Slide {i + 1}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Local folder */}
      {run.drive_folder_url && (
        <div className="gradient-green rounded-3xl border border-emerald-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl">📁</span>
            </div>
            <div>
              <p className="font-bold text-emerald-700">Slides saved locally</p>
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
          className="mt-5 bg-delta-green text-white font-semibold px-7 py-3 rounded-2xl hover:shadow-glow hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Mark as Posted'}
        </button>
      </div>
    </div>
  );
}

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
