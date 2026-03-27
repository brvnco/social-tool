import { useEffect, useState } from 'react';

interface HealthEntry {
  present: boolean;
  required: boolean;
}
interface HealthStatus {
  [key: string]: HealthEntry;
}

interface ModelOption {
  id: string;
  label: string;
  provider: string;
  supportsWebSearch: boolean;
  costTier: string;
  available: boolean;
}

interface ModelData {
  models: ModelOption[];
  selections: { discover: string; research: string; rewrite: string };
}

const SLIDE_FIELDS = [
  { key: 'slide1_title', label: 'Slide 1 — Title' },
  { key: 'slide1_subtitle', label: 'Slide 1 — Subtitle' },
  { key: 'slide1_description', label: 'Slide 1 — Description' },
  { key: 'slide1_swipe_cta', label: 'Slide 1 — Swipe CTA' },
  { key: 'slide2_title', label: 'Slide 2 — Title' },
  { key: 'slide2_description', label: 'Slide 2 — Description' },
  { key: 'slide3_title', label: 'Slide 3 — Title' },
  { key: 'slide3_description', label: 'Slide 3 — Description' },
  { key: 'slide4_title', label: 'Slide 4 — Title' },
  { key: 'slide4_description', label: 'Slide 4 — Description' },
  { key: 'slide5_title', label: 'Slide 5 — Title' },
  { key: 'slide5_description', label: 'Slide 5 — Description' },
  { key: 'slide6_cta', label: 'Slide 6 — CTA' },
];

const COST_COLORS: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-600',
  medium: 'bg-amber-50 text-amber-600',
  high: 'bg-red-50 text-red-600',
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-50 text-orange-600',
  openai: 'bg-green-50 text-green-700',
  google: 'bg-blue-50 text-blue-600',
};

