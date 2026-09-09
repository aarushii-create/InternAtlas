import React, { useState, useEffect } from 'react';
import {
  Target,
  Sliders,
  MapPin,
  Building,
  Shield,
  Bell,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';
import { UserPreferences } from '../../types';

interface TargetPreferencesViewProps {
  initialPreferences?: UserPreferences;
  onSaved?: () => void;
}

export const TargetPreferencesView: React.FC<TargetPreferencesViewProps> = ({
  initialPreferences,
  onSaved,
}) => {
  const [prefs, setPrefs] = useState<UserPreferences>({
    id: 'pref-alex-rivera',
    userId: 'user-alex-rivera-1',
    tenantId: 'tenant-alex-rivera',
    targetLocations: ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Remote'],
    targetRoles: ['Systems Engineer Intern', 'Quantitative Developer Intern', 'AI / ML Engineer Intern', 'Software Engineer Intern'],
    preferredCompanies: ['Citadel Securities', 'Jane Street', 'OpenAI', 'Anthropic', 'Databricks', 'Two Sigma', 'Stripe'],
    blacklistedCompanies: ['CryptoGambling Inc', 'SpamCorp'],
    customMatchThreshold: 0.72,
    alertMethod: 'telegram',
    alertDestination: '@alex_rivera_scout_bot',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New item inputs
  const [newLocation, setNewLocation] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPreferred, setNewPreferred] = useState('');
  const [newBlacklist, setNewBlacklist] = useState('');

  useEffect(() => {
    if (initialPreferences) {
      setPrefs(initialPreferences);
    } else {
      fetchPreferences();
    }
  }, [initialPreferences]);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/dashboard/overview');
      if (res.ok) {
        const payload = await res.json();
        if (payload.targetParameters) {
          setPrefs(payload.targetParameters);
        }
      }
    } catch {
      // Keep defaults
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccessMsg(null);
      const res = await fetch('/api/dashboard/target-parameters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setSuccessMsg('Target preferences and alerting threshold saved successfully!');
        if (onSaved) onSaved();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      alert('Failed to save target preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = () => {
    if (!newLocation.trim()) return;
    setPrefs((p) => ({ ...p, targetLocations: [...(p.targetLocations || []), newLocation.trim()] }));
    setNewLocation('');
  };

  const handleRemoveLocation = (index: number) => {
    setPrefs((p) => ({
      ...p,
      targetLocations: p.targetLocations.filter((_, i) => i !== index),
    }));
  };

  const handleAddRole = () => {
    if (!newRole.trim()) return;
    setPrefs((p) => ({ ...p, targetRoles: [...(p.targetRoles || []), newRole.trim()] }));
    setNewRole('');
  };

  const handleRemoveRole = (index: number) => {
    setPrefs((p) => ({
      ...p,
      targetRoles: p.targetRoles.filter((_, i) => i !== index),
    }));
  };

  const handleAddPreferred = () => {
    if (!newPreferred.trim()) return;
    setPrefs((p) => ({ ...p, preferredCompanies: [...(p.preferredCompanies || []), newPreferred.trim()] }));
    setNewPreferred('');
  };

  const handleRemovePreferred = (index: number) => {
    setPrefs((p) => ({
      ...p,
      preferredCompanies: p.preferredCompanies.filter((_, i) => i !== index),
    }));
  };

  const handleAddBlacklist = () => {
    if (!newBlacklist.trim()) return;
    setPrefs((p) => ({ ...p, blacklistedCompanies: [...(p.blacklistedCompanies || []), newBlacklist.trim()] }));
    setNewBlacklist('');
  };

  const handleRemoveBlacklist = (index: number) => {
    setPrefs((p) => ({
      ...p,
      blacklistedCompanies: p.blacklistedCompanies.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Target Candidate Preferences & Filters
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Define role criteria, location boundaries, threshold alerts, and company preference whitelists/blacklists.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Threshold Slider Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Minimum Composite Match Threshold</h3>
          </div>
          <span className="text-base font-black text-indigo-400">
            {(prefs.customMatchThreshold * 100).toFixed(0)}% Fit
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Only internship postings scoring above this deterministic mathematical threshold will trigger instant Telegram &amp; Email alerts.
        </p>

        <div className="space-y-2 pt-2">
          <input
            type="range"
            min="0.50"
            max="0.95"
            step="0.01"
            value={prefs.customMatchThreshold}
            onChange={(e) => setPrefs({ ...prefs, customMatchThreshold: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>50% (Broad Ingestion)</span>
            <span>70% (Recommended)</span>
            <span>85% (Selective)</span>
            <span>95% (Exact Match)</span>
          </div>
        </div>
      </div>

      {/* Target Roles & Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Roles */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Target Roles & Specializations
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {prefs.targetRoles?.length || 0} active
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
              placeholder="e.g. Quantitative Systems Engineer"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddRole}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {prefs.targetRoles?.map((role, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-2"
              >
                <span>{role}</span>
                <button
                  onClick={() => handleRemoveRole(idx)}
                  className="hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Target Locations */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Target Locations
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {prefs.targetLocations?.length || 0} active
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              placeholder="e.g. San Francisco, CA or Remote"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddLocation}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {prefs.targetLocations?.map((loc, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-2"
              >
                <span>{loc}</span>
                <button
                  onClick={() => handleRemoveLocation(idx)}
                  className="hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Preferred Whitelist & Blacklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preferred Whitelist */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-400" />
              Preferred Companies (Boost Multiplier)
            </h3>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newPreferred}
              onChange={(e) => setNewPreferred(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPreferred()}
              placeholder="e.g. Citadel, OpenAI"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddPreferred}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {prefs.preferredCompanies?.map((comp, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-2"
              >
                <span>{comp}</span>
                <button
                  onClick={() => handleRemovePreferred(idx)}
                  className="hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Blacklisted Companies */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              Blacklisted Companies (Hard Disqualification)
            </h3>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newBlacklist}
              onChange={(e) => setNewBlacklist(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBlacklist()}
              placeholder="e.g. CryptoGambling Inc"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddBlacklist}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {prefs.blacklistedCompanies?.map((comp, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-2"
              >
                <span>{comp}</span>
                <button
                  onClick={() => handleRemoveBlacklist(idx)}
                  className="hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
