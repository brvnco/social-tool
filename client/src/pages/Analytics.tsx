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

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--delta-accent').trim();
  const accentRgb = accentColor ? `rgb(${accentColor})` : '#674EFF';

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-delta-text tracking-tight">Analytics</h1>

      {chartData.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          <ChartCard title="Reach" dataKey="reach" data={chartData} color={accentRgb} />
          <ChartCard title="Saves" dataKey="saves" data={chartData} color="#F59E0B" />
          <ChartCard title="Clicks" dataKey="clicks" data={chartData} color="#3B82F6" />
          <ChartCard title="Score" dataKey="score" data={chartData} color="#8B5CF6" />
        </div>
      ) : (
        <div className="text-center py-24 text-delta-muted">
          <div className="w-16 h-16 rounded-3xl bg-delta-subtle mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl opacity-40">&#128202;</span>
          </div>
          <p className="text-lg font-medium">No completed runs with analytics data yet</p>
        </div>
      )}

      {/* Runs table */}
      {runs.length > 0 && (
        <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-delta-border bg-delta-subtle">
                <th className="text-left px-5 py-3.5 text-xs text-delta-muted uppercase tracking-wider font-semibold">Date</th>
                <th className="text-left px-5 py-3.5 text-xs text-delta-muted uppercase tracking-wider font-semibold">Topic</th>
                <th className="text-right px-5 py-3.5 text-xs text-delta-muted uppercase tracking-wider font-semibold">Reach</th>
                <th className="text-right px-5 py-3.5 text-xs text-delta-muted uppercase tracking-wider font-semibold">Saves</th>
                <th className="text-right px-5 py-3.5 text-xs text-delta-muted uppercase tracking-wider font-semibold">Clicks</th>
                <th className="text-right px-5 py-3.5 text-xs text-delta-muted uppercase tracking-wider font-semibold">Score</th>
                <th className="text-right px-5 py-3.5 text-xs text-delta-muted uppercase tracking-wider font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} className="border-b border-delta-border/50 hover:bg-delta-subtle/50 transition">
                  <td className="px-5 py-3.5 text-delta-muted">
                    {new Date(run.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-5 py-3.5 text-delta-text font-medium">{run.topic || '\u2014'}</td>
                  <td className="px-5 py-3.5 text-right text-delta-text">{run.reach?.toLocaleString() || '\u2014'}</td>
                  <td className="px-5 py-3.5 text-right text-delta-text">{run.saves?.toLocaleString() || '\u2014'}</td>
                  <td className="px-5 py-3.5 text-right text-delta-text">{run.clicks?.toLocaleString() || '\u2014'}</td>
                  <td className="px-5 py-3.5 text-right text-delta-text font-medium">{run.score?.toFixed(2) || '\u2014'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-xs text-delta-muted capitalize bg-delta-subtle px-2 py-0.5 rounded-full">{run.status}</span>
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
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#1E293B' : '#E8EBF0';
  const tickColor = isDark ? '#94A3B8' : '#6B7280';
  const tooltipBg = isDark ? '#111827' : '#FFFFFF';
  const tooltipBorder = isDark ? '#1E293B' : '#E8EBF0';
  const tooltipText = isDark ? '#F1F5F9' : '#1A1D26';

  return (
    <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold text-delta-text">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} />
          <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '12px',
              color: tooltipText,
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 3.5, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