export default function Settings() {
  const [health, setHealth] = useState<HealthStatus>({});
  const [nodeMap, setNodeMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [modelSaved, setModelSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => setHealth(data.status || {}));

    fetch('/api/settings/figma_node_map')
      .then(r => r.json())
      .then(data => {
        if (data.value) {
          try { setNodeMap(JSON.parse(data.value)); } catch {}
        }
      });

    fetch('/api/models')
      .then(r => r.json())
      .then(setModelData);
  }, []);

  const saveNodeMap = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/figma_node_map', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify(nodeMap) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const setModel = async (phase: string, modelId: string) => {
    try {
      await fetch(`/api/models/${phase}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });
      setModelData(prev => prev ? {
        ...prev,
        selections: { ...prev.selections, [phase]: modelId },
      } : prev);
      setModelSaved(phase);
      setTimeout(() => setModelSaved(null), 1500);
    } catch {}
  };

  const triggerResearch = async () => {
    try {
      const res = await fetch('/api/runs', { method: 'POST' });
      const { id } = await res.json();
      window.location.href = `/runs/${id}`;
    } catch {}
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-delta-text tracking-tight">Settings</h1>

      {/* Model selector */}
      {modelData && (
        <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
          <h2 className="font-bold text-delta-text text-lg mb-2">AI Models</h2>
          <p className="text-sm text-delta-muted mb-6">Choose which model to use for each phase. Add API keys to your .env to enable more providers.</p>

          <div className="space-y-6">
            {([
              { phase: 'discover', label: 'Discover', desc: 'Proposes 3 topic directions' },
              { phase: 'research', label: 'Research', desc: 'Deep research + full brief with web search' },
              { phase: 'rewrite', label: 'Rewrite', desc: 'Revises brief based on feedback' },
            ] as const).map(({ phase, label, desc }) => (
              <div key={phase}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold text-delta-text">{label}</p>
                  <p className="text-xs text-delta-muted">— {desc}</p>
                  {modelSaved === phase && (
                    <span className="text-xs text-emerald-600 font-medium ml-auto">✓ Saved</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {modelData.models.map(model => {
                    const isSelected = modelData.selections[phase] === model.id;
                    const isDisabled = !model.available;

                    return (
                      <button
                        key={model.id}
                        onClick={() => !isDisabled && setModel(phase, model.id)}
                        disabled={isDisabled}
                        className={`text-left rounded-2xl p-3.5 border-2 transition-all ${
                          isSelected
                            ? 'border-delta-green bg-delta-green/5 shadow-sm'
                            : isDisabled
                            ? 'border-delta-border bg-delta-subtle/50 opacity-50 cursor-not-allowed'
                            : 'border-delta-border bg-delta-card hover:border-delta-green/30 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-sm text-delta-text">{model.label}</span>
                          <div className="flex gap-1.5">
                            {model.supportsWebSearch && (
                              <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-medium">🔍 Search</span>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${COST_COLORS[model.costTier]}`}>
                              {model.costTier === 'low' ? '$' : model.costTier === 'medium' ? '$$' : '$$$'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${PROVIDER_COLORS[model.provider]}`}>
                            {model.provider}
                          </span>
                          {isDisabled && (
                            <span className="text-[10px] text-red-500 font-medium">No API key</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment variables */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
        <h2 className="font-bold text-delta-text text-lg mb-5">Environment Variables</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(health).map(([key, entry]) => (
            <div key={key} className={`flex items-center gap-3 py-2.5 px-4 rounded-xl ${entry.present ? 'bg-emerald-50' : entry.required ? 'bg-red-50' : 'bg-delta-subtle'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${entry.present ? 'bg-emerald-500' : entry.required ? 'bg-red-500' : 'bg-gray-300'}`} />
              <span className="text-sm text-delta-text font-mono">{key}</span>
              {!entry.required && (
                <span className="text-[10px] text-delta-muted uppercase ml-auto font-medium">optional</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-delta-muted mt-4">Add OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY to enable more models.</p>
      </div>

      {/* Figma node ID mapper */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-delta-text text-lg">Figma Node ID Mapper</h2>
            <p className="text-sm text-delta-muted mt-1">
              Map each slide text field to its Figma node ID.
            </p>
          </div>
          <button
            onClick={saveNodeMap}
            disabled={saving}
            className="bg-delta-green text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:shadow-glow transition disabled:opacity-50"
          >
            {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="space-y-2">
          {SLIDE_FIELDS.map(field => (
            <div key={field.key} className="flex items-center gap-4">
              <label className="w-52 text-sm text-delta-muted shrink-0 font-medium">{field.label}</label>
              <input
                type="text"
                value={nodeMap[field.key] || ''}
                onChange={e => setNodeMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder="e.g. 123:456"
                className="flex-1 bg-delta-subtle border border-delta-border rounded-xl px-4 py-2 text-sm text-delta-text placeholder-delta-muted/40 font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Manual override */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
        <h2 className="font-bold text-delta-text text-lg mb-2">Manual Override</h2>
        <p className="text-sm text-delta-muted mb-4">Start a new research run immediately</p>
        <button
          onClick={triggerResearch}
          className="bg-delta-green/10 text-delta-green px-5 py-2.5 rounded-xl text-sm hover:bg-delta-green/20 font-semibold transition"
        >
          Run Research Now
        </button>
      </div>

      {/* Figma file info */}
      <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6">
        <h2 className="font-bold text-delta-text text-lg mb-4">Figma Template</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-delta-muted font-medium">File ID:</span>
            <code className="text-delta-text bg-delta-subtle px-3 py-1 rounded-lg font-mono text-xs">RiCMWapLKbsuNXcKKqRo27</code>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-delta-muted font-medium">Start Node:</span>
            <code className="text-delta-text bg-delta-subtle px-3 py-1 rounded-lg font-mono text-xs">1-19</code>
          </div>
          <a
            href="https://www.figma.com/design/RiCMWapLKbsuNXcKKqRo27/2025-Socials?node-id=1-19"
            target="_blank"
            rel="noopener noreferrer"
            className="text-delta-green hover:text-delta-green font-semibold inline-block mt-1 transition"
          >
            Open in Figma →
          </a>
        </div>
        <div className="mt-4 p-4 bg-delta-subtle rounded-2xl border border-delta-border">
          <p className="text-xs text-delta-muted">
            <strong className="text-delta-text">How to get node IDs:</strong> Open the Figma file, select a text layer,
            and check the URL — the node ID appears after <code className="bg-delta-subtle px-1 rounded">node-id=</code>. Replace the dash with a colon (e.g. <code className="bg-delta-subtle px-1 rounded">6-1095</code> → <code className="bg-delta-subtle px-1 rounded">6:1095</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
