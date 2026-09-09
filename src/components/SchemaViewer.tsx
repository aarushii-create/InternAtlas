import React, { useState, useEffect } from 'react';
import {
  Database,
  Code2,
  FileCode,
  Play,
  RotateCcw,
  CheckCircle2,
  Key,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Download,
} from 'lucide-react';
import { SCHEMA_NODES, SCHEMA_RELATIONSHIPS } from '../db/erDiagram';

interface SchemaViewerProps {
  onRunMigration: () => Promise<void>;
  onSeedData: () => Promise<void>;
}

export const SchemaViewer: React.FC<SchemaViewerProps> = ({
  onRunMigration,
  onSeedData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'er' | 'sql' | 'drizzle' | 'seed'>('er');
  const [sqlSchema, setSqlSchema] = useState<string>('Loading SQL migration script...');
  const [sqlSeed, setSqlSeed] = useState<string>('Loading Seed SQL script...');
  const [drizzleCode, setDrizzleCode] = useState<string>('Loading Drizzle ORM code...');
  const [loadingSchema, setLoadingSchema] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('user_preferences');
  const [actionLog, setActionLog] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    fetchSchemaData();
  }, []);

  const fetchSchemaData = async () => {
    try {
      setLoadingSchema(true);
      const res = await fetch('/api/db/schema');
      if (res.ok) {
        const data = await res.json();
        setSqlSchema(data.sqlSchema || '');
        setSqlSeed(data.sqlSeed || '');
        setDrizzleCode(data.drizzleCode || '');
      }
    } catch (err) {
      console.error('Error fetching schema code:', err);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleMigrationClick = async () => {
    setIsProcessing(true);
    setActionLog('Executing migration script: 0000_initial_schema.sql...');
    try {
      await onRunMigration();
      setActionLog('SUCCESS: Migration executed! Tables, Indexes, pgvector extension & Multi-Tenant Keys verified.');
    } catch (err: any) {
      setActionLog(`ERROR: Migration failed - ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeedClick = async () => {
    setIsProcessing(true);
    setActionLog('Executing seed script: 0001_seed_data.sql...');
    try {
      await onSeedData();
      setActionLog('SUCCESS: Database reset & multi-tenant seed data populated successfully!');
    } catch (err: any) {
      setActionLog(`ERROR: Seeding failed - ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedNode = SCHEMA_NODES.find((n) => n.id === selectedNodeId);

  return (
    <div className="space-y-6">
      {/* Top Controls & Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Phase 1 Database Schema & Multi-Tenant Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Relational Drizzle Schema &bull; pgvector (768d) Vector Embeddings &bull; Partition Keys
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('er')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'er'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ER Diagram</span>
          </button>
          <button
            onClick={() => setActiveSubTab('drizzle')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'drizzle'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Drizzle TS Schema</span>
          </button>
          <button
            onClick={() => setActiveSubTab('sql')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'sql'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>SQL Migration DDL</span>
          </button>
          <button
            onClick={() => setActiveSubTab('seed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'seed'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seed SQL</span>
          </button>
        </div>
      </div>

      {/* Action Buttons & Execution Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleMigrationClick}
            disabled={isProcessing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run SQL Migration</span>
          </button>
          <button
            onClick={handleSeedClick}
            disabled={isProcessing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset & Seed DB</span>
          </button>
        </div>

        {actionLog && (
          <div className="flex items-center space-x-2 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-300 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>{actionLog}</span>
          </div>
        )}
      </div>

      {/* Sub-Tab Content */}
      {activeSubTab === 'er' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ER Nodes Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Schema Entity Tables ({SCHEMA_NODES.length})
                </h3>
                <span className="text-xs text-slate-400">Click a table node to inspect schema details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SCHEMA_NODES.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-slate-800 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Top Header Bar with Accent Gradient */}
                      <div className={`h-1 w-full absolute top-0 left-0 bg-gradient-to-r ${node.color}`} />

                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-slate-100 text-sm">
                          {node.tableName}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800">
                          {node.columns.length} columns
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{node.description}</p>

                      {/* Key Column Tags Preview */}
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                        {node.columns.map((col) => (
                          <span
                            key={col.name}
                            className={`px-1.5 py-0.5 rounded border ${
                              col.isPrimary
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold'
                                : col.isTenantKey
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-bold'
                                : col.isVector
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                                : col.isForeign
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {col.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Foreign Key Relationships Map */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyan-400" />
                Foreign Key & Multi-Tenant Partition Map ({SCHEMA_RELATIONSHIPS.length} Relations)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                {SCHEMA_RELATIONSHIPS.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-slate-300"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="text-indigo-400 font-semibold">{rel.fromTable}</span>
                      <span className="text-slate-500">({rel.fromColumn})</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                      <span>{rel.relationshipType}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-emerald-400 font-semibold">{rel.toTable}</span>
                      <span className="text-slate-500">({rel.toColumn})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Table Inspector Column */}
          <div className="space-y-4">
            {selectedNode ? (
              <div className="bg-slate-900 p-5 rounded-2xl border border-indigo-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                      Table Inspector
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 font-mono">
                      {selectedNode.tableName}
                    </h3>
                  </div>
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${selectedNode.color}`}>
                    <Database className="w-5 h-5 text-white" />
                  </div>
                </div>

                <p className="text-xs text-slate-300">{selectedNode.description}</p>

                {/* Column Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Columns & Data Types
                  </h4>

                  <div className="divide-y divide-slate-800/80 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                    {selectedNode.columns.map((col) => (
                      <div key={col.name} className="py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          {col.isPrimary && <Key className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                          {col.isTenantKey && (
                            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          )}
                          <span className="font-semibold text-slate-200 truncate">{col.name}</span>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                              col.isVector
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : col.isPrimary
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : col.isTenantKey
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {col.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend explanation */}
                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>Primary Key (UUID)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-3 h-3 text-indigo-400" />
                    <span>Multi-Tenant Partition Key (tenant_id)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Vector Extension (768-dim pgvector)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                Select a table from the ER grid to view detailed column specifications.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Code Editors Sub-Tabs */}
      {activeSubTab === 'drizzle' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-slate-200 font-mono">
                /src/db/schema.ts &bull; Drizzle ORM (PostgreSQL)
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(drizzleCode)}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
            >
              Copy Code
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-slate-300 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800/80 max-h-[600px] overflow-y-auto">
            {drizzleCode}
          </pre>
        </div>
      )}

      {activeSubTab === 'sql' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-slate-200 font-mono">
                /src/db/migrations/0000_initial_schema.sql &bull; Raw PostgreSQL DDL
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(sqlSchema)}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
            >
              Copy SQL
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-emerald-400/90 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800/80 max-h-[600px] overflow-y-auto">
            {sqlSchema}
          </pre>
        </div>
      )}

      {activeSubTab === 'seed' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-slate-200 font-mono">
                /src/db/migrations/0001_seed_data.sql &bull; Multi-Tenant Seed Script
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(sqlSeed)}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
            >
              Copy Seed SQL
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-cyan-300/90 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800/80 max-h-[600px] overflow-y-auto">
            {sqlSeed}
          </pre>
        </div>
      )}
    </div>
  );
};
