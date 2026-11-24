import React, { useEffect, useState } from 'react';
import { CompanyKnowledgeChunk } from '../../types';

interface KnowledgeListResponse {
  totalChunks: number;
  chunks: CompanyKnowledgeChunk[];
}

interface KnowledgeQueryResponse {
  totalRetrieved: number;
  searchResults: {
    chunk: CompanyKnowledgeChunk;
    similarityScore: number;
    matchedKeywords: string[];
  }[];
}

export const CompanyVectorKnowledgeBase: React.FC = () => {
  const [chunks, setChunks] = useState<CompanyKnowledgeChunk[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeQueryResponse['searchResults']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChunks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rag/layer2/chunks');
      if (!response.ok) throw new Error(`Loading company knowledge failed (HTTP ${response.status}).`);
      const result = (await response.json()) as KnowledgeListResponse;
      setChunks(result.chunks);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load company knowledge.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChunks();
  }, []);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rag/layer2/chunks/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), topK: 8, synthesizeLlm: false }),
      });
      if (!response.ok) throw new Error(`Knowledge search failed (HTTP ${response.status}).`);
      const result = (await response.json()) as KnowledgeQueryResponse;
      setSearchResults(result.searchResults);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Unable to search company knowledge.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">Company Knowledge Base</h3>
          <p className="text-xs text-slate-400">
            Search seeded company-insight chunks using the project’s local vector matching.
          </p>
        </div>
        <button type="button" onClick={() => void loadChunks()} disabled={loading} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-50">
          Refresh ({chunks.length})
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company interview or hiring information" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
        <button type="submit" disabled={loading || !query.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Search
        </button>
      </form>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {loading && <p className="text-xs text-slate-400">Loading…</p>}

      {(searchResults.length > 0 ? searchResults.map((result) => result.chunk) : chunks.slice(0, 12)).map((chunk) => (
        <article key={chunk.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">{chunk.company}: {chunk.title}</h4>
            <span className="rounded-md bg-slate-800 px-2 py-1 text-[10px] uppercase text-slate-300">
              {chunk.category}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">{chunk.content}</p>
          <p className="mt-2 text-[10px] text-slate-500">
            {chunk.source.replaceAll('_', ' ')} · {chunk.confidence} confidence
          </p>
        </article>
      ))}
      {!loading && !error && chunks.length === 0 && (
        <p className="text-sm text-slate-400">No company knowledge chunks are available.</p>
      )}
    </section>
  );
};
