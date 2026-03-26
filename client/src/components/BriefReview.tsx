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
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <button onClick={copy} className="text-xs text-delta-green hover:text-delta-green/80">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-black/30 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">
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
      // Reset to researching to re-run with backup topic
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
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-400 font-medium">⚠ Topic flagged for review</p>
          <p className="text-amber-300/70 text-sm mt-1">{flaggedReason}</p>
        </div>
      )}

      {/* Topic overview */}
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Topic</p>
            <p className="text-lg font-semibold mt-1">{run.topic}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Angle</p>
            <p className="text-gray-300 mt-1">{run.angle}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Why Now</p>
            <p className="text-gray-300 mt-1">{visualDirection.why_now}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Validation Score</p>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i <= run.validation_score ? 'bg-delta-green' : 'bg-gray-700'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-400 ml-2">{run.validation_score}/5</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Delta Feature</p>
            <p className="text-delta-green font-medium mt-1 capitalize">{run.delta_feature}</p>
            {visualDirection.delta_feature_secondary && (
              <p className="text-gray-400 text-sm">+ {visualDirection.delta_feature_secondary}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">CTA</p>
            <p className="text-gray-300 mt-1">{run.cta}</p>
          </div>
        </div>
        {visualDirection.pro_angle && (
          <div className="mt-4 inline-flex items-center gap-2 bg-delta-green/10 px-3 py-1 rounded-full">
            <span className="text-xs font-semibold text-delta-green">PRO</span>
            <span className="text-sm text-gray-300">{visualDirection.pro_angle}</span>
          </div>
        )}
      </div>

      {/* Slides */}
      <div>
        <h3 className="font-semibold mb-3">6-Slide Structure</h3>
        <div className="grid grid-cols-3 gap-3">
          {slides.map((slide: any, i: number) => (
            <SlidePreview key={i} slide={slide} index={i} />
          ))}
        </div>
      </div>

      {/* Imagery plan */}
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Imagery Plan</h3>
        <div className="space-y-2 text-sm">
          {imagery.use_spanning_image && (
            <div className="flex items-start gap-2">
              <span className="text-delta-green">●</span>
              <div>
                <p className="text-gray-300">Spanning image across slides 1–2</p>
                <p className="text-gray-500">{imagery.spanning_image_description}</p>
              </div>
            </div>
          )}
          {imagery.use_mockup && (
            <div className="flex items-start gap-2">
              <span className="text-delta-green">●</span>
              <div>
                <p className="text-gray-300">Phone mockup with Delta screen</p>
                <p className="text-gray-500">Screen: {imagery.mockup_screen}</p>
              </div>
            </div>
          )}
          {!imagery.use_spanning_image && !imagery.use_mockup && (
            <p className="text-gray-500">No special imagery planned for this brief</p>
          )}
        </div>
      </div>

      {/* Captions */}
      <div>
        <h3 className="font-semibold mb-3">Platform Captions</h3>
        <div className="flex gap-4">
          <CopyBlock label="Instagram" text={run.instagram_caption || ''} />
          <CopyBlock label="LinkedIn" text={run.linkedin_caption || ''} />
          <CopyBlock label="X (Twitter)" text={run.x_caption || ''} />
        </div>
      </div>

      {readOnly && (
        <div className="bg-delta-card border border-delta-border rounded-xl p-4">
          <p className="text-sm text-gray-500">This brief has already been approved.</p>
        </div>
      )}

      {/* Feedback input */}
      {!readOnly && showFeedback && (
        <div className="bg-delta-card border border-delta-border rounded-xl p-5">
          <h3 className="font-semibold mb-2">Request Changes</h3>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Describe what changes you'd like..."
            className="w-full bg-black/30 border border-delta-border rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 focus:border-delta-green/50 focus:outline-none resize-none h-24"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={requestChanges}
              disabled={loading || !feedback.trim()}
              className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm hover:bg-amber-500/30 disabled:opacity-50"
            >
              {loading ? 'Rewriting...' : 'Submit Feedback'}
            </button>
            <button
              onClick={() => setShowFeedback(false)}
              className="text-gray-500 px-4 py-2 rounded-lg text-sm hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!readOnly && <div className="flex gap-3">
        <button
          onClick={approve}
          disabled={loading}
          className="bg-delta-green text-delta-navy font-semibold px-6 py-2.5 rounded-lg hover:bg-delta-green/90 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => setShowFeedback(true)}
          disabled={loading || showFeedback}
          className="bg-amber-500/20 text-amber-400 px-6 py-2.5 rounded-lg hover:bg-amber-500/30 disabled:opacity-50"
        >
          Request Changes
        </button>
        <button
          onClick={reject}
          disabled={loading}
          className="bg-red-500/20 text-red-400 px-6 py-2.5 rounded-lg hover:bg-red-500/30 disabled:opacity-50"
        >
          Reject
        </button>
      </div>}
    </div>
  );
}
