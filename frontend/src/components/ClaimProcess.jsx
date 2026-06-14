import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Activity, Cpu, Sparkles, AlertCircle } from 'lucide-react';

export default function ClaimProcess({ onBack, onSaveClaim, token }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    accountNumber: '',
    borrowerName: '',
    loanAmount: '',
    outstandingAmount: '',
    interestRate: '8.5',
    dpd: '',
    lastPaymentDate: '',
  });

  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNextStep = async () => {
    if (step === 1) {
      // Validate step 1 fields
      if (!formData.accountNumber || !formData.borrowerName || !formData.loanAmount || !formData.outstandingAmount) {
        setError('Please fill in all borrower and loan amount details');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      // Validate step 2 fields
      if (!formData.dpd || !formData.lastPaymentDate) {
        setError('Please fill in default history details');
        return;
      }
      setError('');
      
      // Perform AI NPA evaluation call
      setLoading(true);
      try {
        const response = await fetch('/api/claims/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Evaluation failed');

        setEvaluation(data);
        setStep(3);
      } catch (err) {
        setError(err.message || 'Failed to connect to rule evaluation server');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFinish = () => {
    // Send form data merged with the final evaluation to save it
    onSaveClaim({
      ...formData,
      ...evaluation
    });
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
          Cancel
        </button>
        <span className="text-sm font-bold text-slate-400">Evaluate Claim Wizard</span>
        <div className="w-16"></div>
      </header>

      {/* Progress Wizard Header */}
      <div className="max-w-3xl w-full mx-auto mt-8 px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              step >= 1 ? 'bg-sky-500 text-white ring-4 ring-sky-100' : 'bg-slate-200 text-slate-500'
            }`}>
              1
            </div>
            <span className="text-xs font-semibold mt-2 text-slate-600">Loan Details</span>
          </div>

          <div className={`flex-1 h-0.5 mx-4 transition-all ${step >= 2 ? 'bg-sky-500' : 'bg-slate-200'}`} />

          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              step >= 2 ? 'bg-sky-500 text-white ring-4 ring-sky-100' : 'bg-slate-200 text-slate-500'
            }`}>
              2
            </div>
            <span className="text-xs font-semibold mt-2 text-slate-600">NPA Parameters</span>
          </div>

          <div className={`flex-1 h-0.5 mx-4 transition-all ${step >= 3 ? 'bg-sky-500' : 'bg-slate-200'}`} />

          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              step >= 3 ? 'bg-sky-500 text-white ring-4 ring-sky-100' : 'bg-slate-200 text-slate-500'
            }`}>
              3
            </div>
            <span className="text-xs font-semibold mt-2 text-slate-600">AI Evaluation</span>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Loan & Account Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Step 1: Input Loan Account Details</h3>
                <p className="text-xs text-slate-500">Provide the general borrower account profile information.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Loan Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    placeholder="e.g. LN123456789"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Borrower Full Name</label>
                  <input
                    type="text"
                    name="borrowerName"
                    value={formData.borrowerName}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Original Loan Sanction Amount ($)</label>
                  <input
                    type="number"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleChange}
                    placeholder="e.g. 150000"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Outstanding Principal Balance ($)</label>
                  <input
                    type="number"
                    name="outstandingAmount"
                    value={formData.outstandingAmount}
                    onChange={handleChange}
                    placeholder="e.g. 132000"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Contractual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="interestRate"
                    value={formData.interestRate}
                    onChange={handleChange}
                    placeholder="e.g. 7.9"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: NPA Classification Criteria */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Step 2: Default Parameters</h3>
                <p className="text-xs text-slate-500">Provide payment defaults and last receipt timelines to execute audit rules.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Days Past Due (DPD)</label>
                  <input
                    type="number"
                    name="dpd"
                    value={formData.dpd}
                    onChange={handleChange}
                    placeholder="e.g. 105"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">DPD &gt; 90 will categorize the asset as Non-Performing (NPA).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Last Payment Received Date</label>
                  <input
                    type="date"
                    name="lastPaymentDate"
                    value={formData.lastPaymentDate}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Rule engine evaluation display */}
          {step === 3 && evaluation && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-sky-500 mb-1">
                  <Cpu className="w-5 h-5" />
                  <span className="font-bold text-xs uppercase tracking-wider">Rule Engine Classification Result</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Step 3: Recommendation Decisions</h3>
              </div>

              {/* Assessment Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">NPA Classification</span>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${evaluation.npaStatus ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-lg font-bold">{evaluation.npaCategory} Asset</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1">Status: {evaluation.npaStatus ? 'Overdue Exceeds 90 Days' : 'Standard Performing Asset'}</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Recommendation Decision</span>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                      evaluation.aiRecommendation === 'Approve' ? 'bg-emerald-100 text-emerald-800' :
                      evaluation.aiRecommendation === 'Reject' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {evaluation.aiRecommendation}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1">Confidence Score: {evaluation.aiConfidence}%</span>
                </div>
              </div>

              {/* Justification Box */}
              <div className="p-5 rounded-xl border border-sky-100 bg-sky-50/30">
                <div className="flex items-center gap-1.5 text-sky-700 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Generated Justification Report</span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{evaluation.justification}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-slate-500 text-xs flex gap-2">
                <Activity className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                <span>
                  By proceeding, this evaluation profile will load into a claim recovery letter template. You can customize the terms and text before saving.
                </span>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-lg text-sm transition-all cursor-pointer font-semibold"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm transition-all cursor-pointer font-semibold"
              >
                {loading ? 'Evaluating...' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-lg text-sm shadow-md shadow-blue-500/10 hover:shadow-blue-500/25 transition-all cursor-pointer"
              >
                Proceed to Template Editor
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
