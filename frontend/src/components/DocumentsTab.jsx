import React, { useState } from 'react';
import { Folder, Upload, FileText, Search, Filter, Trash2, Download, Eye, AlertCircle, Loader2 } from 'lucide-react';

export default function DocumentsTab({ claims, token, fetchClaims, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('All');
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [claimId, setClaimId] = useState('');
  const [fileName, setFileName] = useState('');
  const [docType, setDocType] = useState('Loan Agreement');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Extract all documents across all claims
  const allDocs = claims.reduce((acc, claim) => {
    if (claim.documents && claim.documents.length > 0) {
      const mapped = claim.documents.map(d => ({
        ...d,
        claimId: claim.id,
        borrowerName: claim.borrowerName
      }));
      return [...acc, ...mapped];
    }
    return acc;
  }, []);

  // Filter and search
  const filteredDocs = allDocs.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.claimId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.borrowerName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesTag = tagFilter === 'All' || d.type === tagFilter;

    return matchesSearch && matchesTag;
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!claimId || !fileName || !docType) {
      setError('Please fill in all required upload parameters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/claims/${claimId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: fileName.endsWith('.pdf') || fileName.endsWith('.jpg') || fileName.endsWith('.png') ? fileName : `${fileName}.pdf`,
          type: docType,
          size: fileSize
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload document');

      await fetchClaims();
      setShowUploadModal(false);
      setClaimId('');
      setFileName('');
      setFileSize('1.5 MB');
      alert('Mock document successfully added to claim vault.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Server connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (claimId, docId) => {
    if (!confirm('Are you sure you want to permanently delete this document reference?')) return;

    try {
      const response = await fetch(`/api/claims/${claimId}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchClaims();
        alert('Document reference deleted successfully.');
      } else {
        alert('Failed to delete document reference.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting document');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Documents Vault</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and audit credit files, collateral photos, and court litigation notices securely.</p>
        </div>
        
        <button
          onClick={() => { setShowUploadModal(!showUploadModal); setError(''); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer transition-all"
        >
          <Upload className="w-4 h-4" />
          Simulate File Upload
        </button>
      </div>

      {showUploadModal ? (
        /* Upload form */
        <div className="max-w-xl bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Upload Mock Document reference</h3>
            <p className="text-xs text-slate-400">Simulate file transfers and append documents to specific claim files.</p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Select Target Claim</label>
              <select
                value={claimId}
                onChange={(e) => setClaimId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-semibold"
                required
              >
                <option value="">-- Choose Claim --</option>
                {claims.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.borrowerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Document Tag Classification</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-semibold"
                  required
                >
                  <option value="Loan Agreement">Loan Agreement Contract</option>
                  <option value="Collateral Photo">Collateral Assets Photo</option>
                  <option value="ID Proof">Borrower ID Verification</option>
                  <option value="Audit Report">AI Audit Report</option>
                  <option value="Legal Notice">Legal Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Simulated File Size</label>
                <select
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-semibold"
                >
                  <option value="420 KB">420 KB</option>
                  <option value="1.2 MB">1.2 MB</option>
                  <option value="2.8 MB">2.8 MB</option>
                  <option value="12.5 MB">12.5 MB</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">File Name</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. signed_loan_contract_v2"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-semibold"
                required
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowUploadModal(false); setClaimId(''); setFileName(''); setError(''); }}
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
                Attach Document
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* Repository list */
        <div className="space-y-4">
          
          {/* Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, claim or borrower..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full sm:w-44 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold text-slate-800"
              >
                <option value="All">All Categories</option>
                <option value="Loan Agreement">Loan Agreement</option>
                <option value="Collateral Photo">Collateral Photo</option>
                <option value="ID Proof">ID Proof</option>
                <option value="Audit Report">Audit Report</option>
                <option value="Legal Notice">Legal Notice</option>
              </select>
            </div>
          </div>

          {/* Grid list of files */}
          {filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-sky-50 text-sky-500 rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <h4 className="font-bold text-slate-900 text-xs truncate" title={doc.name}>{doc.name}</h4>
                      <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold">
                        {doc.type}
                      </span>
                      <p className="text-[10px] text-slate-400">Claim: {doc.claimId}</p>
                      <p className="text-[10px] text-slate-400 truncate">Borrower: {doc.borrowerName}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 mt-5 pt-3.5 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <div>
                      <p>Uploaded by: {doc.uploadedBy}</p>
                      <p>{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => alert(`Simulating file preview: ${doc.name} (${doc.size})`)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-all cursor-pointer"
                        title="View File"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(doc.claimId, doc.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-all cursor-pointer"
                        title="Delete Reference"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 text-xs flex flex-col items-center justify-center">
              <Folder className="w-12 h-12 text-slate-200 mb-3" />
              <p className="font-semibold text-slate-500">No documents found in vault</p>
              <p className="text-[10px] text-slate-400 mt-1">Upload mock files or try altering filter parameters.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
