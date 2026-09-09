import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  Briefcase,
  Building2,
  Ban,
  Sliders,
  Bell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { User, UserPreferences } from '../types';

interface OnboardingFlowProps {
  user: User;
  token: string;
  initialPreferences?: UserPreferences;
  onOnboardingComplete: (updatedPreferences: UserPreferences) => void;
}

const PRESET_ROLES = [
  'Software Engineering Intern',
  'Backend Engineering Intern',
  'Quant Developer Intern',
  'AI/ML Engineering Intern',
  'Systems Engineering Intern',
  'Data Engineering Intern',
];

const PRESET_LOCATIONS = [
  'San Francisco, CA',
  'New York, NY',
  'Seattle, WA',
  'Austin, TX',
  'Chicago, IL',
  'Remote',
];

const PRESET_COMPANIES = [
  'Goldman Sachs',
  'Stripe',
  'Microsoft',
  'Databricks',
  'Citadel',
  'Jane Street',
  'OpenAI',
  'Palantir',
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  user,
  token,
  initialPreferences,
  onOnboardingComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 State: Roles & Locations
  const [targetRoles, setTargetRoles] = useState<string[]>(
    initialPreferences?.targetRoles || ['Software Engineering Intern', 'Backend Engineering Intern']
  );
  const [customRoleInput, setCustomRoleInput] = useState<string>('');

  const [targetLocations, setTargetLocations] = useState<string[]>(
    initialPreferences?.targetLocations || ['San Francisco, CA', 'Remote']
  );
  const [customLocationInput, setCustomLocationInput] = useState<string>('');

  // Step 2 State: Companies
  const [preferredCompanies, setPreferredCompanies] = useState<string[]>(
    initialPreferences?.preferredCompanies || ['Goldman Sachs', 'Stripe', 'Microsoft', 'Databricks']
  );
  const [customCompanyInput, setCustomCompanyInput] = useState<string>('');

  const [blacklistedCompanies, setBlacklistedCompanies] = useState<string[]>(
    initialPreferences?.blacklistedCompanies || ['CryptoScam LLC']
  );
  const [customBlacklistInput, setCustomBlacklistInput] = useState<string>('');

  // Step 3 State: Match Threshold & Alerts
  const [customMatchThreshold, setCustomMatchThreshold] = useState<number>(
    initialPreferences?.customMatchThreshold ?? 0.70
  );
  const [alertMethod, setAlertMethod] = useState<'email' | 'telegram' | 'webhook'>(
    initialPreferences?.alertMethod || 'email'
  );
  const [alertDestination, setAlertDestination] = useState<string>(
    initialPreferences?.alertDestination || user.email
  );

  // Step 4 State: Resume Text & Skills
  const [resumeText, setResumeText] = useState<string>(
    `${user.fullName} - B.S. Computer Science. Skills: C++, Python, TypeScript, Express, React, SQL, Distributed Systems, PyTorch.`
  );

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle handlers
  const toggleRole = (role: string) => {
    if (targetRoles.includes(role)) {
      setTargetRoles(targetRoles.filter((r) => r !== role));
    } else {
      setTargetRoles([...targetRoles, role]);
    }
  };

  const addCustomRole = () => {
    if (customRoleInput.trim() && !targetRoles.includes(customRoleInput.trim())) {
      setTargetRoles([...targetRoles, customRoleInput.trim()]);
      setCustomRoleInput('');
    }
  };

  const toggleLocation = (loc: string) => {
    if (targetLocations.includes(loc)) {
      setTargetLocations(targetLocations.filter((l) => l !== loc));
    } else {
      setTargetLocations([...targetLocations, loc]);
    }
  };

  const addCustomLocation = () => {
    if (customLocationInput.trim() && !targetLocations.includes(customLocationInput.trim())) {
      setTargetLocations([...targetLocations, customLocationInput.trim()]);
      setCustomLocationInput('');
    }
  };

  const togglePreferredCompany = (comp: string) => {
    if (preferredCompanies.includes(comp)) {
      setPreferredCompanies(preferredCompanies.filter((c) => c !== comp));
    } else {
      setPreferredCompanies([...preferredCompanies, comp]);
    }
  };

  const addCustomCompany = () => {
    if (customCompanyInput.trim() && !preferredCompanies.includes(customCompanyInput.trim())) {
      setPreferredCompanies([...preferredCompanies, customCompanyInput.trim()]);
      setCustomCompanyInput('');
    }
  };

  const addBlacklistedCompany = () => {
    if (customBlacklistInput.trim() && !blacklistedCompanies.includes(customBlacklistInput.trim())) {
      setBlacklistedCompanies([...blacklistedCompanies, customBlacklistInput.trim()]);
      setCustomBlacklistInput('');
    }
  };

  const removeBlacklistedCompany = (comp: string) => {
    setBlacklistedCompanies(blacklistedCompanies.filter((c) => c !== comp));
  };

  // Final Submit Handler
  const handleSubmitOnboarding = async () => {
    setSaving(true);
    setError(null);

    const payload = {
      targetLocations,
      targetRoles,
      preferredCompanies,
      blacklistedCompanies,
      customMatchThreshold: Number(customMatchThreshold),
      alertMethod,
      alertDestination,
      isActive: true,
    };

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          const firstErr = Object.values(data.details).flat()[0];
          throw new Error((firstErr as string) || data.message || 'Validation error');
        }
        throw new Error(data.message || 'Failed to save target preferences');
      }

      onOnboardingComplete(data.preferences);
    } catch (err: any) {
      setError(err.message || 'Error completing onboarding flow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-indigo-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Phase 2: Target Criteria Onboarding
            </h2>
            <p className="text-xs text-slate-400">
              Configure target roles, location constraints, company filters, and match threshold.
            </p>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold transition-all ${
                currentStep === step
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : currentStep > step
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-950 text-slate-500 border border-slate-800'
              }`}
            >
              {currentStep > step ? '✓' : step}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Target Roles & Locations */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              1. Select Target Engineering Roles
            </h3>
            <p className="text-xs text-slate-400">
              Pick the specific internship job titles you want AI Internship Scout to evaluate.
            </p>

            <div className="flex flex-wrap gap-2">
              {PRESET_ROLES.map((role) => {
                const isSelected = targetRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {role}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                placeholder="Add custom role title (e.g. Firmware Intern)..."
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRole())}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomRole}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              2. Select Target Job Locations
            </h3>
            <p className="text-xs text-slate-400">
              Filter incoming postings by city hubs or remote options.
            </p>

            <div className="flex flex-wrap gap-2">
              {PRESET_LOCATIONS.map((loc) => {
                const isSelected = targetLocations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => toggleLocation(loc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {loc}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                placeholder="Add custom location (e.g. New York, NY)..."
                value={customLocationInput}
                onChange={(e) => setCustomLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomLocation())}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomLocation}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Target Companies & Blacklist Rules */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              1. Priority Target Companies
            </h3>
            <p className="text-xs text-slate-400">
              Matches with priority companies earn an informal bar bonus boost.
            </p>

            <div className="flex flex-wrap gap-2">
              {PRESET_COMPANIES.map((comp) => {
                const isSelected = preferredCompanies.includes(comp);
                return (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => togglePreferredCompany(comp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {comp}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                placeholder="Add custom priority company..."
                value={customCompanyInput}
                onChange={(e) => setCustomCompanyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCompany())}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomCompany}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" />
              2. Company Blacklist Rules
            </h3>
            <p className="text-xs text-slate-400">
              Any postings from blacklisted companies will be strictly filtered out (0% composite score).
            </p>

            <div className="flex flex-wrap gap-2">
              {blacklistedCompanies.map((comp) => (
                <span
                  key={comp}
                  className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-mono flex items-center gap-1.5"
                >
                  <span>{comp}</span>
                  <button
                    type="button"
                    onClick={() => removeBlacklistedCompany(comp)}
                    className="hover:text-rose-100 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                placeholder="Exclude company (e.g. LowPay Agency)..."
                value={customBlacklistInput}
                onChange={(e) => setCustomBlacklistInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlacklistedCompany())}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={addBlacklistedCompany}
                className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-xl border border-rose-700 cursor-pointer"
              >
                Blacklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Match Threshold & Instant Alert Channels */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                1. Minimum Match Score Threshold
              </h3>
              <span className="font-mono text-sm font-bold text-amber-400 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                {(customMatchThreshold * 100).toFixed(0)}% Minimum Match
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Only job postings with a 2-Layer Composite Score equal to or higher than this threshold will trigger instant alerts.
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.01"
                value={customMatchThreshold}
                onChange={(e) => setCustomMatchThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>50% (Permissive)</span>
                <span>70% (Recommended)</span>
                <span>85% (Strict Top Matches)</span>
                <span>95% (Exact Fit Only)</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              2. Instant Alert Notification Channel
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAlertMethod('email')}
                className={`p-3 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                  alertMethod === 'email'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">Email Dispatch</span>
                <span className="text-[10px] block opacity-80">Instant email notifications</span>
              </button>

              <button
                type="button"
                onClick={() => setAlertMethod('telegram')}
                className={`p-3 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                  alertMethod === 'telegram'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">Telegram Bot</span>
                <span className="text-[10px] block opacity-80">Push alerts via Telegram</span>
              </button>

              <button
                type="button"
                onClick={() => setAlertMethod('webhook')}
                className={`p-3 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                  alertMethod === 'webhook'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">Custom Webhook</span>
                <span className="text-[10px] block opacity-80">JSON HTTP POST payloads</span>
              </button>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-slate-300">
                Alert Destination Handle / Email / Endpoint
              </label>
              <input
                type="text"
                value={alertDestination}
                onChange={(e) => setAlertDestination(e.target.value)}
                placeholder="e.g. alex.rivera@stanford.edu or @telegram_handle"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Resume Parsing & Final Review */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Candidate Resume Vector & Skills Payload
            </h3>
            <p className="text-xs text-slate-400">
              Verify your resume content string for the 768-dimensional vector embedding engine.
            </p>

            <textarea
              rows={4}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs p-3 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Configuration Summary Card */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-3 font-mono text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
              Target Criteria Summary Preview:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500 block">Target Roles:</span>
                <span className="font-semibold text-indigo-300">{targetRoles.join(', ')}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Target Locations:</span>
                <span className="font-semibold text-cyan-300">{targetLocations.join(', ')}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Priority Companies:</span>
                <span className="font-semibold text-emerald-300">{preferredCompanies.join(', ')}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Match Threshold & Channel:</span>
                <span className="font-semibold text-amber-300">
                  {(customMatchThreshold * 100).toFixed(0)}% via {alertMethod} ({alertDestination})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-5">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep(currentStep - 1)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep + 1)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <span>Next Step</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmitOnboarding}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? 'Saving Target Preferences...' : 'Save Target Criteria & Complete Onboarding'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
