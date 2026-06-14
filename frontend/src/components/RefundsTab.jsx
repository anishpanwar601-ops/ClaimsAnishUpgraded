import React, { useState } from 'react';
import { DollarSign, CheckCircle2, XCircle, ArrowUpRight, Landmark, CreditCard, Clipboard, Loader2, AlertTriangle } from 'lucide-react';

export default function RefundsTab({ claims, token, fetchClaims, user }) {
  const [selectedClaim, setSelectedClaim] = useState(null);
  
  // Create refund form state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [claimId, setClaimId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Eligible claims for refunds (usually must be Approved, Settled, or already in Refund status)
  const refundClaims = claims.filter(
    c => c.status === 'Approved' || 
         c.status === 'Settled' || 
         c.status === 'Refund Pending' || 
         c.status === 'Refund Approved' || 
         c.status === 'Refund Processed' || 
         c.status === 'Refund Rejected'
  );

  // Claims with active refund requests
  const pendingRefunds = claims.filter(
    c => c.refundDetails && c.refundDetails.refundStatus === 'Pending Approval'
  );
  
  // Claims with approved but not yet paid refunds
  const approvedRefunds = claims.filter(
    c => c.refundDetails && c.refundDetails.refundStatus === 'Approved'
  );

  // Claims with completed/processed refunds
  const processedRefunds = claims.filter(
    c => c.refundDetails && ['Processed', 'Rejected'].includes(c.refundDetails.refundStatus)
  );

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!claimId || !refundAmount || !beneficiaryName || !bankDetails) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      refundAmount: parseFloat(refundAmount),
      beneficiaryName,
      bankDetails,
      notes
    };

    try {
      const response = await fetch(`/api/claims/${claimId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit refund request');

      await fetchClaims();
      setShowRequestForm(false);
      setClaimId('');
      setRefundAmount('');
      setBeneficiaryName('');
      setBankDetails('');
      setNotes('');
      alert('Refund request submitted successfully for approval.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Server connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveRefund = async (claimId, action) => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/claims/${claimId}/refund`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${action} refund`);

      await fetchClaims();
      setSelectedClaim(null);
      alert(`Refund request successfully ${action}d!`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Claim-Related Refunds</h2>
          <p className="text-sm text-slate-500 mt-1">Initiate and authorize claim overpayment refunds, insurance returns, or collateral auction sale balance dispersals.</p>
        </div>
        
        {user?.role !== 'Executive' && (
          <button
            onClick={() => { setShowRequestForm(!showRequestForm); setSelectedClaim(null); setError(''); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            {showRequestForm ? 'View Refunds Queue' : 'Submit Refund Request'}
          </button>
        )}
      </div>

      {showRequestForm ? (
        /* Create Request Form Panel */
        <div className="max-w-2xl bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Initiate New Refund Dispersal</h3>
            <p className="text-xs text-slate-400">Specify beneficiary details, amount, and active claims linkage.</p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Linked Approved Claim ID</label>
                <select
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none"
                  required
                >
                  <option value="">-- Select Active Claim --</option>
                  {refundClaims.filter(c => !c.refundDetails || c.refundDetails.refundStatus === 'None').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.borrowerName} (${c.outstandingAmount?.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Refund Dispersal Amount ($)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="e.g. 5200"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Beneficiary Name</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="e.g. John Doe / Insurance Corp"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Beneficiary Bank Details</label>
                <input
                  type="text"
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="e.g. Chase Bank, Acc #123456789, Transit #021"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Notes / Justification</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide reasons for this refund disbursement request..."
                rows="3"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowRequestForm(false); setClaimId(''); setError(''); }}
                className="px-4 py-2 border border-slate-200 hover:border-slate-350 text-slate-600 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-md"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Request
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* Queue View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Side: Refunds Queues lists */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Pending approvals */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-amber-50/50 border-b border-amber-100/50 flex justify-between items-center">
                <span className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
                  <Landmark className="w-4 h-4 text-amber-600" />
                  Awaiting Authorization ({pendingRefunds.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                {pendingRefunds.length > 0 ? (
                  pendingRefunds.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClaim(c); setError(''); }}
                      className={`w-full text-left p-4 hover:bg-slate-50/50 text-xs transition-all flex justify-between items-center ${
                        selectedClaim?.id === c.id ? 'bg-sky-50/30' : ''
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900">{c.id}</p>
                        <p className="font-semibold text-slate-600">{c.refundDetails.beneficiaryName}</p>
                        <p className="text-[10px] text-slate-400">By {c.refundDetails.requestedBy}</p>
                      </div>
                      <span className="font-black text-amber-700">${c.refundDetails.refundAmount?.toLocaleString()}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-[11px]">No refunds pending review</div>
                )}
              </div>
            </div>

            {/* Approved and waiting processing */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-sky-50/50 border-b border-sky-100/50">
                <span className="text-xs font-bold text-sky-800 uppercase flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  Authorized for Dispersal ({approvedRefunds.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                {approvedRefunds.length > 0 ? (
                  approvedRefunds.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClaim(c); setError(''); }}
                      className={`w-full text-left p-4 hover:bg-slate-50/50 text-xs transition-all flex justify-between items-center ${
                        selectedClaim?.id === c.id ? 'bg-sky-50/30' : ''
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900">{c.id}</p>
                        <p className="font-semibold text-slate-600">{c.refundDetails.beneficiaryName}</p>
                      </div>
                      <span className="font-black text-sky-700">${c.refundDetails.refundAmount?.toLocaleString()}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-[11px]">No refunds waiting payment processing</div>
                )}
              </div>
            </div>

            {/* Refund History (Completed list) */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Clipboard className="w-4 h-4 text-slate-400" />
                  Refund Transactions History ({processedRefunds.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                {processedRefunds.length > 0 ? (
                  processedRefunds.map(c => (
                    <div key={c.id} className="p-3 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{c.id}</p>
                        <p className="text-[10px] text-slate-400">{c.refundDetails.beneficiaryName} | {c.refundDetails.refundStatus}</p>
                      </div>
                      <span className={`font-black text-xs ${c.refundDetails.refundStatus === 'Processed' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        ${c.refundDetails.refundAmount?.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-[11px]">No refund logs in history</div>
                )}
              </div>
            </div>

          </div>

          {/* Right Side: Refund audit details */}
          <div className="lg:col-span-7">
            {selectedClaim ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{selectedClaim.refundDetails.refundStatus}</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">Refund Authorization: {selectedClaim.id}</h3>
                  <p className="text-xs text-slate-400">Claim Borrower: {selectedClaim.borrowerName}</p>
                </div>

                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Refund breakdown info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <span className="text-slate-400 font-bold block">Dispersal Amount</span>
                    <span className="text-lg font-black text-slate-800">${selectedClaim.refundDetails.refundAmount?.toLocaleString()}</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <span className="text-slate-400 font-bold block">Beneficiary Name</span>
                    <span className="font-bold text-slate-700">{selectedClaim.refundDetails.beneficiaryName}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl text-xs space-y-2">
                  <div>
                    <span className="text-slate-400 font-bold block">Bank Details</span>
                    <span className="font-semibold text-slate-700">{selectedClaim.refundDetails.bankDetails}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Request Notes</span>
                    <span className="text-slate-600 leading-relaxed italic">"{selectedClaim.refundDetails.notes || 'None provided.'}"</span>
                  </div>
                </div>

                {/* Audit trail */}
                <div className="text-[10px] text-slate-400 font-medium">
                  <p>Requested by: {selectedClaim.refundDetails.requestedBy} on {new Date(selectedClaim.refundDetails.requestedAt).toLocaleString()}</p>
                  {selectedClaim.refundDetails.resolvedBy && (
                    <p>Resolved by: {selectedClaim.refundDetails.resolvedBy} on {new Date(selectedClaim.refundDetails.resolvedAt).toLocaleString()}</p>
                  )}
                </div>

                {/* Actions Gating */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                  
                  {/* Threshold approval validation for Managers */}
                  {selectedClaim.refundDetails.refundStatus === 'Pending Approval' && selectedClaim.refundDetails.refundAmount > 10000 && user?.role === 'Manager' ? (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-[11px] flex gap-2 w-full">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>This refund request exceeds the $10,000 threshold and requires Senior Executive approval.</span>
                    </div>
                  ) : (
                    <>
                      {/* Decline button (Pending approval state) */}
                      {selectedClaim.refundDetails.refundStatus === 'Pending Approval' && ['Manager', 'Executive', 'Admin'].includes(user?.role) && (
                        <button
                          onClick={() => handleResolveRefund(selectedClaim.id, 'reject')}
                          disabled={submitting}
                          className="flex items-center gap-1 px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline Request
                        </button>
                      )}

                      {/* Approve button (Pending approval state) */}
                      {selectedClaim.refundDetails.refundStatus === 'Pending Approval' && ['Manager', 'Executive', 'Admin'].includes(user?.role) && (
                        <button
                          onClick={() => handleResolveRefund(selectedClaim.id, 'approve')}
                          disabled={submitting}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg font-bold shadow-md cursor-pointer"
                        >
                          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                          Authorize Refund
                        </button>
                      )}

                      {/* Process/Paid button (Approved state) */}
                      {selectedClaim.refundDetails.refundStatus === 'Approved' && ['Manager', 'Executive', 'Admin'].includes(user?.role) && (
                        <button
                          onClick={() => handleResolveRefund(selectedClaim.id, 'process')}
                          disabled={submitting}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-md cursor-pointer"
                        >
                          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                          Mark as Paid / Processed
                        </button>
                      )}
                    </>
                  )}

                </div>

              </div>
            ) : (
              <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-[400px]">
                <DollarSign className="w-12 h-12 text-slate-300 mb-3" />
                <p className="font-semibold text-slate-500">Select a refund file to review</p>
                <p className="text-[10px] text-slate-400 mt-1">Review beneficiary accounts, verify amounts, and authorize transactions.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
