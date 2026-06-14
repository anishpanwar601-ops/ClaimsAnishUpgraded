import React, { useState } from 'react';
import { Save, ArrowLeft, RefreshCw, FileText, CheckCircle } from 'lucide-react';

export default function ClaimTemplate({ claim, onBack, onSave, mode = 'create' }) {
  const [borrowerName, setBorrowerName] = useState(claim.borrowerName || '');
  const [loanAmount, setLoanAmount] = useState(claim.loanAmount || '');
  const [outstandingAmount, setOutstandingAmount] = useState(claim.outstandingAmount || '');
  const [dpd, setDpd] = useState(claim.dpd || 0);
  const [aiRecommendation, setAiRecommendation] = useState(claim.aiRecommendation || 'Approve');
  const [justification, setJustification] = useState(claim.justification || '');
  const [status, setStatus] = useState(claim.status || 'Pending Review');
  const [saving, setSaving] = useState(false);

  const handleResetTemplate = () => {
    // Regenerate standard recommendation text based on values
    const npaStatus = dpd > 90;
    let category = npaStatus ? (dpd > 360 ? 'Loss' : dpd > 180 ? 'Doubtful' : 'Substandard') : 'Standard';
    
    let text = '';
    if (npaStatus) {
      text = `Account is non-performing for ${dpd} days (classified as ${category} Asset). Immediate recovery claim of $${parseFloat(outstandingAmount).toLocaleString()} is recommended under terms of credit guarantee cover.`;
    } else {
      text = `Account is overdue by ${dpd} days. The asset is performing (Standard Asset status). Claim is not recommended.`;
    }
    setJustification(text);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...claim,
      borrowerName,
      loanAmount: parseFloat(loanAmount),
      outstandingAmount: parseFloat(outstandingAmount),
      dpd: parseInt(dpd),
      aiRecommendation,
      justification,
      status
    };

    try {
      await onSave(payload);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
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
          Back
        </button>
        <span className="text-sm font-bold text-slate-400">
          {mode === 'edit' ? `Edit Template - ${claim.id}` : 'Claim Template Customization'}
        </span>
        <div className="w-16"></div>
      </header>

      {/* Editor Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Field Modifiers */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 self-start">
            <div>
              <h3 className="text-base font-bold text-slate-900">Variables Configuration</h3>
              <p className="text-xs text-slate-400 mt-0.5">Edit inputs to populate the letter template dynamically.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Borrower Name</label>
                <input
                  type="text"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-850"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Loan Principal ($)</label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-850"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Outstanding Bal ($)</label>
                  <input
                    type="number"
                    value={outstandingAmount}
                    onChange={(e) => setOutstandingAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-850"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Days Past Due (DPD)</label>
                  <input
                    type="number"
                    value={dpd}
                    onChange={(e) => setDpd(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-850"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Recommendation</label>
                  <select
                    value={aiRecommendation}
                    onChange={(e) => setAiRecommendation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-850 font-semibold"
                  >
                    <option value="Approve">Approve</option>
                    <option value="Manual Review">Manual Review</option>
                    <option value="Reject">Reject</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Approval Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-850 font-semibold"
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleResetTemplate}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-xs text-slate-500 hover:text-slate-700 rounded-xl transition-all cursor-pointer font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate Recommendation Text
            </button>
          </div>

          {/* Right Panel: Template Preview Editor */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center border-b border-slate-150 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Letter Justification Template</h3>
                <p className="text-xs text-slate-400 mt-0.5">Customize the body copy that prints onto the final PDF letter.</p>
              </div>
              <div className="bg-sky-50 text-sky-600 p-2 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="flex-1 flex flex-col space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase">Interactive Claim Justification Report</label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono text-xs leading-relaxed text-slate-800 resize-y min-h-[250px]"
                placeholder="Write customized claim justification reports here..."
                required
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition-all cursor-pointer"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4.5 h-4.5" />
                    Save &amp; Finalize Template
                  </>
                )}
              </button>
            </div>

          </div>

        </form>
      </main>
    </div>
  );
}
