import React, { useState } from 'react';
import { ArrowLeft, Download, FileText, Calendar, Check, Shield, FileCheck } from 'lucide-react';

export default function LetterPreview({ claim, onBack, token }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/claims/${claim.id}/pdf`, {
        method: 'GET',
        // Token is optional depending on auth setup of PDF route.
        // We set up backend PDF route without authenticateJWT for easy download redirection,
        // but if it expects auth, we can fetch as blob. Let's do fetch as blob so it works with token!
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('PDF generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Claim_Letter_${claim.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md py-4 px-6 sm:px-8 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <span className="text-sm font-bold text-slate-400">Official Claim Letter Preview</span>
        <div className="w-16"></div>
      </header>

      {/* Preview Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Actions bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-sky-50 text-sky-500 rounded-md">
              <FileCheck className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Ready</p>
              <h4 className="text-sm font-bold text-slate-800">claim-letter-{claim.id}.pdf</h4>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-lg text-sm shadow-md shadow-blue-500/10 hover:shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-4.5 h-4.5" />
                Download PDF Letter
              </>
            )}
          </button>
        </div>

        {/* Letter Layout Mockup (Standard A4 page ratio/look) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-10 max-w-2xl mx-auto space-y-8 font-sans relative overflow-hidden">
          {/* Top Decorative Blue bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-blue-900" />

          {/* Letter Header */}
          <div className="text-center pb-6 border-b border-slate-100">
            <h2 className="text-2xl font-black text-blue-900 tracking-tight">CLAIM ASSESSMENT REPORT</h2>
            <p className="text-slate-400 text-xs mt-1">Automated Audit &amp; Guarantee Recovery Review</p>
          </div>

          {/* Letter Meta Details */}
          <div className="flex justify-between text-xs text-slate-500">
            <div className="space-y-1">
              <p><span className="font-bold text-slate-700">Claim ID:</span> {claim.id}</p>
              <p><span className="font-bold text-slate-700">Workflow Status:</span> {claim.status.toUpperCase()}</p>
            </div>
            <div className="space-y-1 text-right">
              <p><span className="font-bold text-slate-700">Assessment Date:</span> {new Date(claim.createdAt).toLocaleDateString()}</p>
              <p><span className="font-bold text-slate-700">Audit Type:</span> Credit Cover Claim</p>
            </div>
          </div>

          {/* Table Details */}
          <div className="space-y-6">
            
            {/* Section 1 */}
            <div>
              <h4 className="text-sm font-bold text-blue-900 border-b border-blue-100 pb-1 uppercase tracking-wider">1. Borrower &amp; Loan Profile</h4>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs mt-3">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Borrower Name:</span>
                  <span className="font-semibold text-slate-800">{claim.borrowerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Loan Amount:</span>
                  <span className="font-semibold text-slate-800">${claim.loanAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Account Number:</span>
                  <span className="font-semibold text-slate-800">{claim.accountNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Outstanding Principal:</span>
                  <span className="font-semibold text-slate-800">${claim.outstandingAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Interest Rate:</span>
                  <span className="font-semibold text-slate-800">{claim.interestRate}%</span>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <h4 className="text-sm font-bold text-blue-900 border-b border-blue-100 pb-1 uppercase tracking-wider">2. Asset Performance Status</h4>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs mt-3">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Days Past Due (DPD):</span>
                  <span className="font-semibold text-slate-850">{claim.dpd} Days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">NPA Classification:</span>
                  <span className={`font-bold ${claim.npaStatus ? 'text-red-600' : 'text-green-600'}`}>
                    {claim.npaStatus ? claim.npaCategory : 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Last Receipt Date:</span>
                  <span className="font-semibold text-slate-800">{claim.lastPaymentDate || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">NPA Flag:</span>
                  <span className="font-semibold text-slate-800">{claim.npaStatus ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <h4 className="text-sm font-bold text-blue-900 border-b border-blue-100 pb-1 uppercase tracking-wider">3. AI Recommendations &amp; Audit Justification</h4>
              <div className="mt-3 bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">System Opinion:</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    claim.aiRecommendation === 'Approve' ? 'bg-emerald-100 text-emerald-800' :
                    claim.aiRecommendation === 'Reject' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {claim.aiRecommendation?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                  <span className="text-slate-500">Model Confidence:</span>
                  <span className="font-bold text-slate-700">{claim.aiConfidence}%</span>
                </div>
                <div>
                  <p className="font-bold text-slate-600 mb-1">Recovery Justification:</p>
                  <p className="text-slate-600 leading-relaxed text-[11px] italic">"{claim.justification}"</p>
                </div>
              </div>
            </div>

          </div>

          {/* Signature Block */}
          <div className="pt-8 border-t border-slate-100 text-[10px] text-slate-450 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p>Generated by: System AI Core Engine</p>
              <p>Timestamp: {new Date(claim.createdAt).toLocaleString()}</p>
            </div>
            <div className="space-y-3 text-right">
              <p className="border-b border-slate-300 w-44 ml-auto pt-2"></p>
              <p className="font-bold text-slate-600">Authorized Officer Signature</p>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
