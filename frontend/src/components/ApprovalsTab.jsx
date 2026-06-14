import React, { useState } from 'react';
import { Check, X, AlertTriangle, ShieldCheck, UserCheck, MessageSquare, History, ArrowUpRight, Loader2 } from 'lucide-react';

export default function ApprovalsTab({ claims, token, fetchClaims, user }) {
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [comment, setComment] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Pending'); // Pending, Escalated

  // Filter claims based on status
  const pendingClaims = claims.filter(c => c.status === 'Pending Review');
  const escalatedClaims = claims.filter(c => c.status === 'Escalated');
  
  const currentClaims = activeTab === 'Pending' ? pendingClaims : escalatedClaims;

  const handleAction = async (claimId, action) => {
    setSubmitting(true);
    setError('');
    
    let url = `/api/claims/${claimId}/${action}`;
    let body = { comment };
    
    if (action === 'escalate') {
      body = { reason: escalateReason || comment };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Action ${action} failed`);

      // Refresh claims list
      await fetchClaims();
      setSelectedClaim(null);
      setComment('');
      setEscalateReason('');
      alert(`Claim ${claimId} successfully ${action}d!`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance &amp; Approvals Queue</h2>
        <p className="text-sm text-slate-500 mt-1">Review loan defaults, verify AI classifications, and authorize credit guarantee recovery actions.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('Pending'); setSelectedClaim(null); }}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'Pending'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Awaiting Initial Review ({pendingClaims.length})
        </button>
        <button
          onClick={() => { setActiveTab('Escalated'); setSelectedClaim(null); }}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'Escalated'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ⚠️ Escalated to Senior Executive ({escalatedClaims.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Claims List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase">Claims Waiting Audit</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {currentClaims.length > 0 ? (
              currentClaims.map(claim => (
                <button
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`w-full text-left p-4 hover:bg-slate-50/70 transition-all flex justify-between items-start border-l-3 ${
                    selectedClaim?.id === claim.id ? 'bg-sky-50/30 border-sky-500' : 'border-transparent'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{claim.id}</div>
                    <div className="text-xs font-semibold text-slate-700">{claim.borrowerName}</div>
                    <div className="text-[11px] text-slate-400">DPD: {claim.dpd} days | {claim.npaCategory}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs font-black text-slate-800">${claim.outstandingAmount?.toLocaleString()}</div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      claim.aiRecommendation === 'Approve' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      AI: {claim.aiRecommendation}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No claims awaiting review in this category.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Claim Audit Panel */}
        <div className="lg:col-span-7 space-y-6">
          {selectedClaim ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              
              {/* Claim Title bar */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{selectedClaim.status}</span>
                    {selectedClaim.fraudStatus === 'Suspicious' && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded animate-pulse">⚠️ Suspected Fraud</span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{selectedClaim.id} - Audit Assessment</h3>
                  <p className="text-xs text-slate-400">Borrower: {selectedClaim.borrowerName} | Account: {selectedClaim.accountNumber}</p>
                </div>
                
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase">Outstanding Balance</span>
                  <div className="text-lg font-black text-slate-900">${selectedClaim.outstandingAmount?.toLocaleString()}</div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Core numbers grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block">Loan Amount</span>
                  <span className="font-bold text-slate-800">${selectedClaim.loanAmount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Interest Rate</span>
                  <span className="font-bold text-slate-800">{selectedClaim.interestRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Days Overdue</span>
                  <span className={`font-bold ${selectedClaim.dpd > 90 ? 'text-rose-600' : 'text-slate-800'}`}>{selectedClaim.dpd} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">NPA Category</span>
                  <span className="font-bold text-slate-800">{selectedClaim.npaCategory}</span>
                </div>
              </div>

              {/* AI Justification */}
              <div className="p-4 bg-sky-50/30 border border-sky-100 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  AI Recommendation Report (Confidence: {selectedClaim.aiConfidence}%)
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">"{selectedClaim.justification}"</p>
              </div>

              {/* Claim History Logs */}
              {selectedClaim.history && selectedClaim.history.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    Workflow Action Logs
                  </span>
                  <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 text-xs bg-slate-50/30 max-h-32 overflow-y-auto">
                    {selectedClaim.history.map((h, i) => (
                      <div key={i} className="p-3 flex justify-between gap-4">
                        <div>
                          <span className="font-bold text-slate-800">{h.user}</span>
                          <span className="text-slate-400 mx-1.5 font-semibold">marked</span>
                          <span className="font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{h.action}</span>
                          <p className="text-slate-500 mt-1">{h.comment}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Inputs */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                
                {/* Authorization check */}
                {selectedClaim.status === 'Escalated' && user?.role === 'Manager' ? (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>This claim has been escalated. Only Senior Executive role holders can authorize decisions at this level.</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Audit Review Comment
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Write regulatory audit confirmation comments or reasons for rejection/escalation..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-xs text-slate-800"
                        rows="3"
                        required
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        {/* Approve Button */}
                        <button
                          onClick={() => handleAction(selectedClaim.id, 'approve')}
                          disabled={submitting || !comment}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve Recovery
                        </button>
                        
                        {/* Reject Button */}
                        <button
                          onClick={() => handleAction(selectedClaim.id, 'reject')}
                          disabled={submitting || !comment}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-500/10 transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Reject Claim
                        </button>
                      </div>

                      {/* Escalation Control (only for initial review Managers) */}
                      {selectedClaim.status === 'Pending Review' && user?.role === 'Manager' && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            value={escalateReason}
                            onChange={(e) => setEscalateReason(e.target.value)}
                            placeholder="Escalation explanation..."
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 w-full sm:w-44"
                          />
                          <button
                            onClick={() => handleAction(selectedClaim.id, 'escalate')}
                            disabled={submitting || !escalateReason}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer disabled:opacity-55"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                            Escalate
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
              </div>

            </div>
          ) : (
            <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-[400px]">
              <UserCheck className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">Select a claim from the queue to audit</p>
              <p className="text-[10px] text-slate-400 mt-1">Review metrics, AI justification reports, and authorize compliance decisions.</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
