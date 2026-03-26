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
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <h2 className="font-semibold text-lg mb-4">Post Published</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {run.ig_post_id && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Instagram</p>
              <p className="text-sm text-gray-300 mt-1 font-mono">{run.ig_post_id}</p>
            </div>
          )}
          {run.li_post_id && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">LinkedIn</p>
              <p className="text-sm text-gray-300 mt-1 font-mono">{run.li_post_id}</p>
            </div>
          )}
          {run.x_post_id && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">X (Twitter)</p>
              <p className="text-sm text-gray-300 mt-1 font-mono">{run.x_post_id}</p>
            </div>
          )}
        </div>

        {!run.ig_post_id && !run.li_post_id && !run.x_post_id && (
          <p className="text-gray-500 text-sm">No post IDs were entered</p>
        )}
      </div>

      <div className="bg-delta-card border border-delta-border rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Analytics Monitoring</p>
          <p className="text-lg font-semibold mt-1">{countdown}</p>
          <p className="text-xs text-gray-600 mt-1">Checks scheduled at +24h, +48h, and +7d</p>
        </div>
        <button
          onClick={fetchNow}
          disabled={fetching}
          className="bg-delta-green/20 text-delta-green px-4 py-2 rounded-lg text-sm hover:bg-delta-green/30 disabled:opacity-50"
        >
          {fetching ? 'Fetching...' : 'Fetch Now'}
        </button>
      </div>

      {/* Show partial metrics if available */}
      {(run.reach || run.saves || run.clicks) && (
        <div className="bg-delta-card border border-delta-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Latest Metrics</h3>
          <div className="grid grid-cols-3 gap-4">
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
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
