import { useEffect, useRef, useState } from 'react';

interface Props {
  runId: number;
  onComplete: () => void;
  onError: (msg: string) => void;
}

interface LogEntry {
  type: string;
  message?: string;
  query?: string;
  topic?: string;
  score?: number;
  data?: any;
  timestamp: number;
}

export default function ResearchPanel({ runId, onComplete, onError }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/research/${runId}/stream`);
    setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const entry: LogEntry = { ...data, timestamp: Date.now() };
        setLogs(prev => [...prev, entry]);

        if (data.type === 'complete') {
          es.close();
          setConnected(false);
          setTimeout(onComplete, 500);
        }

        if (data.type === 'error') {
          setError(data.message);
          es.close();
          setConnected(false);
          onError(data.message);
        }
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => es.close();
  }, [runId, onComplete, onError]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const retry = () => {
    setError(null);
    setLogs([]);
    window.location.reload();
  };

  return (
    <div className="bg-delta-card border border-delta-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Research in Progress</h2>
        {connected && (
          <span className="flex items-center gap-2 text-sm text-delta-green">
            <span className="w-2 h-2 rounded-full bg-delta-green animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div
        ref={logRef}
        className="bg-black/30 rounded-lg p-4 font-mono text-sm h-80 overflow-y-auto scrollbar-thin space-y-1"
      >
        {logs.map((entry, i) => (
          <LogLine key={i} entry={entry} isOld={i < logs.length - 5} />
        ))}
        {logs.length === 0 && connected && (
          <p className="text-gray-600 animate-pulse">Connecting to Claude...</p>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={retry}
            className="text-sm bg-red-500/20 text-red-300 px-3 py-1 rounded hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function LogLine({ entry, isOld }: { entry: LogEntry; isOld: boolean }) {
  const opacity = isOld ? 'opacity-50' : 'opacity-100';

  switch (entry.type) {
    case 'status':
      return <p className={`text-gray-400 ${opacity}`}>→ {entry.message}</p>;
    case 'search':
      return (
        <p className={`text-blue-400 ${opacity}`}>
          🔍 {entry.query}
        </p>
      );
    case 'candidate':
      return (
        <p className={`text-amber-400 ${opacity}`}>
          📋 Topic: {entry.topic} (score: {entry.score}/5)
        </p>
      );
    case 'brief':
      return (
        <p className={`text-delta-green ${opacity}`}>
          ✅ Brief generated: {entry.data?.topic}
        </p>
      );
    case 'complete':
      return <p className="text-delta-green font-semibold">✓ Research complete</p>;
    case 'error':
      return <p className="text-red-400">✗ Error: {entry.message}</p>;
    default:
      return <p className={`text-gray-500 ${opacity}`}>{JSON.stringify(entry)}</p>;
  }
}
