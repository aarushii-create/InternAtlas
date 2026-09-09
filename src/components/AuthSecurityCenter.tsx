import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Send,
  UserCheck,
  ShieldAlert,
  Cpu,
} from 'lucide-react';
import { User } from '../types';

interface AuthSecurityCenterProps {
  user: User | null;
  token: string | null;
}

export const AuthSecurityCenter: React.FC<AuthSecurityCenterProps> = ({ user, token }) => {
  const [testEndpoint, setTestEndpoint] = useState<string>('/api/auth/me');
  const [testToken, setTestToken] = useState<string>(token || '');
  const [testResponseStatus, setTestResponseStatus] = useState<number | null>(null);
  const [testResponseBody, setTestResponseBody] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Parse JWT Payload
  const parseJwt = (jwtToken: string) => {
    try {
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const decoded = token ? parseJwt(token) : null;

  const runSecurityTest = async (overrideToken?: string) => {
    setLoading(true);
    setTestResponseStatus(null);
    setTestResponseBody(null);

    const activeToken = overrideToken !== undefined ? overrideToken : testToken;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const res = await fetch(testEndpoint, { method: 'GET', headers });
      setTestResponseStatus(res.status);
      const data = await res.json();
      setTestResponseBody(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResponseStatus(500);
      setTestResponseBody(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Phase 2 Security & Auth Inspector</h2>
            <p className="text-xs text-slate-400">
              JWT Bearer Token verification, Zod input validation schemas, and Tenant Security Rules enforcement.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Security Rules Active
          </span>
        </div>
      </div>

      {/* Grid: JWT Decoder & Security Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Decoder */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200">Active JWT Bearer Token Payload</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {token ? 'Authenticated Session' : 'Unauthenticated'}
            </span>
          </div>

          {token ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 break-all text-amber-300/80 leading-relaxed text-[11px]">
                <span className="text-slate-500 block font-bold">RAW JWT TOKEN:</span>
                {token}
              </div>

              {decoded && (
                <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-1.5 text-[11px]">
                  <span className="text-indigo-400 font-bold block">DECODED JWT CLAIMS:</span>
                  <div className="text-slate-300">
                    <span className="text-slate-500">userId:</span> {decoded.userId}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">tenantId:</span> {decoded.tenantId}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">email:</span> {decoded.email}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">fullName:</span> {decoded.fullName}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">issuedAt:</span>{' '}
                    {decoded.iat ? new Date(decoded.iat * 1000).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-center space-y-2">
              <p className="text-slate-400 text-xs">No active JWT token stored in browser session.</p>
              <p className="text-[11px] text-slate-500">Sign in or register to issue a signed JWT token.</p>
            </div>
          )}
        </div>

        {/* Security Specs & Validations Box */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> Security Rules & Validation Specs
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400 block">Zod Input Validation Schemas</span>
              <p className="text-slate-400 text-[11px]">
                Validates target role arrays, non-empty location constraints, custom match threshold range (50% - 98%), and email format on all Auth/Preferences endpoints.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-indigo-400 block">Multi-Tenant & Row Isolation Rules</span>
              <p className="text-slate-400 text-[11px]">
                Requests are strictly scoped by <code className="text-indigo-300">req.user.tenantId</code> and <code className="text-indigo-300">req.user.userId</code>. Cross-tenant queries trigger HTTP 403 Forbidden violations.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-cyan-400 block">Bcrypt Password Hashing</span>
              <p className="text-slate-400 text-[11px]">
                User passwords are salted and hashed with 10 rounds of bcrypt. Plaintext passwords are never stored in the database.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Rule Tester */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-200">Security Rule Audit & Endpoint Tester</h3>
          </div>

          {/* Preset Security Test Buttons */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => {
                setTestEndpoint('/api/auth/me');
                setTestToken(token || '');
                runSecurityTest(token || '');
              }}
              className="px-3 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-semibold cursor-pointer hover:bg-emerald-600/30"
            >
              Test 1: Valid JWT Token (HTTP 200)
            </button>

            <button
              onClick={() => {
                setTestEndpoint('/api/auth/me');
                setTestToken('invalid_foreign_token_12345');
                runSecurityTest('invalid_foreign_token_12345');
              }}
              className="px-3 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-xl font-semibold cursor-pointer hover:bg-rose-600/30"
            >
              Test 2: Invalid Token (HTTP 403)
            </button>

            <button
              onClick={() => {
                setTestEndpoint('/api/auth/me');
                setTestToken('');
                runSecurityTest('');
              }}
              className="px-3 py-1 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-xl font-semibold cursor-pointer hover:bg-amber-600/30"
            >
              Test 3: Missing Token (HTTP 401)
            </button>
          </div>
        </div>

        {/* Response Payload */}
        {testResponseBody && (
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400 font-bold">Audit Test Output Payload</span>
              <span
                className={`px-2.5 py-0.5 rounded font-bold ${
                  testResponseStatus === 200 || testResponseStatus === 201
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : testResponseStatus === 403
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                HTTP {testResponseStatus}
              </span>
            </div>

            <pre className="p-4 bg-slate-950 text-indigo-300 rounded-xl font-mono text-xs border border-slate-800 max-h-64 overflow-y-auto leading-relaxed">
              {testResponseBody}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
