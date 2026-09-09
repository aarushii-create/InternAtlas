import React, { useState, useEffect } from 'react';
import {
  Sliders,
  MapPin,
  Briefcase,
  Building,
  Ban,
  BellRing,
  Save,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Code,
} from 'lucide-react';
import { TenantContext, UserPreferences } from '../types';

interface PreferencesEditorProps {
  currentTenant: TenantContext;
}

export const PreferencesEditor: React.FC<PreferencesEditorProps> = ({ currentTenant }) => {
  const [pref, setPref] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Form local state
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocationInput, setNewLocationInput] = useState<string>('');

  const [roles, setRoles] = useState<string[]>([]);
  const [newRoleInput, setNewRoleInput] = useState<string>('');

  const [preferredCompanies, setPreferredCompanies] = useState<string[]>([]);
  const [newPrefCompanyInput, setNewPrefCompanyInput] = useState<string>('');

  const [blacklistedCompanies, setBlacklistedCompanies] = useState<string[]>([]);
  const [newBlacklistCompanyInput, setNewBlacklistCompanyInput] = useState<string>('');

  const [threshold, setThreshold] = useState<number>(0.75); // 75%
  const [alertMethod, setAlertMethod] = useState<'email' | 'telegram' | 'webhook'>('email');
  const [alertDestination, setAlertDestination] = useState<string>('');

  useEffect(() => {
    fetchUserPreferences();
  }, [currentTenant]);

  const fetchUserPreferences = async () => {
    setLoading(true);
    setSaveMessage(null);
    try {
      // First get user ID for current tenant
      const usersRes = await fetch(`/api/users?tenantId=${currentTenant.tenantId}`);
      if (usersRes.ok) {
        const users = await usersRes.json();
        if (users.length > 0) {
          const user = users[0];
          const prefRes = await fetch(`/api/preferences?userId=${user.id}&tenantId=${currentTenant.tenantId}`);
          if (prefRes.ok) {
            const data = await prefRes.json();
            setPref(data);
            setLocations(data.targetLocations || []);
            setRoles(data.targetRoles || []);
            setPreferredCompanies(data.preferredCompanies || []);
            setBlacklistedCompanies(data.blacklistedCompanies || []);
            setThreshold(data.customMatchThreshold ?? 0.75);
            setAlertMethod(data.alertMethod || 'email');
            setAlertDestination(data.alertDestination || user.email);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pref) return;

    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pref.userId,
          tenantId: currentTenant.tenantId,
          targetLocations: locations,
          targetRoles: roles,
          preferredCompanies,
          blacklistedCompanies,
          customMatchThreshold: threshold,
          alertMethod,
          alertDestination,
          isActive: true,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPref(updated);
        setSaveMessage('Strict UserPreferences saved to database!');
        setTimeout(() => setSaveMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const addPill = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!input.trim()) return;
    if (!list.includes(input.trim())) {
      setList([...list, input.trim()]);
    }
    setInput('');
  };

  const removePill = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    itemToRemove: string
  ) => {
    setList(list.filter((i) => i !== itemToRemove));
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading tenant user preferences...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Preferences Form */}
      <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Tenant Target Preferences & Match Thresholds
                </h2>
                <p className="text-xs text-slate-400">
                  Strict schema storage for locations, roles, preferred companies, and cutoffs.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>

          {saveMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* 1. Target Locations */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Target Locations
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. San Francisco, CA or Remote"
                value={newLocationInput}
                onChange={(e) => setNewLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPill(locations, setLocations, newLocationInput, setNewLocationInput))}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addPill(locations, setLocations, newLocationInput, setNewLocationInput)}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl cursor-pointer"
              >
                Add Location
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {locations.map((loc) => (
                <span
                  key={loc}
                  className="px-2.5 py-1 rounded-lg text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5"
                >
                  <span>{loc}</span>
                  <button
                    type="button"
                    onClick={() => removePill(locations, setLocations, loc)}
                    className="hover:text-red-400 font-bold ml-1 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 2. Target Roles */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Target Roles
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Software Engineering Intern"
                value={newRoleInput}
                onChange={(e) => setNewRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPill(roles, setRoles, newRoleInput, setNewRoleInput))}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addPill(roles, setRoles, newRoleInput, setNewRoleInput)}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl cursor-pointer"
              >
                Add Role
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {roles.map((r) => (
                <span
                  key={r}
                  className="px-2.5 py-1 rounded-lg text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5"
                >
                  <span>{r}</span>
                  <button
                    type="button"
                    onClick={() => removePill(roles, setRoles, r)}
                    className="hover:text-red-400 font-bold ml-1 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 3. Preferred Companies & Blacklisted Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preferred Companies */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-amber-400" />
                Preferred Companies (Priority Boost)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Goldman Sachs, Stripe"
                  value={newPrefCompanyInput}
                  onChange={(e) => setNewPrefCompanyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPill(preferredCompanies, setPreferredCompanies, newPrefCompanyInput, setNewPrefCompanyInput))}
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addPill(preferredCompanies, setPreferredCompanies, newPrefCompanyInput, setNewPrefCompanyInput)}
                  className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preferredCompanies.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => removePill(preferredCompanies, setPreferredCompanies, c)}
                      className="hover:text-red-400 ml-1 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Blacklisted Companies */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-400" />
                Blacklisted Companies (Strict Filter)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. LowPay Agency"
                  value={newBlacklistCompanyInput}
                  onChange={(e) => setNewBlacklistCompanyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPill(blacklistedCompanies, setBlacklistedCompanies, newBlacklistCompanyInput, setNewBlacklistCompanyInput))}
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addPill(blacklistedCompanies, setBlacklistedCompanies, newBlacklistCompanyInput, setNewBlacklistCompanyInput)}
                  className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {blacklistedCompanies.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-lg text-xs bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => removePill(blacklistedCompanies, setBlacklistedCompanies, c)}
                      className="hover:text-red-400 ml-1 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Match Threshold Slider */}
          <div className="space-y-3 p-4 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Custom Match Alert Threshold Cutoff
              </label>
              <span className="font-mono text-base font-bold text-emerald-400">
                {(threshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Matches with a 2-layer composite score below {(threshold * 100).toFixed(0)}% will remain silent in background queues without triggering instant alerts.
            </p>
          </div>

          {/* 5. Alert Method & Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-rose-400" />
                Alert Channel Method
              </label>
              <select
                value={alertMethod}
                onChange={(e: any) => setAlertMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="email">Email Notification</option>
                <option value="telegram">Telegram Bot Alert</option>
                <option value="webhook">Custom Webhook POST</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recipient Destination
              </label>
              <input
                type="text"
                value={alertDestination}
                onChange={(e) => setAlertDestination(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. user@stanford.edu or @telegram_handle"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Right Column: Live Sync JSON Schema Object Preview */}
      <div className="space-y-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-indigo-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" />
              Live DB JSON Sync Object
            </h3>
            <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              UserPreferences Table
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Real-time payload mapped directly to the <code className="text-indigo-300 font-mono">user_preferences</code> database model for tenant <span className="font-mono text-slate-200">{currentTenant.tenantId}</span>.
          </p>

          <pre className="p-3 bg-slate-950 text-indigo-300 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 max-h-96 overflow-y-auto">
            {JSON.stringify(
              {
                id: pref?.id || 'pref-preview-id',
                userId: pref?.userId || 'user-id',
                tenantId: currentTenant.tenantId,
                targetLocations: locations,
                targetRoles: roles,
                preferredCompanies,
                blacklistedCompanies,
                customMatchThreshold: threshold,
                alertMethod,
                alertDestination,
                isActive: true,
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
};
