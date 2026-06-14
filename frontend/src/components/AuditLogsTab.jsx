import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, RefreshCw, ShieldAlert, Loader2 } from 'lucide-react';

export default function AuditLogsTab({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(log => 
    log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit Trail</h2>
          <p className="text-sm text-slate-500 mt-1">Monitor and trace employee actions, workflow status modifications, refund approvals, and database operations.</p>
        </div>
        
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log Feed
        </button>
      </div>

      {/* Control bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username, action or details..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
          />
        </div>
        
        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
          Total Logs Audited: {logs.length}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-3" />
          <p className="text-sm font-semibold">Reading logs from disk...</p>
        </div>
      ) : (
        /* Logs Table */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {filteredLogs.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 font-extrabold uppercase border-b border-slate-100">
                    <th className="p-4 pl-6">Timestamp</th>
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">Action Event</th>
                    <th className="p-4">Action Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-mono text-[11px] text-slate-700">
                  {filteredLogs.map(log => {
                    const actionColors = {
                      'LOGIN': 'text-sky-600 bg-sky-50 border-sky-100',
                      'LOGIN_FAILED': 'text-rose-600 bg-rose-50 border-rose-100',
                      'CLAIM_CREATE': 'text-indigo-600 bg-indigo-50 border-indigo-100',
                      'CLAIM_UPDATE': 'text-amber-600 bg-amber-50 border-amber-100',
                      'CLAIM_APPROVE': 'text-emerald-600 bg-emerald-50 border-emerald-100',
                      'CLAIM_REJECT': 'text-rose-600 bg-rose-50 border-rose-100',
                      'CLAIM_ESCALATE': 'text-purple-600 bg-purple-50 border-purple-100',
                      'LEGAL_UPDATE': 'text-indigo-600 bg-indigo-50 border-indigo-100',
                      'REFUND_REQUEST': 'text-amber-600 bg-amber-50 border-amber-100',
                      'REFUND_APPROVE': 'text-emerald-600 bg-emerald-50 border-emerald-100',
                      'REFUND_REJECT': 'text-rose-600 bg-rose-50 border-rose-100',
                      'DOC_UPLOAD': 'text-slate-600 bg-slate-50 border-slate-100',
                      'DOC_DELETE': 'text-rose-600 bg-rose-50 border-rose-100',
                      'USER_CREATE': 'text-indigo-600 bg-indigo-50 border-indigo-100',
                      'USER_UPDATE': 'text-amber-600 bg-amber-50 border-amber-100',
                      'USER_DELETE': 'text-rose-600 bg-rose-50 border-rose-100'
                    };
                    const actionStyle = actionColors[log.action] || 'text-slate-600 bg-slate-50 border-slate-100';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-4 pl-6 text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-slate-900">{log.username}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold border text-[9px] ${actionStyle}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 font-sans">{log.details}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <ClipboardList className="w-12 h-12 text-slate-200 mb-3" />
                <p className="font-semibold text-slate-500">No matching audit events</p>
                <p className="text-[10px] text-slate-400 mt-1">Audit log records cannot be cleared manually.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
