import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import DirectionPicker from '../components/DirectionPicker';
import ResearchPanel from '../components/ResearchPanel';
import BriefReview from '../components/BriefReview';
import CreationStatus from '../components/CreationStatus';
import DeliveryPackage from '../components/DeliveryPackage';
import PostIdForm from '../components/PostIdForm';
import AnalyticsCard from '../components/AnalyticsCard';

interface Run {
  id: number;
  created_at: string;
  topic: string;
  angle: string;
  delta_feature: string;
  validation_score: number;
  cta: string;
  instagram_caption: string;
  linkedin_caption: string;
  x_caption: string;
  slides_json: string;
  visual_direction_json: string;
  drive_folder_url: string;
  status: string;
  ig_post_id: string;
  li_post_id: string;
  x_post_id: string;
  posted_at: string;
  reach: number;
  saves: number;
  clicks: number;
  score: number;
  low_saves: number;
  low_reach: number;
}

const STEPS = [
  { key: 'researching', label: 'Discover', icon: '1', description: 'Topic directions' },
  { key: 'picking', label: 'Pick Direction', icon: '2', description: 'Choose a topic' },
  { key: 'briefing', label: 'Research', icon: '3', description: 'Deep dive' },
  { key: 'pending_approval', label: 'Approval', icon: '4', description: 'Review brief' },
  { key: 'creating', label: 'Creation', icon: '5', description: 'Build assets' },
  { key: 'ready', label: 'Ready to Post', icon: '6', description: 'Deliver' },
  { key: 'posted', label: 'Posted', icon: '7', description: 'Monitoring' },
  { key: 'complete', label: 'Analytics', icon: '8', description: 'Results' },
];

const STATUS_ORDER = STEPS.map(s => s.key);

