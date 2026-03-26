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
  { key: 'researching', label: 'Discover', icon: '1' },
  { key: 'picking', label: 'Pick Direction', icon: '2' },
  { key: 'briefing', label: 'Research', icon: '3' },
  { key: 'pending_approval', label: 'Approval', icon: '4' },
  { key: 'creating', label: 'Creation', icon: '5' },
  { key: 'ready', label: 'Ready to Post', icon: '6' },
  { key: 'posted', label: 'Posted', icon: '7' },
  { key: 'complete', label: 'Analytics', icon: '8' },
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
  const [toast, setToast] = useState<string | null>(null);
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

  const showToast = (msg: string) => {
    setToast(msg);
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

  // Trigger Phase 1
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
      setViewStep(1); // jump to picking
    } catch (err: any) {
      recordStepError('researching', err.message);
    }
    setProposing(false);
  };

  if (!run) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  const currentStepIndex = getStepIndex(run.status);
  const activeView = viewStep ?? currentStepIndex;
  const activeStepKey = STEPS[activeView]?.key;
  const visualData = (() => {
    try { return JSON.parse(run.visual_direction_json || '{}'); } catch { return {}; }
  })();

  return (
    <div className="flex gap-6 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm max-w-md">
          {toast}
          <button onClick={() => setToast(null)} className="ml-3 text-red-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Vertical stepper */}
      <div className="w-52 shrink-0">
        <div className="sticky top-20 relative">
          {STEPS.map((step, i) => {
            const isCurrent = i === currentStepIndex;
            const isPast = i < currentStepIndex;
            const isViewing = i === activeView;
            const hasError = !!stepErrors[step.key];

            return (
              <button
                key={step.key}
                onClick={() => setViewStep(i)}
                className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-lg transition-all text-left ${
                  isViewing ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0 ${
                    hasError
                      ? 'border-red-500 bg-red-500/20 text-red-400'
                      : isViewing
                      ? 'border-delta-green bg-delta-green/20 text-delta-green'
                      : isCurrent
                      ? 'border-delta-green/70 bg-delta-green/10 text-delta-green/80'
                      : isPast
                      ? 'border-delta-green/40 bg-delta-green/10 text-delta-green/60'
                      : 'border-gray-700 text-gray-600'
                  }`}
                >
                  {hasError ? '!' : isPast ? '✓' : step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium block ${
                      hasError ? 'text-red-400'
                      : isViewing ? 'text-delta-green'
                      : isCurrent ? 'text-gray-200'
                      : isPast ? 'text-gray-400'
                      : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </span>
                  {hasError && <span className="text-[10px] text-red-400/70 block">Error</span>}
                  {isCurrent && !hasError && <span className="text-[10px] text-delta-green/50 block">Current</span>}
                </div>
              </button>
            );
          })}
          <div className="absolute left-[0.95rem] top-[1.5rem] bottom-[1.5rem] w-px bg-gray-800 -z-10" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <h1 className="text-xl font-bold">{run.topic || 'New Run'}</h1>
          <p className="text-gray-500 text-sm">
            {new Date(run.created_at).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {/* Error banner */}
        {stepErrors[activeStepKey] && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-red-400 font-medium text-sm">Error on this step</p>
              <p className="text-red-300/70 text-sm mt-1">{stepErrors[activeStepKey]}</p>
            </div>
            <button onClick={() => clearStepError(activeStepKey)} className="text-red-400/50 hover:text-red-300 shrink-0 text-lg leading-none">&times;</button>
          </div>
        )}

        {/* Step 1: Discover */}
        {activeStepKey === 'researching' && (
          <>
            {(run.status === 'researching' || run.status === 'error') && (
              <div className="bg-delta-card border border-delta-border rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-lg">Discover Topics</h2>
                <p className="text-gray-400 text-sm">Claude will propose 3 topic directions for this week's carousel. No web search — fast and cheap.</p>
                <button
                  onClick={startPropose}
                  disabled={proposing}
                  className="bg-delta-green text-delta-navy font-semibold px-6 py-2.5 rounded-lg hover:bg-delta-green/90 disabled:opacity-50"
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
              <BriefReview run={run} onUpdate={fetchRun} onError={showToast} readOnly />
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
    <div className="bg-delta-card border border-delta-border rounded-xl p-8 text-center">
      <p className="text-gray-500">{label} — not reached yet</p>
      <p className="text-gray-600 text-sm mt-1">Complete the previous steps first.</p>
    </div>
  );
}

function StepSummary({ title, details }: { title: string; details: { label: string; value: string }[] }) {
  return (
    <div className="bg-delta-card border border-delta-border rounded-xl p-5">
      <h2 className="font-semibold text-delta-green mb-3">{title}</h2>
      <div className="space-y-2">
        {details.map(d => (
          <div key={d.label} className="flex gap-3 text-sm">
            <span className="text-gray-500 w-24 shrink-0">{d.label}</span>
            <span className="text-gray-300">{d.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
