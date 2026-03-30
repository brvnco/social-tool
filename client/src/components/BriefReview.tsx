import { useEffect, useRef, useState } from 'react';
import SlidePreview from './SlidePreview';

interface Props {
  run: any;
  onUpdate: () => void;
  onError: (msg: string) => void;
  readOnly?: boolean;
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">{label}</p>
        <button onClick={copy} className="text-xs text-delta-green hover:text-delta-green font-medium">
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-delta-subtle rounded-2xl p-4 text-sm text-delta-text whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin border border-delta-border">
        {text}
      </pre>
    </div>
  );
}

export default function BriefReview({ run, onUpdate, onError, readOnly }: Props) {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteStream, setRewriteStream] = useState('');
  const [rewriteStatus, setRewriteStatus] = useState('');
  const streamRef = useRef<HTMLDivElement>(null);

  const slides = JSON.parse(run.slides_json || '[]');
  const visualDirection = JSON.parse(run.visual_direction_json || '{}');
  const imagery = visualDirection.imagery || {};
  const flagged = visualDirection.flagged;
  const flaggedReason = visualDirection.flagged_reason;

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [rewriteStream]);

  const approve = async () => {
    setLoading(true);
    try {
      await fetch(`/api/runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'creating' }),
      });
      await fetch(`/api/runs/${run.id}/create`, { method: 'POST' });
      onUpdate();
    } catch (err: any) {
      onError(err.message);
    }
    setLoading(false);
  };

  const requestChanges = async () => {
    if (!feedback.trim()) return;
    setRewriting(true);
    setRewriteStream('');
    setRewriteStatus('');

    try {
      const es = new EventSource(
        `/api/rewrite/${run.id}/stream?feedback=${encodeURIComponent(feedback)}`
      );

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'text-delta') {
            setRewriteStream(prev => prev + data.delta);
            return;
          }

          if (data.type === 'status') {
            setRewriteStatus(data.message);
            return;
          }

          if (data.type === 'complete') {
            es.close();
            setRewriting(false);
            setRewriteStream('');
            setRewriteStatus('');
            setFeedback('');
            setShowFeedback(false);
            onUpdate();
            return;
          }

          if (data.type === 'error') {
            es.close();
            setRewriting(false);
            onError(data.message);
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        setRewriting(false);
        onError('Connection lost during rewrite');
      };
    } catch (err: any) {
      setRewriting(false);
      onError(err.message);
    }
  };

  const reject = async () => {
    setLoading(true);
    try {
      await fetch(`/api/runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'researching' }),
      });
      onUpdate();
    } catch (err: any) {
      onError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Flagged warning */}
      {flagged && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
          <p className="text-amber-700 dark:text-amber-300 font-semibold">Topic flagged for review</p>
          <p className="text-amber-600/70 dark:text-amber-400/70 text-sm mt-1">{flaggedReason}</p>
        </div>
      )}

      {/* Topic overview */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Topic</p>
            <p className="text-lg font-bold text-delta-text mt-1">{run.topic}</p>
          </div>
          <div>
            <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Angle</p>
            <p className="text-delta-text mt-1">{run.angle}</p>
          </div>
          <div>
            <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Why Now</p>
            <p className="text-delta-text mt-1">{visualDirection.why_now}</p>
          </div>
          <div>
            <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Validation Score</p>
            <div className="flex gap-1.5 mt-2 items-center">
              {[1, 2, 3, 4, 5].map(i => (
                <span
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full ${
                    i <= run.validation_score ? 'bg-delta-green' : 'bg-delta-border'
                  }`}
                />
              ))}
              <span className="text-sm text-delta-muted ml-2 font-medium">{run.validation_score}/5</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Delta Feature</p>
            <p className="text-delta-green font-semibold mt-1 capitalize">{run.delta_feature}</p>
            {visualDirection.delta_feature_secondary && (
              <p className="text-delta-muted text-sm">+ {visualDirection.delta_feature_secondary}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">CTA</p>
            <p className="text-delta-text mt-1">{run.cta}</p>
          </div>
        </div>
        {visualDirection.pro_angle && (
          <div className="mt-5 inline-flex items-center gap-2 bg-delta-green/10 px-4 py-1.5 rounded-xl border border-delta-green/20">
            <span className="text-xs font-bold text-delta-green">PRO</span>
            <span className="text-sm text-delta-text">{visualDirection.pro_angle}</span>
          </div>
        )}
      </div>

      {/* Slides */}
      <div>
        <h3 className="font-bold text-delta-text mb-4">6-Slide Structure</h3>
        <div className="grid grid-cols-3 gap-4">
          {slides.map((slide: any, i: number) => (
            <SlidePreview key={i} slide={slide} index={i} />
          ))}
        </div>
      </div>

      {/* Imagery plan */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
        <h3 className="font-bold text-delta-text mb-4">Imagery Plan</h3>
        <div className="space-y-4 text-sm">
          {/* New format: hook_image */}
          {imagery.hook_image && (
            <div className={`rounded-2xl p-5 border ${
              imagery.hook_image.type === 'mockup' ? 'gradient-purple border-purple-200 dark:border-purple-800' :
              imagery.hook_image.type === 'delta_ui' ? 'gradient-green border-emerald-200 dark:border-emerald-800' :
              'gradient-blue border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="material-symbols-outlined text-lg">
                  {imagery.hook_image.type === 'mockup' ? 'smartphone' : imagery.hook_image.type === 'delta_ui' ? 'dashboard' : 'image'}
                </span>
                <span className="font-semibold">Hook Image (Slides 1–2) — {imagery.hook_image.type === 'delta_ui' ? 'Delta UI' : imagery.hook_image.type === 'mockup' ? 'Phone Mockup' : 'Visual'}</span>
              </div>
              <div className="space-y-2 ml-7">
                <p className="text-delta-muted">{imagery.hook_image.description}</p>
                {imagery.hook_image.delta_screen && (
                  <div>
                    <p className="text-[10px] text-delta-muted uppercase tracking-wider font-medium mb-0.5">Delta Screen</p>
                    <p className="text-delta-text">{imagery.hook_image.delta_screen}</p>
                  </div>
                )}
                {imagery.hook_image.mockup_prompt && (
                  <div>
                    <p className="text-[10px] text-delta-muted uppercase tracking-wider font-medium mb-0.5">Mockup Prompt</p>
                    <p className="text-delta-muted italic">{imagery.hook_image.mockup_prompt}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* New format: slide_images */}
          {imagery.slide_images?.length > 0 && imagery.slide_images.filter((si: any) => si.type !== 'none').map((si: any) => (
            <div key={si.slide} className={`rounded-2xl p-5 border ${
              si.type === 'mockup' ? 'gradient-purple border-purple-200 dark:border-purple-800' :
              si.type === 'delta_screen' ? 'gradient-green border-emerald-200 dark:border-emerald-800' :
              'gradient-blue border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined text-lg">
                  {si.type === 'mockup' ? 'smartphone' : si.type === 'delta_screen' ? 'dashboard' : 'image'}
                </span>
                <span className="font-semibold">Slide {si.slide} — {si.type === 'delta_screen' ? 'Delta Screen' : si.type === 'mockup' ? 'Phone Mockup' : 'Image'}</span>
              </div>
              <div className="ml-7 space-y-1">
                <p className="text-delta-muted">{si.description}</p>
                {si.delta_screen && (
                  <p className="text-delta-text text-xs"><span className="text-delta-muted">Screen:</span> {si.delta_screen}</p>
                )}
              </div>
            </div>
          ))}
          {/* Legacy format fallback */}
          {!imagery.hook_image && imagery.use_mockup && (
            <div className="gradient-purple rounded-2xl p-5 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="material-symbols-outlined text-lg">smartphone</span>
                <span className="font-semibold">Phone Mockup (Weavy.ai)</span>
              </div>
              <div className="space-y-2 ml-7">
                <div>
                  <p className="text-[10px] text-delta-muted uppercase tracking-wider font-medium mb-0.5">Delta Screen</p>
                  <p className="text-delta-text">{imagery.mockup_screen}</p>
                </div>
                <div>
                  <p className="text-[10px] text-delta-muted uppercase tracking-wider font-medium mb-0.5">Mockup Prompt</p>
                  <p className="text-delta-muted italic">{imagery.mockup_prompt}</p>
                </div>
              </div>
            </div>
          )}
          {!imagery.hook_image && imagery.use_spanning_image && (
            <div className="gradient-blue rounded-2xl p-5 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined text-lg">image</span>
                <span className="font-semibold">Spanning Image (Slides 1–2)</span>
              </div>
              <p className="text-delta-muted ml-7">{imagery.spanning_image_description}</p>
            </div>
          )}
          {!imagery.hook_image && !imagery.use_spanning_image && !imagery.use_mockup && !imagery.slide_images?.length && (
            <p className="text-delta-muted">No special imagery planned for this brief</p>
          )}
        </div>
      </div>

      {/* Captions */}
      <div>
        <h3 className="font-bold text-delta-text mb-4">Platform Captions</h3>
        <div className="flex gap-4">
          <CopyBlock label="Instagram" text={run.instagram_caption || ''} />
          <CopyBlock label="LinkedIn" text={run.linkedin_caption || ''} />
          <CopyBlock label="X (Twitter)" text={run.x_caption || ''} />
        </div>
      </div>

      {readOnly && (
        <div className="bg-delta-subtle rounded-2xl p-4 border border-delta-border">
          <p className="text-sm text-delta-muted">This brief has already been approved.</p>
        </div>
      )}

      {/* Rewrite stream panel */}
      {rewriting && (
        <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-delta-text">Rewriting Brief</h3>
            <span className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {rewriteStatus || 'Streaming...'}
            </span>
          </div>
          <div
            ref={streamRef}
            className="bg-delta-subtle rounded-2xl p-5 font-mono text-xs h-48 overflow-y-auto scrollbar-thin border border-delta-border text-delta-text whitespace-pre-wrap break-words"
          >
            {rewriteStream}
            <span className="inline-block w-1.5 h-4 bg-amber-500 animate-pulse ml-0.5 align-text-bottom" />
          </div>
        </div>
      )}

      {/* Feedback input */}
      {!readOnly && showFeedback && !rewriting && (
        <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
          <h3 className="font-bold text-delta-text mb-3">Request Changes</h3>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Describe what changes you'd like..."
            className="w-full bg-delta-subtle border border-delta-border rounded-2xl p-4 text-sm text-delta-text placeholder-delta-muted/50 resize-none h-24"
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={requestChanges}
              disabled={loading || !feedback.trim()}
              className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-5 py-2.5 rounded-xl text-sm hover:bg-amber-200 dark:hover:bg-amber-800 font-semibold disabled:opacity-50"
            >
              Submit Feedback
            </button>
            <button
              onClick={() => setShowFeedback(false)}
              className="text-delta-muted px-5 py-2.5 rounded-xl text-sm hover:text-delta-text hover:bg-delta-subtle"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!readOnly && !rewriting && (
        <div className="flex gap-3">
          <button
            onClick={approve}
            disabled={loading}
            className="bg-delta-green text-white dark:text-delta-bg font-semibold px-7 py-3 rounded-2xl hover:shadow-glow hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            disabled={loading || showFeedback}
            className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-semibold px-7 py-3 rounded-2xl hover:bg-amber-200 dark:hover:bg-amber-800 transition disabled:opacity-50"
          >
            Request Changes
          </button>
          <button
            onClick={reject}
            disabled={loading}
            className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-semibold px-7 py-3 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900 transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
