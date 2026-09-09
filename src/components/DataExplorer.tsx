import React, { useState, useEffect } from 'react';
import {
  Table,
  Search,
  Filter,
  User,
  FileText,
  Sliders,
  Briefcase,
  Target,
  Bell,
  Eye,
  Plus,
  ShieldCheck,
  Zap,
  Building,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { TenantContext } from '../types';
import { safeFetchJson } from '../lib/apiHelper';

interface DataExplorerProps {
  currentTenant: TenantContext;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({ currentTenant }) => {
  const [activeTable, setActiveTable] = useState<'users' | 'resumes' | 'preferences' | 'jobs' | 'matches' | 'notifications'>('matches');
  const [filterTenantOnly, setFilterTenantOnly] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [inspectItem, setInspectItem] = useState<any | null>(null);
  const [showAddJobModal, setShowAddJobModal] = useState<boolean>(false);

  // New Job Form State
  const [newJobCompany, setNewJobCompany] = useState('Goldman Sachs');
  const [newJobTitle, setNewJobTitle] = useState('Software Engineering Analyst 2026');
  const [newJobLocation, setNewJobLocation] = useState('New York, NY');
  const [newJobSource, setNewJobSource] = useState<'greenhouse' | 'lever' | 'direct'>('greenhouse');
  const [newJobRawJd, setNewJobRawJd] = useState(
    'Goldman Sachs Engineering seeking undergraduate SWE analysts. Knowledge of Java, C++, Python, SQL, and data structures required.'
  );

  useEffect(() => {
    fetchTableData();
  }, [activeTable, filterTenantOnly, currentTenant]);

  const fetchTableData = async () => {
    setLoading(true);
    try {
      let url = `/api/${activeTable}`;
      if (activeTable !== 'jobs' && filterTenantOnly) {
        url += `?tenantId=${currentTenant.tenantId}`;
      }
      if (activeTable === 'preferences') {
        // Preferences requires userId parameter
        const usersRes = await safeFetchJson<any[]>(`/api/users?tenantId=${currentTenant.tenantId}`);
        if (usersRes.ok && usersRes.data && usersRes.data.length > 0) {
          url = `/api/preferences?userId=${usersRes.data[0].id}&tenantId=${currentTenant.tenantId}`;
        }
      }

      const res = await safeFetchJson<any>(url);
      if (res.ok && res.data) {
        const data = res.data;
        setTableData(Array.isArray(data) ? data : [data]);
      } else {
        setTableData([]);
      }
    } catch {
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: newJobSource,
          company: newJobCompany,
          title: newJobTitle,
          location: newJobLocation,
          isRemote: newJobLocation.toLowerCase().includes('remote'),
          description: newJobRawJd,
          rawJd: newJobRawJd,
          statedRequirements: {
            requiredSkills: ['Python', 'C++', 'Java', 'SQL', 'Data Structures'],
            preferredSkills: ['Financial Engineering', 'Distributed Systems'],
            education: 'BS CS',
            experienceYears: 0,
          },
          informalBar: {
            dsaDifficulty: 'Hard',
            oaPattern: 'Hackerrank 2 Hard Problems: DP + Graph Shortest Path',
            unstatedPreferences: ['High performance under time pressure in OA'],
            barDescription: 'Goldman Sachs OA tests DP & Graph algorithms strictly.',
          },
          applyUrl: 'https://careers.example.com/apply',
        }),
      });

      if (res.ok) {
        setShowAddJobModal(false);
        if (activeTable === 'jobs' || activeTable === 'matches') {
          fetchTableData();
        }
      }
    } catch (err) {
      console.error('Failed to create job:', err);
    }
  };

  const filteredData = tableData.filter((item) => {
    if (!searchQuery) return true;
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Table Selection Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTable('matches')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTable === 'matches'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>2-Layer Matches</span>
          </button>
          <button
            onClick={() => setActiveTable('jobs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTable === 'jobs'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Job Postings</span>
          </button>
          <button
            onClick={() => setActiveTable('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTable === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTable('resumes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTable === 'resumes'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Resumes & Vectors</span>
          </button>
          <button
            onClick={() => setActiveTable('preferences')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTable === 'preferences'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferences</span>
          </button>
          <button
            onClick={() => setActiveTable('notifications')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTable === 'notifications'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>
        </div>

        {/* Right Tools: Tenant Filter Toggle & Search */}
        <div className="flex items-center space-x-3">
          {activeTable !== 'jobs' && (
            <label className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filterTenantOnly}
                onChange={(e) => setFilterTenantOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filter Tenant ({currentTenant.tenantName})</span>
            </label>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 text-slate-200 text-xs rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none w-44"
            />
          </div>

          <button
            onClick={() => setShowAddJobModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Test Job</span>
          </button>
        </div>
      </div>

      {/* Main Records Table View */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading database records...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-slate-300 font-medium">No records found in table "{activeTable}".</p>
            <p className="text-xs text-slate-500">
              Try switching tenants or triggering database seeding in the Schema tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  {activeTable === 'matches' && (
                    <>
                      <th className="py-3 px-4">Job & Company</th>
                      <th className="py-3 px-4">Tenant</th>
                      <th className="py-3 px-4">Layer 1 (JD Fit)</th>
                      <th className="py-3 px-4">Layer 2 (Informal Bar)</th>
                      <th className="py-3 px-4">Composite Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </>
                  )}
                  {activeTable === 'jobs' && (
                    <>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Vector Embedding</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </>
                  )}
                  {activeTable === 'users' && (
                    <>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Tenant ID</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Created At</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </>
                  )}
                  {activeTable === 'resumes' && (
                    <>
                      <th className="py-3 px-4">Document Title</th>
                      <th className="py-3 px-4">Tenant ID</th>
                      <th className="py-3 px-4">Parsed Skills</th>
                      <th className="py-3 px-4">Vector Embedding</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </>
                  )}
                  {activeTable === 'preferences' && (
                    <>
                      <th className="py-3 px-4">User ID</th>
                      <th className="py-3 px-4">Target Roles</th>
                      <th className="py-3 px-4">Preferred Companies</th>
                      <th className="py-3 px-4">Cutoff Threshold</th>
                      <th className="py-3 px-4">Alert Channel</th>
                    </>
                  )}
                  {activeTable === 'notifications' && (
                    <>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Sent At</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-800/50 transition-colors">
                    {activeTable === 'matches' && (
                      <>
                        <td className="py-3.5 px-4 font-semibold text-slate-100">
                          <div>{row.job?.company || 'Goldman Sachs'}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{row.job?.title}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-400">{row.tenantId}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">
                          {(row.layer1Score * 100).toFixed(0)}%
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-purple-400">
                          {(row.layer2Score * 100).toFixed(0)}%
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span
                            className={`px-2 py-1 rounded-md font-bold ${
                              row.compositeScore >= 80
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}
                          >
                            {row.compositeScore}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setInspectItem(row)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}

                    {activeTable === 'jobs' && (
                      <>
                        <td className="py-3.5 px-4 font-mono uppercase text-[10px] font-bold text-amber-400">
                          {row.source}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-100">{row.company}</td>
                        <td className="py-3.5 px-4">{row.title}</td>
                        <td className="py-3.5 px-4 text-slate-400">{row.location}</td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-emerald-400">
                          768-dim float [{row.vectorEmbedding?.slice(0, 3).map((n: number) => n.toFixed(3)).join(', ')}...]
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setInspectItem(row)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}

                    {activeTable === 'users' && (
                      <>
                        <td className="py-3.5 px-4 flex items-center space-x-2">
                          <img src={row.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                          <span className="font-semibold text-slate-100">{row.fullName}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-indigo-400">{row.tenantId}</td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">{row.email}</td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(row.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setInspectItem(row)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}

                    {activeTable === 'resumes' && (
                      <>
                        <td className="py-3.5 px-4 font-semibold text-slate-100">{row.title}</td>
                        <td className="py-3.5 px-4 font-mono text-indigo-400">{row.tenantId}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {row.extractedSkills?.slice(0, 4).map((sk: string) => (
                              <span
                                key={sk}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-emerald-400">
                          VECTOR(768) [{row.embedding?.slice(0, 3).map((n: number) => n.toFixed(3)).join(', ')}...]
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setInspectItem(row)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}

                    {activeTable === 'preferences' && (
                      <>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{row.userId}</td>
                        <td className="py-3.5 px-4">
                          {row.targetRoles?.map((r: string) => (
                            <span key={r} className="mr-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px]">
                              {r}
                            </span>
                          ))}
                        </td>
                        <td className="py-3.5 px-4">
                          {row.preferredCompanies?.map((c: string) => (
                            <span key={c} className="mr-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px]">
                              {c}
                            </span>
                          ))}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                          {(row.customMatchThreshold * 100).toFixed(0)}%
                        </td>
                        <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-slate-300">
                          {row.alertMethod}: {row.alertDestination}
                        </td>
                      </>
                    )}

                    {activeTable === 'notifications' && (
                      <>
                        <td className="py-3.5 px-4 font-mono">{row.recipient}</td>
                        <td className="py-3.5 px-4 uppercase font-bold text-[10px] text-cyan-400">{row.type}</td>
                        <td className="py-3.5 px-4 truncate max-w-xs">{row.subject}</td>
                        <td className="py-3.5 px-4 text-emerald-400 uppercase font-bold text-[10px]">{row.status}</td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">{new Date(row.createdAt).toLocaleTimeString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Record Inspector Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-mono text-sm font-bold text-slate-100 flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" /> Record Raw Payload Inspector
              </h3>
              <button
                onClick={() => setInspectItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-indigo-300 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
              {JSON.stringify(inspectItem, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Post New Job Modal */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateJob}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" /> Post Test Internship Opportunity
              </h3>
              <button
                type="button"
                onClick={() => setShowAddJobModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Company</label>
                <input
                  type="text"
                  value={newJobCompany}
                  onChange={(e) => setNewJobCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Role Title</label>
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Location</label>
                <input
                  type="text"
                  value={newJobLocation}
                  onChange={(e) => setNewJobLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Source ATS</label>
                <select
                  value={newJobSource}
                  onChange={(e: any) => setNewJobSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                >
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                  <option value="direct">Direct Web</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Job Description Text</label>
              <textarea
                rows={4}
                value={newJobRawJd}
                onChange={(e) => setNewJobRawJd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddJobModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                Generate Embedding & Post
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
