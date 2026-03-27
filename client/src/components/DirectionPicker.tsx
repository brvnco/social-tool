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

const FEATURE_COLORS: Record<string, { bg: string; text: string }> = {
  Link: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' },
  Track: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  Update: { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400' },
  Discover: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
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
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-xl text-delta-text">Pick a Direction</h2>
        <p className="text-delta-muted mt-1">Choose one of these topics to develop into a full brief.</p>
      </div>

      <div className="space-y-4">
        {directions.map((d, i) => {
          const colors = FEATURE_COLORS[d.delta_feature] || { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };

          return (
            <button
              key={i}
              onClick={() => pick(d)}
              disabled={picking}
              className="w-full text-left bg-delta-card rounded-3xl shadow-card border border-delta-border p-6 hover:shadow-card-hover hover:border-delta-green/30 transition-all group disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${colors.bg} ${colors.text}`}>
                      {d.delta_feature}
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} className={`w-2 h-2 rounded-full ${n <= d.score ? 'bg-delta-green' : 'bg-delta-border'}`} />
                      ))}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-delta-text group-hover:text-delta-green transition">
                    {d.topic}
                  </h3>
                  <p className="text-delta-muted mt-1">{d.angle}</p>
                  <p className="text-delta-muted/60 text-sm mt-2">{d.why_now}</p>
                </div>
                <div className="shrink-0 pt-6">
                  <div className="bg-delta-subtle rounded-2xl px-4 py-2 text-sm text-delta-muted italic max-w-[220px]">
                    "{d.hook}"
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
