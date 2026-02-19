
import React, { useEffect, useRef } from 'react';
import { SimulationLog } from '../types';

interface LogViewerProps {
  logs: SimulationLog[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black/40 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-[300px]">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Database & System Logs</h3>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-[10px] text-slate-500">REALTIME STREAM</span>
        </span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px]"
      >
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-3">
            <span className="text-slate-500 whitespace-nowrap">
              [{new Date(log.timestamp).toLocaleTimeString()}]
            </span>
            <span className={`font-bold w-16 ${
              log.type === 'ERROR' || log.type === 'DEADLOCK' ? 'text-red-400' :
              log.type === 'SUCCESS' ? 'text-green-400' :
              log.type === 'DB_LOCK' ? 'text-amber-400' : 'text-blue-400'
            }`}>
              {log.type}
            </span>
            <div className="flex-1">
              <p className="text-slate-300">{log.message}</p>
              {log.sql && (
                <div className="mt-1 p-2 bg-slate-900/50 rounded border border-slate-800 text-indigo-300 italic">
                  SQL: {log.sql}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogViewer;
