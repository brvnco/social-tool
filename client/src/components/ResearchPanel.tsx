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
  delta?: string;
  data?: any;
  timestamp: number;
}

export default function ResearchPanel({ runId, onComplete, onError }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [streamedText, setStreamedText] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/research/${runId}/stream`);
    setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'text-delta') {
          setStreamedText(prev => prev + data.delta);
          return;
        }

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
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [streamedText]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const retry = () => {
    setError(null);
    setLogs([]);
    setStreamedText('');
    window.location.reload();
  };

  const statusLogs = logs.filter(l => l.type !== 'text-delta');

  return (
    <div className="bg-delta-card rounded-3xl shadow-card border border-delta-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-delta-text">Research in Progress</h2>
        {connected && (
          <span className="flex items-center gap-2 text-sm text-delta-accent font-medium">
            <span className="w-2 h-2 rounded-full bg-delta-accent animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Status & search log */}
      <div
        ref={logRef}
        className="bg-delta-subtle rounded-2xl p-4 font-mono text-sm max-h-40 overflow-y-auto scrollbar-thin space-y-1.5"
      >
        {statusLogs.map((entry, i) => (
          <LogLine key={i} entry={entry} isOld={i < statusLogs.length - 3} />
        ))}
        {statusLogs.length === 0 && connected && (
          <p className="text-delta-muted animate-pulse">Connecting to Claude...</p>
        )}
      </div>

      {/* Live streaming text */}
      {streamedText && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-delta-text">AI Response</h3>
            {connected && (
              <span className="text-xs text-delta-muted animate-pulse">streaming...</span>
            )}
          </div>
          <div
            ref={textRef}
            className="bg-delta-subtle rounded-2xl p-5 font-mono text-xs h-64 overflow-y-auto scrollbar-thin border border-delta-border text-delta-text whitespace-pre-wrap break-words"
          >
            {streamedText}
            {connected && <span className="inline-block w-1.5 h-4 bg-delta-accent animate-pulse ml-0.5 align-text-bottom" />}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={retry}
            className="text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-4 py-1.5 rounded-xl hover:bg-red-200 dark:hover:bg-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function LogLine({ entry, isOld }: { entry: LogEntry; isOld: boolean }) {
  const opacity = isOld ? 'opacity-40' : 'opacity-100';

  switch (entry.type) {
    case 'status':
      return <p className={`text-delta-muted ${opacity}`}>{entry.message}</p>;
    case 'search':
      return (
        <p className={`text-blue-600 dark:text-blue-400 ${opacity}`}>
          Search: {entry.query}
        </p>
      );
    case 'candidate':
      return (
        <p className={`text-amber-600 dark:text-amber-400 ${opacity}`}>
          Topic: {entry.topic} (score: {entry.score}/5)
        </p>
      );
    case 'brief':
      return (
        <p className={`text-emerald-600 dark:text-emerald-400 ${opacity}`}>
          Brief generated: {entry.data?.topic}
        </p>
      );
    case 'complete':
      return <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Research complete</p>;
    case 'error':
      return <p className="text-red-600 dark:text-red-400">Error: {entry.message}</p>;
    default:
      return <p className={`text-delta-muted ${opacity}`}>{JSON.stringify(entry)}</p>;
  }
}