function getStepIndex(status: string): number {
  if (status === 'error') return 0;
  const i = STATUS_ORDER.indexOf(status);
  return i >= 0 ? i : 0;
}

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'info' } | null>(null);
  const [viewStep, setViewStep] = useState<number | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [proposing, setProposing] = useState(false);

  const fetchRun = useCallback(() => {
    fetch(`/api/runs/${id}`).then(r => r.json()).then((data: Run) => {
      setRun(data);
      if (viewStep === null) {
        setViewStep(getStepIndex(data.status));
      }
      if (data.status === 'error') {
        setStepErrors(prev => ({ ...prev, researching: 'Failed. Check server logs.' }));
      }
    });
  }, [id, viewStep]);

  useEffect(() => {
    fetchRun();
    const interval = setInterval(fetchRun, 5000);
    return () => clearInterval(interval);
  }, [fetchRun]);

  const showToast = (msg: string, type: 'error' | 'info' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const recordStepError = (stepKey: string, msg: string) => {
    setStepErrors(prev => ({ ...prev, [stepKey]: msg }));
    showToast(msg);
  };

  const clearStepError = (stepKey: string) => {
    setStepErrors(prev => {
      const next = { ...prev };
      delete next[stepKey];
      return next;
    });
  };

  const startPropose = async () => {
    if (!run) return;
    setProposing(true);
    clearStepError('researching');
    try {
      const res = await fetch(`/api/runs/${run.id}/propose`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to propose directions');
      }
      fetchRun();
      setViewStep(1);
    } catch (err: any) {
      recordStepError('researching', err.message);
    }
    setProposing(false);
  };

  if (!run) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-delta-green border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentStepIndex = getStepIndex(run.status);
  const activeView = viewStep ?? currentStepIndex;
  const activeStepKey = STEPS[activeView]?.key;
  const visualData = (() => {
    try { return JSON.parse(run.visual_direction_json || '{}'); } catch { return {}; }
  })();

  return (
    <div className="flex gap-8 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-8 z-50 px-5 py-3 rounded-2xl text-sm max-w-md shadow-lg border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-center gap-3">
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 text-lg leading-none">&times;</button>
          </div>
        </div>
      )}

      {/* Vertical stepper */}
      <div className="w-56 shrink-0">
        <div className="sticky top-24 bg-white rounded-3xl shadow-card border border-delta-border p-3">
          {STEPS.map((step, i) => {
            const isCurrent = i === currentStepIndex;
            const isPast = i < currentStepIndex;
            const isViewing = i === activeView;
            const hasError = !!stepErrors[step.key];

            return (
              <button
                key={step.key}
                onClick={() => setViewStep(i)}
                className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-2xl transition-all text-left ${
                  isViewing ? 'bg-delta-subtle' : 'hover:bg-delta-bg'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    hasError
                      ? 'bg-red-100 text-red-600'
                      : isViewing
                      ? 'bg-delta-green text-white shadow-sm'
                      : isPast
                      ? 'bg-emerald-100 text-emerald-600'
                      : isCurrent
                      ? 'bg-delta-green/15 text-delta-green'
                      : 'bg-delta-subtle text-delta-muted'
                  }`}
                >
                  {hasError ? '!' : isPast ? '✓' : step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium block ${
                      hasError ? 'text-red-600'
                      : isViewing ? 'text-delta-text'
                      : isCurrent ? 'text-delta-text'
                      : isPast ? 'text-delta-muted'
                      : 'text-delta-muted/60'
                    }`}
                  >
                    {step.label}
                  </span>
                  {hasError && <span className="text-[10px] text-red-500 block">Error</span>}
                  {isCurrent && !hasError && <span className="text-[10px] text-delta-green block font-medium">Current</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-delta-text tracking-tight">{run.topic || 'New Run'}</h1>
          <p className="text-delta-muted text-sm mt-1">
            {new Date(run.created_at).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Error banner */}
        {stepErrors[activeStepKey] && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-red-700 font-semibold text-sm">Error on this step</p>
              <p className="text-red-600/70 text-sm mt-1">{stepErrors[activeStepKey]}</p>
            </div>
            <button onClick={() => clearStepError(activeStepKey)} className="text-red-400 hover:text-red-600 shrink-0 text-lg">&times;</button>
          </div>
        )}

        {/* Step 1: Discover */}
        {activeStepKey === 'researching' && (
          <>
            {(run.status === 'researching' || run.status === 'error') && (
              <div className="bg-white rounded-3xl shadow-card border border-delta-border p-8 space-y-5">
                <div>
                  <h2 className="font-bold text-xl text-delta-text">Discover Topics</h2>
                  <p className="text-delta-muted mt-1">Claude will propose 3 topic directions for this week's carousel.</p>
                </div>
                <button
                  onClick={startPropose}
                  disabled={proposing}
                  className="bg-delta-green text-white font-semibold px-7 py-3 rounded-2xl hover:shadow-glow hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {proposing ? 'Generating...' : run.status === 'error' ? 'Retry' : 'Propose Directions'}
                </button>
              </div>
            )}
            {getStepIndex(run.status) > 0 && run.status !== 'error' && (
              <StepSummary title="Discover Complete" details={[
                { label: 'Directions', value: `${visualData.directions?.length || 0} proposed` },
              ]} />
            )}
          </>
        )}

        {/* Step 2: Pick direction */}
        {activeStepKey === 'picking' && (
          <>
            {run.status === 'picking' && visualData.directions ? (
              <DirectionPicker
                runId={run.id}
                directions={visualData.directions}
                onPicked={() => { fetchRun(); setViewStep(2); }}
                onError={(msg) => recordStepError('picking', msg)}
              />
            ) : getStepIndex(run.status) > 1 ? (
              <StepSummary title="Direction Chosen" details={[
                { label: 'Topic', value: visualData.chosen_direction?.topic || run.topic },
                { label: 'Angle', value: visualData.chosen_direction?.angle || run.angle },
              ]} />
            ) : (
              <StepNotReady label="Pick Direction" />
            )}
          </>
        )}

        {/* Step 3: Research (briefing) */}
        {activeStepKey === 'briefing' && (
          <>
            {run.status === 'briefing' ? (
              <ResearchPanel
                runId={run.id}
                onComplete={() => { clearStepError('briefing'); fetchRun(); setViewStep(3); }}
                onError={(msg) => recordStepError('briefing', msg)}
              />
            ) : getStepIndex(run.status) > 2 ? (
              <StepSummary title="Research Complete" details={[
                { label: 'Topic', value: run.topic },
                { label: 'Score', value: run.validation_score ? `${run.validation_score}/5` : '—' },
              ]} />
            ) : (
              <StepNotReady label="Research" />
            )}
          </>
        )}

        {/* Step 4: Approval */}
        {activeStepKey === 'pending_approval' && (
          <>
            {run.status === 'pending_approval' ? (
              <BriefReview
                run={run}
                onUpdate={() => { fetchRun(); setViewStep(4); }}
                onError={(msg) => recordStepError('pending_approval', msg)}
              />
            ) : getStepIndex(run.status) > 3 ? (
              <BriefReview run={run} onUpdate={fetchRun} onError={showToast as any} readOnly />
            ) : (
              <StepNotReady label="Approval" />
            )}
          </>
        )}

        {/* Step 5: Creation */}
        {activeStepKey === 'creating' && (
          <>
            {run.status === 'creating' ? (
              <CreationStatus
                runId={run.id}
                run={run}
                onComplete={() => { fetchRun(); setViewStep(5); }}
                onError={(msg) => recordStepError('creating', msg)}
              />
            ) : getStepIndex(run.status) > 4 ? (
              <StepSummary title="Assets Created" details={[
                { label: 'Slides', value: run.drive_folder_url ? 'Exported locally' : 'Not exported' },
              ]} />
            ) : (
              <StepNotReady label="Creation" />
            )}
          </>
        )}

        {/* Step 6: Ready to post */}
        {activeStepKey === 'ready' && (
          <>
            {getStepIndex(run.status) >= 5 ? (
              <DeliveryPackage
                run={run}
                onUpdate={() => { fetchRun(); setViewStep(6); }}
                onError={(msg) => recordStepError('ready', msg)}
              />
            ) : (
              <StepNotReady label="Ready to Post" />
            )}
          </>
        )}

        {/* Step 7: Posted */}
        {activeStepKey === 'posted' && (
          <>
            {getStepIndex(run.status) >= 6 ? (
              <PostIdForm run={run} onUpdate={fetchRun} onError={(msg) => recordStepError('posted', msg)} />
            ) : (
              <StepNotReady label="Posted" />
            )}
          </>
        )}

        {/* Step 8: Analytics */}
        {activeStepKey === 'complete' && (
          <>
            {run.status === 'complete' ? (
              <AnalyticsCard run={run} onRefresh={fetchRun} onError={(msg) => recordStepError('complete', msg)} />
            ) : (
              <StepNotReady label="Analytics" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StepNotReady({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-3xl shadow-card border border-delta-border p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-delta-subtle mx-auto flex items-center justify-center mb-3">
        <span className="text-delta-muted text-xl">⏳</span>
      </div>
      <p className="text-delta-muted font-medium">{label} — not reached yet</p>
      <p className="text-delta-muted/60 text-sm mt-1">Complete the previous steps first.</p>
    </div>
  );
}

function StepSummary({ title, details }: { title: string; details: { label: string; value: string }[] }) {
  return (
    <div className="bg-white rounded-3xl shadow-card border border-delta-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
          <span className="text-emerald-600 text-xs font-bold">✓</span>
        </div>
        <h2 className="font-bold text-delta-text">{title}</h2>
      </div>
      <div className="space-y-2">
        {details.map(d => (
          <div key={d.label} className="flex gap-3 text-sm">
            <span className="text-delta-muted w-24 shrink-0 font-medium">{d.label}</span>
            <span className="text-delta-text">{d.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
