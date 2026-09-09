import React, { useState } from 'react';
import { Terminal, Play, Send, CheckCircle2, Code2 } from 'lucide-react';
import { TenantContext } from '../types';

interface ApiPlaygroundProps {
  currentTenant: TenantContext;
}

export const ApiPlayground: React.FC<ApiPlaygroundProps> = ({ currentTenant }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/db/stats');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [requestBody, setRequestBody] = useState<string>('{\n  "tenantId": "tenant-alex-rivera"\n}');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responsePayload, setResponsePayload] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const presets = [
    { label: 'DB Stats & Migration Status', method: 'GET', url: '/api/db/stats', body: '' },
    { label: 'Export Schema DDL & Drizzle Code', method: 'GET', url: '/api/db/schema', body: '' },
    { label: 'Get Users (Tenant Filtered)', method: 'GET', url: `/api/users?tenantId=${currentTenant.tenantId}`, body: '' },
    { label: 'Get Job Postings', method: 'GET', url: '/api/jobs', body: '' },
    { label: 'Get 2-Layer Match Evaluation Results', method: 'GET', url: `/api/matches?tenantId=${currentTenant.tenantId}`, body: '' },
    { label: 'Test Vector Cosine Similarity', method: 'POST', url: '/api/vectors/similarity', body: JSON.stringify({ resumeText: 'Python C++ Distributed Systems', jobText: 'Goldman Sachs C++ Dynamic Programming' }, null, 2) },
  ];

  const handleRunApi = async () => {
    setLoading(true);
    setResponsePayload(null);
    setResponseStatus(null);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (method === 'POST') {
        options.body = requestBody;
      }

      const res = await fetch(selectedEndpoint, options);
      setResponseStatus(res.status);
      const data = await res.json();
      setResponsePayload(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseStatus(500);
      setResponsePayload(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Phase 1 REST API Tester</h2>
            <p className="text-xs text-slate-400">
              Direct interactive client for database management, user preferences, and vector endpoints.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Buttons Bar */}
      <div className="flex flex-wrap gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-xs">
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSelectedEndpoint(p.url);
              setMethod(p.method as any);
              if (p.body) setRequestBody(p.body);
            }}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              selectedEndpoint === p.url
                ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Request Bar & Body */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex gap-3">
          <select
            value={method}
            onChange={(e: any) => setMethod(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-indigo-400 font-mono font-bold text-xs rounded-xl px-3 py-2"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            type="text"
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />

          <button
            onClick={handleRunApi}
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Sending...' : 'Send Request'}</span>
          </button>
        </div>

        {method !== 'GET' && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase font-mono">
              JSON Request Body
            </label>
            <textarea
              rows={4}
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs p-3 rounded-xl leading-relaxed focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Response Display */}
      {responsePayload && (
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" /> Response Output Payload
            </span>
            <span
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded ${
                responseStatus === 200 || responseStatus === 201
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              HTTP {responseStatus}
            </span>
          </div>

          <pre className="p-4 bg-slate-950 text-emerald-300 rounded-xl font-mono text-xs leading-relaxed border border-slate-800 max-h-96 overflow-y-auto">
            {responsePayload}
          </pre>
        </div>
      )}
    </div>
  );
};
