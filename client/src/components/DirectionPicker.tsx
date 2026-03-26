import { useState } from 'react';

interface Direction {
  topic: string;
  angle: string;
  why_now: string;
  delta_feature: string;
  hook: string;
  score: number;
}

interface Props {
  runId: number;
  directions: Direction[];
  onPicked: () => void;
  onError: (msg: string) => void;
}

const FEATURE_COLORS: Record<string, string> = {
  Link: 'text-blue-400 bg-blue-400/10',
  Track: 'text-emerald-400 bg-emerald-400/10',
  Update: 'text-amber-400 bg-amber-400/10',
  Discover: 'text-purple-400 bg-purple-400/10',
};

export default function DirectionPicker({ runId, directions, onPicked, onError }: Props) {
  const [picking, setPicking] = useState(false);

  const pick = async (direction: Direction) => {
    setPicking(true);
    try {
      const res = await fetch(`/api/runs/${runId}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) throw new Error('Failed to pick direction');
      onPicked();
    } catch (err: any) {
      onError(err.message);
    }
    setPicking(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Pick a Direction</h2>
        <p className="text-gray-500 text-sm mt-1">Choose one of these topics to develop into a full brief.</p>
      </div>

      <div className="space-y-3">
        {directions.map((d, i) => (
          <button
            key={i}
            onClick={() => pick(d)}
            disabled={picking}
            className="w-full text-left bg-delta-card border border-delta-border rounded-xl p-5 hover:border-delta-green/40 transition-all group disabled:opacity-50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FEATURE_COLORS[d.delta_feature] || 'text-gray-400 bg-gray-400/10'}`}>
                    {d.delta_feature}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className={`w-2 h-2 rounded-full ${n <= d.score ? 'bg-delta-green' : 'bg-gray-700'}`} />
                    ))}
                  </div>
                </div>
                <h3 className="font-semibold text-white group-hover:text-delta-green transition">{d.topic}</h3>
                <p className="text-sm text-gray-400 mt-1">{d.angle}</p>
                <p className="text-xs text-gray-500 mt-2">{d.why_now}</p>
              </div>
              <div className="shrink-0 pt-6">
                <div className="bg-delta-card border border-delta-border rounded-lg px-3 py-1.5 text-xs text-gray-500 italic max-w-[200px]">
                  "{d.hook}"
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
