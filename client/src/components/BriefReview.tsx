import { useState } from 'react';
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
        <button onClick={copy} className="text-xs text-delta-green hover:text-emerald-700 font-medium">
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

  const slides = JSON.parse(run.slides_json || '[]');
  const visualDirection = JSON.parse(run.visual_direction_json || '{}');
  const imagery = visualDirection.imagery || {};
  const flagged = visualDirection.flagged;
  const flaggedReason = visualDirection.flagged_reason;

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
    setLoading(true);
    try {
      const res = await fetch(`/api/runs/${run.id}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      if (!res.ok) throw new Error('Rewrite failed');
      setFeedback('');
      setShowFeedback(false);
      onUpdate();
    } catch (err: any) {
      onError(err.message);
    }
    setLoading(false);
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-amber-700 font-semibold">⚠ Topic flagged for review</p>
          <p className="text-amber-600/70 text-sm mt-1">{flaggedReason}</p>
        </div>
      )}

      {/* Topic overview */}
      <div className="bg-white rounded-3xl shadow-card border border-delta-border p-6">
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
                    i <= run.validation_score ? 'bg-delta-green' : 'bg-gray-200'
                  }`}
                />
              ))}
              <span className="text-sm text-delta-muted ml-2 font-medium">{run.validation_score}/5</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Delta Feature</p>
            <p className="text-emerald-600 font-semibold mt-1 capitalize">{run.delta_feature}</p>
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
          <div className="mt-5 inline-flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-200">
            <span className="text-xs font-bold text-emerald-600">PRO</span>
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
      <div className="bg-white rounded-3xl shadow-card border border-delta-border p-6">
        <h3 className="font-bold text-delta-text mb-4">Imagery Plan</h3>
        <div className="space-y-4 text-sm">
          {imagery.use_mockup && (
            <div className="gradient-purple rounded-2xl p-5 border border-purple-200">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-lg">📱</span>
                <p className="font-semibold text-delta-text">Phone Mockup (Weavy.ai)</p>
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
          {imagery.use_spanning_image && (
            <div className="gradient-blue rounded-2xl p-5 border border-blue-200">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-lg">🖼</span>
                <p className="font-semibold text-delta-text">Spanning Image (Slides 1–2)</p>
              </div>
              <p className="text-delta-muted ml-7">{imagery.spanning_image_description}</p>
            </div>
          )}
          {!imagery.use_spanning_image && !imagery.use_mockup && (
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

      {/* Feedback input */}
      {!readOnly && showFeedback && (
        <div className="bg-white rounded-3xl shadow-card border border-delta-border p-6">
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
              className="bg-amber-100 text-amber-700 px-5 py-2.5 rounded-xl text-sm hover:bg-amber-200 font-semibold disabled:opacity-50"
            >
              {loading ? 'Rewriting...' : 'Submit Feedback'}
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
      {!readOnly && (
        <div className="flex gap-3">
          <button
            onClick={approve}
            disabled={loading}
            className="bg-delta-green text-white font-semibold px-7 py-3 rounded-2xl hover:shadow-glow hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            disabled={loading || showFeedback}
            className="bg-amber-100 text-amber-700 font-semibold px-7 py-3 rounded-2xl hover:bg-amber-200 transition disabled:opacity-50"
          >
            Request Changes
          </button>
          <button
            onClick={reject}
            disabled={loading}
            className="bg-red-50 text-red-600 font-semibold px-7 py-3 rounded-2xl hover:bg-red-100 transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
