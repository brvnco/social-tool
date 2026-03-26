interface Props {
  run: any;
  onRefresh: () => void;
  onError: (msg: string) => void;
}

export default function AnalyticsCard({ run }: Props) {
  const lowSaves = run.low_saves === 1;
  const lowReach = run.low_reach === 1;

  let adjustmentNote = '';
  let noteBg = '';
  let noteText = '';

  if (lowSaves && lowReach) {
    adjustmentNote = 'Try a more specific topic with a stronger hook next week';
    noteBg = 'bg-red-50 border-red-200';
    noteText = 'text-red-700';
  } else if (lowSaves) {
    adjustmentNote = 'Good reach but low saves — go deeper on the topic next week';
    noteBg = 'bg-amber-50 border-amber-200';
    noteText = 'text-amber-700';
  } else if (lowReach) {
    adjustmentNote = 'High saves but low reach — try a broader hook to attract new eyes';
    noteBg = 'bg-amber-50 border-amber-200';
    noteText = 'text-amber-700';
  } else {
    adjustmentNote = 'Strong week — continue current direction';
    noteBg = 'gradient-green border-emerald-200';
    noteText = 'text-emerald-700';
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-card border border-delta-border p-6">
        <h2 className="font-bold text-xl text-delta-text mb-5">7-Day Performance</h2>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <MetricBlock label="Reach" value={run.reach || 0} />
          <MetricBlock label="Saves" value={run.saves || 0} low={lowSaves} />
          <MetricBlock label="Clicks" value={run.clicks || 0} />
          <MetricBlock label="Score" value={run.score?.toFixed(2) || '0'} isScore />
        </div>

        {/* Adjustment note */}
        <div className={`rounded-2xl p-5 border ${noteBg}`}>
          <p className={`text-sm font-semibold ${noteText}`}>{adjustmentNote}</p>
        </div>
      </div>

      {/* Low indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-2xl p-5 border ${lowReach ? 'bg-red-50 border-red-200' : 'gradient-green border-emerald-200'}`}>
          <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Reach vs Average</p>
          <p className={`text-lg font-bold mt-1 ${lowReach ? 'text-red-600' : 'text-emerald-600'}`}>
            {lowReach ? 'Below average' : 'On track'}
          </p>
        </div>
        <div className={`rounded-2xl p-5 border ${lowSaves ? 'bg-red-50 border-red-200' : 'gradient-green border-emerald-200'}`}>
          <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">Saves vs Average</p>
          <p className={`text-lg font-bold mt-1 ${lowSaves ? 'text-red-600' : 'text-emerald-600'}`}>
            {lowSaves ? 'Below average' : 'On track'}
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  low,
  isScore,
}: {
  label: string;
  value: number | string;
  low?: boolean;
  isScore?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 text-center ${
      low ? 'bg-red-50 border border-red-200' :
      isScore ? 'gradient-green border border-emerald-200' :
      'bg-delta-subtle border border-delta-border'
    }`}>
      <p className="text-xs text-delta-muted uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${
        low ? 'text-red-600' : isScore ? 'text-emerald-600' : 'text-delta-text'
      }`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
