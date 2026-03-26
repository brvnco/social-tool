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

const STATUS_COLORS: Record<string, string> = {
  researching: 'bg-blue-500/20 text-blue-400',
  picking: 'bg-indigo-500/20 text-indigo-400',
  briefing: 'bg-blue-500/20 text-blue-400',
  pending_approval: 'bg-amber-500/20 text-amber-400',
  creating: 'bg-blue-500/20 text-blue-400',
  ready: 'bg-emerald-500/20 text-emerald-400',
  posted: 'bg-teal-500/20 text-teal-400',
  complete: 'bg-purple-500/20 text-purple-400',
  error: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  researching: 'New',
  picking: 'Pick Direction',
  briefing: 'Researching',
  pending_approval: 'Pending Approval',
  creating: 'Creating',
  ready: 'Ready to Post',
  posted: 'Posted',
  complete: 'Complete',
  error: 'Error',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Weekly content pipeline</p>
        </div>
        <button
          onClick={startRun}
          disabled={creating}
          className="bg-delta-green text-delta-navy font-semibold px-5 py-2.5 rounded-lg hover:bg-delta-green/90 transition disabled:opacity-50"
        >
          {creating ? 'Starting...' : 'Run this week'}
        </button>
      </div>

      {/* Analytics summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Avg Reach (4w)" value={avgReach} />
        <StatCard label="Avg Saves (4w)" value={avgSaves} />
        <StatCard label="Avg Clicks (4w)" value={avgClicks} />
      </div>

      {/* Current run */}
      {currentRun && (
        <div
          onClick={() => navigate(`/runs/${currentRun.id}`)}
          className="bg-delta-card border border-delta-border rounded-xl p-5 cursor-pointer hover:border-delta-green/30 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Current Run</p>
              <h3 className="text-lg font-semibold mt-1">
                {currentRun.topic || 'Research in progress...'}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {new Date(currentRun.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
            <StatusBadge status={currentRun.status} />
          </div>
        </div>
      )}

      {/* Past runs */}
      {pastRuns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Past Runs</h2>
          <div className="grid gap-3">
            {pastRuns.map(run => (
              <div
                key={run.id}
                onClick={() => navigate(`/runs/${run.id}`)}
                className="bg-delta-card border border-delta-border rounded-lg p-4 cursor-pointer hover:border-delta-green/30 transition flex items-center justify-between"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{run.topic || 'Untitled'}</h4>
                  <p className="text-gray-500 text-sm">
                    {new Date(run.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                    {run.score != null && (
                      <span className="ml-3">
                        Score: <span className={run.score >= 1 ? 'text-delta-green' : 'text-amber-400'}>{run.score.toFixed(2)}</span>
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
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No runs yet</p>
          <p className="text-sm mt-1">Click "Run this week" to start your first content pipeline</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-delta-card border border-delta-border rounded-lg p-4">
      <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
