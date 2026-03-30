import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Run {
  id: number;
  created_at: string;
  topic: string;
  status: string;
  score: number | null;
  validation_score: number | null;
  reach: number | null;
  saves: number | null;
  clicks: number | null;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  researching: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400', label: 'New' },
  picking: { bg: 'bg-indigo-50 dark:bg-indigo-950', text: 'text-indigo-600 dark:text-indigo-400', label: 'Pick Direction' },
  briefing: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400', label: 'Researching' },
  pending_approval: { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400', label: 'Pending Approval' },
  creating: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400', label: 'Creating' },
  ready: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400', label: 'Ready to Post' },
  posted: { bg: 'bg-teal-50 dark:bg-teal-950', text: 'text-teal-600 dark:text-teal-400', label: 'Posted' },
  complete: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400', label: 'Complete' },
  error: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-600 dark:text-red-400', label: 'Error' },
};

export default function Dashboard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/runs').then(r => r.json()).then(setRuns);
    fetch('/api/settings').then(r => r.json()).then(setSettings);
  }, []);

  const startRun = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/runs', { method: 'POST' });
      const { id } = await res.json();
      navigate(`/runs/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const currentRun = runs[0];
  const pastRuns = runs.slice(1, 9);
  const avgReach = Number(settings.avg_reach) || 0;
  const avgSaves = Number(settings.avg_saves) || 0;
  const avgClicks = Number(settings.avg_clicks) || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-delta-text tracking-tight">Dashboard</h1>
          <p className="text-delta-muted mt-1">Weekly content pipeline</p>
        </div>
        <button
          onClick={startRun}
          disabled={creating}
          className="bg-delta-green text-white dark:text-delta-bg font-semibold px-6 py-3 rounded-2xl shadow-card hover:shadow-glow hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {creating ? 'Starting...' : '+ Run this week'}
        </button>
      </div>

      {/* Analytics summary cards */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Avg Reach" sublabel="Last 4 weeks" value={avgReach} gradient="gradient-green" />
        <StatCard label="Avg Saves" sublabel="Last 4 weeks" value={avgSaves} gradient="gradient-amber" />
        <StatCard label="Avg Clicks" sublabel="Last 4 weeks" value={avgClicks} gradient="gradient-blue" />
      </div>

      {/* Current run */}
      {currentRun && (
        <div
          onClick={() => navigate(`/runs/${currentRun.id}`)}
          className="bg-delta-card rounded-3xl p-6 shadow-card hover:shadow-card-hover cursor-pointer transition-all border border-delta-border group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-delta-green/10 flex items-center justify-center">
                <span className="text-delta-green text-xl">🏭</span>
              </div>
              <div>
                <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Current Run</p>
                <h3 className="text-lg font-bold text-delta-text mt-0.5 group-hover:text-delta-green transition">
                  {currentRun.topic || 'Research in progress...'}
                </h3>
                <p className="text-delta-muted text-sm">
                  {new Date(currentRun.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <StatusBadge status={currentRun.status} />
          </div>
        </div>
      )}

      {/* Past runs */}
      {pastRuns.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-delta-text mb-4">Past Runs</h2>
          <div className="grid gap-3">
            {pastRuns.map(run => (
              <div
                key={run.id}
                onClick={() => navigate(`/runs/${run.id}`)}
                className="bg-delta-card rounded-2xl p-4 px-5 shadow-card hover:shadow-card-hover cursor-pointer transition-all border border-delta-border flex items-center justify-between group"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-delta-text group-hover:text-delta-green transition">
                    {run.topic || 'Untitled'}
                  </h4>
                  <p className="text-delta-muted text-sm mt-0.5">
                    {new Date(run.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                    {run.score != null && (
                      <span className="ml-3">
                        Score: <span className={`font-semibold ${run.score >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>{run.score.toFixed(2)}</span>
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {runs.length === 0 && (
        <div className="text-center py-24 text-delta-muted">
          <div className="w-16 h-16 rounded-3xl bg-delta-subtle mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl opacity-40">🏭</span>
          </div>
          <p className="text-lg font-medium">No runs yet</p>
          <p className="text-sm mt-1">Click "Run this week" to start your first content pipeline</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, sublabel, value, gradient }: { label: string; sublabel: string; value: number; gradient: string }) {
  return (
    <div className={`${gradient} rounded-3xl p-5 border border-delta-border`}>
      <p className="text-delta-muted text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-delta-text mt-2">{value.toLocaleString()}</p>
      <p className="text-delta-muted text-xs mt-1">{sublabel}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', label: status };
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
