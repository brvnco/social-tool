interface Props {
  run: any;
  onRefresh: () => void;
  onError: (msg: string) => void;
}

export default function AnalyticsCard({ run, onRefresh, onError }: Props) {
  const lowSaves = run.low_saves === 1;
  const lowReach = run.low_reach === 1;

  let adjustmentNote = '';
  let noteColor = '';

  if (lowSaves && lowReach) {
    adjustmentNote = 'Try a more specific topic with a stronger hook next week';
    noteColor = 'text-red-400';
  } else if (lowSaves) {
    adjustmentNote = 'Good reach but low saves — go deeper on the topic next week';
    noteColor = 'text-amber-400';
  } else if (lowReach) {
    adjustmentNote = 'High saves but low reach — try a broader hook to attract new eyes';
    noteColor = 'text-amber-400';
  } else {
    adjustmentNote = 'Strong week — continue current direction';
    noteColor = 'text-delta-green';
  }

  return (
    <div className="space-y-6">
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <h2 className="font-semibold text-lg mb-4">7-Day Performance</h2>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <MetricBlock label="Reach" value={run.reach || 0} />
          <MetricBlock label="Saves" value={run.saves || 0} low={lowSaves} />
          <MetricBlock label="Clicks" value={run.clicks || 0} />
          <MetricBlock label="Score" value={run.score?.toFixed(2) || '0'} isScore />
        </div>

        {/* Adjustment note */}
        <div className="bg-black/20 rounded-lg p-4">
          <p className={`text-sm font-medium ${noteColor}`}>{adjustmentNote}</p>
        </div>
      </div>

      {/* Low indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-lg p-4 border ${lowReach ? 'border-red-500/30 bg-red-500/5' : 'border-delta-border bg-delta-card'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Reach vs Average</p>
          <p className={`text-lg font-bold mt-1 ${lowReach ? 'text-red-400' : 'text-delta-green'}`}>
            {lowReach ? 'Below average' : 'On track'}
          </p>
        </div>
        <div className={`rounded-lg p-4 border ${lowSaves ? 'border-red-500/30 bg-red-500/5' : 'border-delta-border bg-delta-card'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Saves vs Average</p>
          <p className={`text-lg font-bold mt-1 ${lowSaves ? 'text-red-400' : 'text-delta-green'}`}>
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
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${low ? 'text-red-400' : isScore ? 'text-delta-green' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
