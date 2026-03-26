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
          <h3 className="font-semibold mb-3">Carousel Slides</h3>
          <div className="grid grid-cols-6 gap-2">
            {slides.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={src}
                  alt={`Slide ${i + 1}`}
                  className="rounded-lg border border-delta-border hover:border-delta-green/40 transition w-full"
                />
                <p className="text-[10px] text-gray-500 text-center mt-1">Slide {i + 1}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Local folder path */}
      {run.drive_folder_url && (
        <div className="bg-delta-card border border-delta-green/30 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📁</span>
            <div>
              <p className="font-semibold text-delta-green">Slides saved locally</p>
              <code className="text-sm text-gray-400 mt-0.5 block">exports/{run.id}/</code>
            </div>
          </div>
        </div>
      )}

      {/* Captions */}
      <div>
        <h3 className="font-semibold mb-3">Captions</h3>
        <div className="grid grid-cols-3 gap-4">
          <CaptionBlock label="Instagram" text={run.instagram_caption || ''} />
          <CaptionBlock label="LinkedIn" text={run.linkedin_caption || ''} />
          <CaptionBlock label="X (Twitter)" text={run.x_caption || ''} />
        </div>
      </div>

      {/* Posting checklist */}
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Posting Checklist</h3>
        <div className="space-y-2">
          {[
            { key: 'downloaded', label: 'Get slides from exports folder' },
            { key: 'instagram', label: 'Post carousel to Instagram' },
            { key: 'linkedin', label: 'Post to LinkedIn' },
            { key: 'x', label: 'Post to X' },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={checklist[item.key as keyof typeof checklist]}
                onChange={e =>
                  setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))
                }
                className="w-4 h-4 rounded border-delta-border bg-black/30 text-delta-green focus:ring-delta-green/50"
              />
              <span className="text-sm text-gray-300">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Post ID form */}
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Enter Post IDs</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Instagram Post ID</label>
            <input
              type="text"
              value={postIds.ig_post_id}
              onChange={e => setPostIds(prev => ({ ...prev, ig_post_id: e.target.value }))}
              placeholder="Optional"
              className="w-full mt-1 bg-black/30 border border-delta-border rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-delta-green/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">LinkedIn Post ID</label>
            <input
              type="text"
              value={postIds.li_post_id}
              onChange={e => setPostIds(prev => ({ ...prev, li_post_id: e.target.value }))}
              placeholder="Optional"
              className="w-full mt-1 bg-black/30 border border-delta-border rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-delta-green/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">X Post ID</label>
            <input
              type="text"
              value={postIds.x_post_id}
              onChange={e => setPostIds(prev => ({ ...prev, x_post_id: e.target.value }))}
              placeholder="Optional"
              className="w-full mt-1 bg-black/30 border border-delta-border rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-delta-green/50 focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={markPosted}
          disabled={submitting}
          className="mt-4 bg-delta-green text-delta-navy font-semibold px-6 py-2.5 rounded-lg hover:bg-delta-green/90 disabled:opacity-50"
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
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <button onClick={copy} className="text-xs text-delta-green hover:text-delta-green/80">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-delta-card border border-delta-border rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto scrollbar-thin">
        {text}
      </pre>
    </div>
  );
}
