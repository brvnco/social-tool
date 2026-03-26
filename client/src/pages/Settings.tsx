import { useEffect, useState } from 'react';

interface HealthEntry {
  present: boolean;
  required: boolean;
}
interface HealthStatus {
  [key: string]: HealthEntry;
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

export default function Settings() {
  const [health, setHealth] = useState<HealthStatus>({});
  const [nodeMap, setNodeMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const triggerResearch = async () => {
    try {
      const res = await fetch('/api/runs', { method: 'POST' });
      const { id } = await res.json();
      window.location.href = `/runs/${id}`;
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Environment variables status */}
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">Environment Variables</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(health).map(([key, entry]) => (
            <div key={key} className="flex items-center gap-2 py-1">
              <span className={`w-2.5 h-2.5 rounded-full ${entry.present ? 'bg-delta-green' : entry.required ? 'bg-red-500' : 'bg-gray-600'}`} />
              <span className="text-sm text-gray-400 font-mono">{key}</span>
              {!entry.required && (
                <span className="text-[10px] text-gray-600 uppercase">optional</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3">Social media tokens (IG, LinkedIn, X) are only needed for post-publish analytics — not for posting.</p>
      </div>

      {/* Figma node ID mapper */}
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Figma Node ID Mapper</h2>
            <p className="text-sm text-gray-500 mt-1">
              Map each slide text field to its Figma node ID. Get node IDs from the Figma file inspector.
            </p>
          </div>
          <button
            onClick={saveNodeMap}
            disabled={saving}
            className="bg-delta-green text-delta-navy font-semibold px-4 py-2 rounded-lg text-sm hover:bg-delta-green/90 disabled:opacity-50"
          >
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="space-y-2">
          {SLIDE_FIELDS.map(field => (
            <div key={field.key} className="flex items-center gap-4">
              <label className="w-48 text-sm text-gray-400 shrink-0">{field.label}</label>
              <input
                type="text"
                value={nodeMap[field.key] || ''}
                onChange={e => setNodeMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder="e.g. 123:456"
                className="flex-1 bg-black/30 border border-delta-border rounded-lg px-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:border-delta-green/50 focus:outline-none font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Manual override */}
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <h2 className="font-semibold mb-2">Manual Override</h2>
        <p className="text-sm text-gray-500 mb-3">Start a new research run immediately</p>
        <button
          onClick={triggerResearch}
          className="bg-delta-green/20 text-delta-green px-4 py-2 rounded-lg text-sm hover:bg-delta-green/30"
        >
          Run Research Now
        </button>
      </div>

      {/* Figma file info */}
      <div className="bg-delta-card border border-delta-border rounded-xl p-5">
        <h2 className="font-semibold mb-2">Figma Template</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">File ID:</span>
            <code className="text-gray-300 bg-black/30 px-2 py-0.5 rounded font-mono text-xs">RiCMWapLKbsuNXcKKqRo27</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Start Node:</span>
            <code className="text-gray-300 bg-black/30 px-2 py-0.5 rounded font-mono text-xs">1-19</code>
          </div>
          <a
            href="https://www.figma.com/design/RiCMWapLKbsuNXcKKqRo27/2025-Socials?node-id=1-19"
            target="_blank"
            rel="noopener noreferrer"
            className="text-delta-green hover:underline inline-block mt-1"
          >
            Open in Figma
          </a>
        </div>
        <div className="mt-3 p-3 bg-black/20 rounded-lg">
          <p className="text-xs text-gray-500">
            <strong>How to get node IDs:</strong> Open the Figma file, select a text layer,
            and check the URL — the node ID appears after <code>node-id=</code>. You can also
            right-click a layer and select "Copy link" to get its node ID.
          </p>
        </div>
      </div>
    </div>
  );
}
