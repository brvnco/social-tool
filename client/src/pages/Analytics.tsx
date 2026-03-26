import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Run {
  id: number;
  created_at: string;
  topic: string;
  status: string;
  reach: number | null;
  saves: number | null;
  clicks: number | null;
  score: number | null;
}

export default function Analytics() {
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    fetch('/api/runs').then(r => r.json()).then(setRuns);
  }, []);

  const completedRuns = runs
    .filter(r => r.status === 'complete' && r.reach != null)
    .reverse()
    .slice(-12);

  const chartData = completedRuns.map(r => ({
    label: new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    reach: r.reach || 0,
    saves: r.saves || 0,
    clicks: r.clicks || 0,
    score: r.score || 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {chartData.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          <ChartCard title="Reach" dataKey="reach" data={chartData} color="#00FF7F" />
          <ChartCard title="Saves" dataKey="saves" data={chartData} color="#FBBF24" />
          <ChartCard title="Clicks" dataKey="clicks" data={chartData} color="#60A5FA" />
          <ChartCard title="Score" dataKey="score" data={chartData} color="#A78BFA" />
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p>No completed runs with analytics data yet</p>
        </div>
      )}

      {/* Runs table */}
      {runs.length > 0 && (
        <div className="bg-delta-card border border-delta-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-delta-border">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Topic</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Reach</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Saves</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Clicks</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Score</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} className="border-b border-delta-border/50 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(run.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{run.topic || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{run.reach?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{run.saves?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{run.clicks?.toLocaleString() || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{run.score?.toFixed(2) || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-gray-500 capitalize">{run.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  dataKey,
  data,
  color,
}: {
  title: string;
  dataKey: string;
  data: any[];
  color: string;
}) {
  return (
    <div className="bg-delta-card border border-delta-border rounded-xl p-5">
      <h3 className="text-sm text-gray-400 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '8px',
              color: '#e5e7eb',
              fontSize: '12px',
            }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
