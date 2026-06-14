import React, { useState } from 'react';
import { Scale, Hammer, FileText, Landmark, UserCheck, Calendar, DollarSign, Loader2, AlertCircle } from 'lucide-react';

export default function LegalTab({ claims, token, fetchClaims, user }) {
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [caseStatus, setCaseStatus] = useState('None');
  const [caseNumber, setCaseNumber] = useState('');
  const [lawyerName, setLawyerName] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  
  // Auction details state
  const [assetType, setAssetType] = useState('Property');
  const [reservePrice, setReservePrice] = useState('');
  const [currentBid, setCurrentBid] = useState('');
  const [auctionDate, setAuctionDate] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Only approved claims or claims already in legal action can be managed here
  const manageableClaims = claims.filter(
    c => c.status === 'Approved' || 
         c.status === 'Legal Action' || 
         c.status === 'Auction Scheduled' || 
         c.status === 'Auction Completed' || 
         c.status === 'Settled'
  );

  const handleSelectClaim = (claim) => {
    setSelectedClaim(claim);
    setError('');
    
    // Pre-populate fields
    if (claim.legalAction) {
      setCaseStatus(claim.legalAction.caseStatus || 'None');
      setCaseNumber(claim.legalAction.caseNumber || '');
      setLawyerName(claim.legalAction.lawyerName || '');
      setSettlementAmount(claim.legalAction.settlementAmount || '');
      setSettlementDate(claim.legalAction.settlementDate || '');
      
      if (claim.legalAction.auctionDetails) {
        setAssetType(claim.legalAction.auctionDetails.assetType || 'Property');
        setReservePrice(claim.legalAction.auctionDetails.reservePrice || '');
        setCurrentBid(claim.legalAction.auctionDetails.currentBid || '');
        setAuctionDate(claim.legalAction.auctionDetails.auctionDate || '');
      }
    } else {
      setCaseStatus('None');
      setCaseNumber('');
      setLawyerName('');
      setSettlementAmount('');
      setSettlementDate('');
      setAssetType('Property');
      setReservePrice('');
      setCurrentBid('');
      setAuctionDate('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;
    
    setSubmitting(true);
    setError('');

    const payload = {
      caseStatus,
      caseNumber,
      lawyerName,
      settlementAmount: parseFloat(settlementAmount) || 0,
      settlementDate,
      auctionDetails: {
        assetType,
        reservePrice: parseFloat(reservePrice) || 0,
        currentBid: parseFloat(currentBid) || 0,
        auctionDate,
        status: caseStatus === 'Auction Completed' ? 'Sold' : caseStatus === 'Auction Scheduled' ? 'Active' : ''
      }
    };

    try {
      const response = await fetch(`/api/claims/${selectedClaim.id}/legal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update legal case details');

      await fetchClaims();
      setSelectedClaim(null);
      alert(`Legal case files for ${selectedClaim.id} updated!`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Server error saving legal details');
    } finally {
      setSubmitting(false);
    }
  };

  // Restrict mutations to roles with authority
  const hasAccess = user && ['Manager', 'Executive', 'Admin'].includes(user.role);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Legal Actions &amp; Asset Auctions</h2>
        <p className="text-sm text-slate-500 mt-1">Initiate lawsuit actions against defaulters, log settlement agreements, and manage asset auctions to recover outstanding loans.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Claims Table */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase">Case Recoveries</span>
          </div>

          <div className="overflow-x-auto">
            {manageableClaims.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 font-extrabold uppercase border-b border-slate-100">
                    <th className="p-3.5 pl-4">Claim ID</th>
                    <th className="p-3.5">Borrower</th>
                    <th className="p-3.5">Outstanding</th>
                    <th className="p-3.5">Litigation Status</th>
                    <th className="p-3.5 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {manageableClaims.map(claim => {
                    const statusColors = {
                      'None': 'bg-slate-100 text-slate-600',
                      'Notice Sent': 'bg-blue-100 text-blue-800',
                      'In Court': 'bg-indigo-100 text-indigo-800',
                      'Settled': 'bg-emerald-100 text-emerald-800',
                      'Auction Scheduled': 'bg-amber-100 text-amber-800',
                      'Auction Completed': 'bg-purple-100 text-purple-800'
                    };
                    const currentStatus = claim.legalAction?.caseStatus || 'None';

                    return (
                      <tr key={claim.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 pl-4 font-bold text-slate-900">{claim.id}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-700">{claim.borrowerName}</p>
                          <p className="text-[10px] text-slate-400">DPD: {claim.dpd}</p>
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">${claim.outstandingAmount?.toLocaleString()}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${statusColors[currentStatus]}`}>
                            {currentStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-4">
                          <button
                            onClick={() => handleSelectClaim(claim)}
                            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1 rounded-md transition-all cursor-pointer"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-400">
                No claims are currently approved and eligible for legal action.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Case Action Panel */}
        <div className="lg:col-span-6">
          {selectedClaim ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Manage Recovery Case: {selectedClaim.id}</h3>
                <p className="text-xs text-slate-400">Defaulter: {selectedClaim.borrowerName} | Outstanding balance: ${selectedClaim.outstandingAmount?.toLocaleString()}</p>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {!hasAccess ? (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs">
                  Read-only view. Your role does not possess permissions to edit litigation or schedule auctions.
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Case Status Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Litigation Status</label>
                    <select
                      value={caseStatus}
                      onChange={(e) => setCaseStatus(e.target.value)}
                      disabled={!hasAccess}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 font-semibold"
                    >
                      <option value="None">None (In Recovery Draft)</option>
                      <option value="Notice Sent">Legal Notice Issued</option>
                      <option value="In Court">Lawsuit Filed (In Court)</option>
                      <option value="Settled">Case Settled (Paid Out)</option>
                      <option value="Auction Scheduled">Auction Scheduled (Active Bid)</option>
                      <option value="Auction Completed">Auction Finalized (Asset Sold)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Legal Case Reference #</label>
                    <input
                      type="text"
                      value={caseNumber}
                      onChange={(e) => setCaseNumber(e.target.value)}
                      disabled={!hasAccess}
                      placeholder="e.g. CV-2026-9876"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Assigned Legal Counsel</label>
                    <input
                      type="text"
                      value={lawyerName}
                      onChange={(e) => setLawyerName(e.target.value)}
                      disabled={!hasAccess}
                      placeholder="Attorney's Full Name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                {/* Settlement Inputs (conditional) */}
                {caseStatus === 'Settled' && (
                  <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-4 animate-fade-in">
                    <div className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Landmark className="w-4 h-4 text-emerald-600" />
                      Settlement Details
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Agreed Settlement Amount ($)</label>
                        <input
                          type="number"
                          value={settlementAmount}
                          onChange={(e) => setSettlementAmount(e.target.value)}
                          disabled={!hasAccess}
                          placeholder="Settled Amount"
                          className="w-full p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-none text-slate-805"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Payment Receipt Date</label>
                        <input
                          type="date"
                          value={settlementDate}
                          onChange={(e) => setSettlementDate(e.target.value)}
                          disabled={!hasAccess}
                          className="w-full p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-none text-slate-805"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Auction Inputs (conditional) */}
                {(caseStatus === 'Auction Scheduled' || caseStatus === 'Auction Completed') && (
                  <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl space-y-4 animate-fade-in">
                    <div className="font-bold text-amber-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Hammer className="w-4 h-4 text-amber-600" />
                      Collateral Auction Details
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Collateral Type</label>
                        <select
                          value={assetType}
                          onChange={(e) => setAssetType(e.target.value)}
                          disabled={!hasAccess}
                          className="w-full p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-none text-slate-800 font-semibold"
                        >
                          <option value="Property">Real Estate / Commercial Property</option>
                          <option value="Vehicle">Automobile / Machinery Fleet</option>
                          <option value="Equipment">Factory/Tech Equipment</option>
                          <option value="Inventory">Raw Materials / Inventory Assets</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Auction Date</label>
                        <input
                          type="date"
                          value={auctionDate}
                          onChange={(e) => setAuctionDate(e.target.value)}
                          disabled={!hasAccess}
                          className="w-full p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-none text-slate-800"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Reserve Price ($)</label>
                        <input
                          type="number"
                          value={reservePrice}
                          onChange={(e) => setReservePrice(e.target.value)}
                          disabled={!hasAccess}
                          placeholder="Minimum Valuation Price"
                          className="w-full p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-none text-slate-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                          {caseStatus === 'Auction Completed' ? 'Winning Auction Bid ($)' : 'Current Highest Bid ($)'}
                        </label>
                        <input
                          type="number"
                          value={currentBid}
                          onChange={(e) => setCurrentBid(e.target.value)}
                          disabled={!hasAccess}
                          placeholder="Highest Offer Price"
                          className="w-full p-2.5 bg-white border border-slate-250 rounded-lg focus:outline-none text-slate-805"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {hasAccess && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClaim(null)}
                      className="px-4 py-2 border border-slate-200 hover:border-slate-350 text-slate-600 rounded-lg font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Hammer className="w-4 h-4" />
                      )}
                      Save Case Settings
                    </button>
                  </div>
                )}

              </form>

            </div>
          ) : (
            <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-[400px]">
              <Scale className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-500">Select an approved recovery case to manage</p>
              <p className="text-[10px] text-slate-400 mt-1">Audit court notices, record settlements, or scheduling auctions.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
