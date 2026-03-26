import { useState, useEffect } from 'react';

interface Props {
  run: any;
  onUpdate: () => void;
  onError: (msg: string) => void;
}

export default function PostIdForm({ run, onUpdate, onError }: Props) {
  const [countdown, setCountdown] = useState('');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!run.posted_at) return;

    const update = () => {
      const posted = new Date(run.posted_at).getTime();
      const nextCheck = posted + 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = nextCheck - now;

      if (diff <= 0) {
        setCountdown('Analytics check due now');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`Next check in ${hours}h ${minutes}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [run.posted_at]);

  const fetchNow = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/runs/${run.id}/fetch-analytics`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      onUpdate();
    } catch (err: any) {
      onError(err.message);
    }
    setFetching(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-card border border-delta-border p-6">
        <h2 className="font-bold text-xl text-delta-text mb-5">Post Published</h2>

        <div className="grid grid-cols-3 gap-5 mb-5">
          {run.ig_post_id && (
            <div className="bg-delta-subtle rounded-2xl p-4">
              <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Instagram</p>
              <p className="text-sm text-delta-text mt-1.5 font-mono">{run.ig_post_id}</p>
            </div>
          )}
          {run.li_post_id && (
            <div className="bg-delta-subtle rounded-2xl p-4">
              <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">LinkedIn</p>
              <p className="text-sm text-delta-text mt-1.5 font-mono">{run.li_post_id}</p>
            </div>
          )}
          {run.x_post_id && (
            <div className="bg-delta-subtle rounded-2xl p-4">
              <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">X (Twitter)</p>
              <p className="text-sm text-delta-text mt-1.5 font-mono">{run.x_post_id}</p>
            </div>
          )}
        </div>

        {!run.ig_post_id && !run.li_post_id && !run.x_post_id && (
          <p className="text-delta-muted text-sm">No post IDs were entered</p>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-card border border-delta-border p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-delta-muted font-medium">Analytics Monitoring</p>
          <p className="text-xl font-bold text-delta-text mt-1">{countdown}</p>
          <p className="text-xs text-delta-muted mt-1">Checks scheduled at +24h, +48h, and +7d</p>
        </div>
        <button
          onClick={fetchNow}
          disabled={fetching}
          className="bg-delta-green/10 text-delta-green px-5 py-2.5 rounded-xl text-sm hover:bg-delta-green/20 font-semibold disabled:opacity-50 transition"
        >
          {fetching ? 'Fetching...' : 'Fetch Now'}
        </button>
      </div>

      {(run.reach || run.saves || run.clicks) && (
        <div className="bg-white rounded-3xl shadow-card border border-delta-border p-6">
          <h3 className="font-bold text-delta-text mb-4">Latest Metrics</h3>
          <div className="grid grid-cols-3 gap-5">
            <MetricCard label="Reach" value={run.reach || 0} />
            <MetricCard label="Saves" value={run.saves || 0} />
            <MetricCard label="Clicks" value={run.clicks || 0} />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="gradient-green rounded-2xl p-4 border border-emerald-100 text-center">
      <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">{label}</p>
      <p className="text-2xl font-bold text-delta-text mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
