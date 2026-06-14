import React, { useState, useEffect } from 'react';
import { 
  Plus, Download, FileText, CheckCircle, XCircle, AlertTriangle, Eye, Search, Filter, 
  LayoutDashboard, Scale, ShieldCheck, DollarSign, Folder, ClipboardList, Users, 
  Bell, LogOut, ShieldAlert, Sparkles, ChevronRight, Check
} from 'lucide-react';

import AnalyticsTab from './AnalyticsTab';
import ApprovalsTab from './ApprovalsTab';
import LegalTab from './LegalTab';
import RefundsTab from './RefundsTab';
import DocumentsTab from './DocumentsTab';
import AuditLogsTab from './AuditLogsTab';
import UsersTab from './UsersTab';

export default function Dashboard({ 
  claims, onStartNewClaim, onSelectClaim, onLogout, user, token, fetchClaims 
}) {
  const [activeTab, setActiveTab] = useState('analytics'); // analytics, claims, approvals, legal, refunds, documents, audit, users
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Detail Drawer States
  const [viewingClaimDetails, setViewingClaimDetails] = useState(null);
  const [resolvingFraud, setResolvingFraud] = useState(false);

  // Stats Calculations
  const totalClaims = claims.length;
  const approvedClaims = claims.filter(c => c.status === 'Approved').length;
  const pendingClaims = claims.filter(c => ['Pending Review', 'Refund Pending', 'Refund Approved'].includes(c.status)).length;
  const npaClaimsCount = claims.filter(c => c.npaStatus).length;
  const npaPercentage = totalClaims > 0 ? Math.round((npaClaimsCount / totalClaims) * 100) : 0;

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Refresh claims and notifications periodically
    const interval = setInterval(() => {
      fetchClaims();
      fetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleMarkNotificationRead = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveFraud = async (claimId, status) => {
    setResolvingFraud(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/fraud/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        await fetchClaims();
        // Update local viewing details
        setViewingClaimDetails(prev => ({ ...prev, fraudStatus: status }));
        alert(`Fraud alert status marked as: ${status}`);
      } else {
        alert('Failed to update fraud status');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingFraud(false);
    }
  };

  // Filter & Search Logic
  const filteredClaims = claims.filter(c => {
    const matchesSearch = 
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.accountNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Pending' && c.status === 'Pending Review') ||
      (statusFilter === 'Approved' && c.status === 'Approved') ||
      (statusFilter === 'Rejected' && c.status === 'Rejected') ||
      (statusFilter === 'Escalated' && c.status === 'Escalated') ||
      (statusFilter === 'Legal' && ['Legal Action', 'Auction Scheduled', 'Auction Completed', 'Settled'].includes(c.status)) ||
      (statusFilter === 'Refunds' && ['Refund Pending', 'Refund Approved', 'Refund Processed', 'Refund Rejected'].includes(c.status)) ||
      (statusFilter === 'Fraud' && c.fraudStatus === 'Suspicious');

    return matchesSearch && matchesStatus;
  });

  const unreadNotifs = notifications.filter(n => !n.read);

  // Role Access Gates
  const isManagerOrAbove = user && ['Manager', 'Executive', 'Admin'].includes(user.role);
  const isExecOrAbove = user && ['Executive', 'Admin'].includes(user.role);
  const isAdmin = user && user.role === 'Admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-850 shrink-0 relative z-20">
        
        {/* Brand Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">ClaimSphere</h1>
            <p className="text-[9px] text-sky-400 font-bold tracking-wider uppercase">Enterprise Recovery AI</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto text-xs font-bold uppercase tracking-wider">
          
          {/* Analytics Dashboard */}
          <button
            onClick={() => { setActiveTab('analytics'); setViewingClaimDetails(null); }}
            className={`w-full flex items-center gap-3 py-3 px-6 text-left transition-all cursor-pointer ${
              activeTab === 'analytics' ? 'nav-item-active' : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-sky-400" />
            Analytics
          </button>

          {/* Claims Database */}
          <button
            onClick={() => { setActiveTab('claims'); setViewingClaimDetails(null); }}
            className={`w-full flex items-center gap-3 py-3 px-6 text-left transition-all cursor-pointer ${
              activeTab === 'claims' ? 'nav-item-active' : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            Claims Registry
          </button>

          {/* Approvals (Compliance gate) */}
          {isManagerOrAbove && (
            <button
              onClick={() => { setActiveTab('approvals'); setViewingClaimDetails(null); }}
              className={`w-full flex items-center gap-3 py-3 px-6 text-left transition-all cursor-pointer ${
                activeTab === 'approvals' ? 'nav-item-active' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Approvals Queue
            </button>
          )}

          {/* Legal Actions */}
          <button
            onClick={() => { setActiveTab('legal'); setViewingClaimDetails(null); }}
            className={`w-full flex items-center gap-3 py-3 px-6 text-left transition-all cursor-pointer ${
              activeTab === 'legal' ? 'nav-item-active' : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4 text-indigo-400" />
            Litigation &amp; Auctions
          </button>

          {/* Refunds module */}
          <button
            onClick={() => { setActiveTab('refunds'); setViewingClaimDetails(null); }}
            className={`w-full flex items-center gap-3 py-3 px-6 text-left transition-all cursor-pointer ${
              activeTab === 'refunds' ? 'nav-item-active' : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Refunds Portal
          </button>

          {/* Documents Vault */}
          <button
            onClick={() => { setActiveTab('documents'); setViewingClaimDetails(null); }}
            className={`w-full flex items-center gap-3 py-3 px-6 text-left transition-all cursor-pointer ${
              activeTab === 'documents' ? 'nav-item-active' : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Folder className="w-4 h-4 text-sky-400" />
            Documents Vault
          </button>

          {/* Audit Logs (Admin/Executive only) */}
          {isExecOrAbove && (
            <button
              onClick={() => { setActiveTab('audit'); setViewingClaimDetails(null); }}
              className={`w-full flex items-center gap-3 py-3 px-6 text-left transition-all cursor-pointer ${
                activeTab === 'audit' ? 'nav-item-active' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-slate-400" />
              Audit Logs
            </button>
          )}

          {/* Users Admin (Admin only) */}
          {isAdmin && (
            <button
              onClick={() => { setActiveTab('users'); setViewingClaimDetails(null); }}
              className={`w-full flex items-center gap-3 py-3 px-6 text-left transition-all cursor-pointer ${
                activeTab === 'users' ? 'nav-item-active' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-rose-400" />
              User Directory
            </button>
          )}

        </nav>

        {/* User Card Profile & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white uppercase">
              {user?.username?.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-850 hover:bg-rose-950/20 text-slate-400 hover:text-rose-200 border border-slate-800 hover:border-rose-900/50 rounded-xl transition-all cursor-pointer text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            Log Out Session
          </button>
        </div>

      </aside>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-100 py-4 px-6 flex justify-between items-center relative z-15">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            ClaimSphere Portal &gt; <span className="text-slate-900">{activeTab}</span>
          </h2>
          
          <div className="flex items-center gap-4">
            
            {/* Notification Badge Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-slate-50 border border-slate-150 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer relative"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-0 right-0 w-4.5 h-4.5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] font-black border border-white animate-bounce">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-slate-150 shadow-2xl overflow-hidden py-2 animate-fade-in z-30">
                  <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 uppercase">System Alerts</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div 
                          key={notif.id}
                          onClick={() => handleMarkNotificationRead(notif.id)}
                          className={`p-3 text-[11px] leading-relaxed cursor-pointer transition-all flex gap-3 ${
                            notif.read ? 'text-slate-500 hover:bg-slate-50' : 'bg-sky-50/20 text-slate-800 font-bold hover:bg-sky-50/30'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-slate-200' : 'bg-sky-500'}`} />
                          <div>
                            <p>{notif.message}</p>
                            <span className="text-[9px] text-slate-400 font-medium block mt-1">
                              {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs font-semibold">No alerts logged</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick action for Clerks */}
            {user?.role === 'Clerk' && activeTab === 'claims' && (
              <button
                onClick={onStartNewClaim}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-lg text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                New Evaluation
              </button>
            )}
          </div>
        </header>

        {/* Tab switcher area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* Analytics View */}
          {activeTab === 'analytics' && (
            <AnalyticsTab token={token} />
          )}

          {/* Claims List View */}
          {activeTab === 'claims' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Claims Database Registry</h2>
                  <p className="text-sm text-slate-500 mt-1">Search active files, audit recommendations, and finalize letter drafts.</p>
                </div>
                
                {user?.role === 'Clerk' && (
                  <button 
                    onClick={onStartNewClaim}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    Evaluate New Claim
                  </button>
                )}
              </div>

              {/* Stats row shortcut */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Files</span>
                  <span className="text-lg font-black text-slate-900">{totalClaims}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Under Review</span>
                  <span className="text-lg font-black text-amber-600">{pendingClaims}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Approved</span>
                  <span className="text-lg font-black text-emerald-600">{approvedClaims}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">NPA Overdue Ratio</span>
                  <span className="text-lg font-black text-rose-600">{npaPercentage}%</span>
                </div>
              </div>

              {/* Filter controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by Claim ID, Borrower name or Loan number..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-805"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto text-xs">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full md:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="All">All statuses</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Legal">Legal Actions / Auctions</option>
                    <option value="Refunds">Refund Processings</option>
                    <option value="Fraud">⚠️ Suspected Fraud</option>
                  </select>
                </div>
              </div>

              {/* Table database grid */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  {filteredClaims.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-450 font-extrabold uppercase border-b border-slate-100">
                          <th className="py-4 px-6">Claim ID</th>
                          <th className="py-4 px-6">Borrower Profile</th>
                          <th className="py-4 px-6">Overdue (DPD)</th>
                          <th className="py-4 px-6">Outstanding Amount</th>
                          <th className="py-4 px-6">Workflow Status</th>
                          <th className="py-4 px-6">AI Evaluation</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredClaims.map((claim) => (
                          <tr key={claim.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="py-4 px-6 font-bold text-slate-900">{claim.id}</td>
                            <td className="py-4 px-6">
                              <p className="font-semibold text-slate-700">{claim.borrowerName}</p>
                              <p className="text-[10px] text-slate-400">Acc: {claim.accountNumber}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                claim.dpd > 90 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {claim.dpd} Days
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-bold text-slate-800">${claim.outstandingAmount?.toLocaleString()}</p>
                              <p className="text-[10px] text-slate-400">of ${claim.loanAmount?.toLocaleString()}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
                                claim.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                claim.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                claim.status === 'Escalated' ? 'bg-purple-100 text-purple-800 animate-pulse' :
                                claim.status.startsWith('Refund') ? 'bg-amber-100 text-amber-800' :
                                claim.status.startsWith('Auction') ? 'bg-purple-50 text-purple-700' :
                                claim.status === 'Legal Action' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {claim.status}
                              </span>
                              {claim.fraudStatus === 'Suspicious' && (
                                <span className="block text-[9px] text-rose-600 font-bold mt-1">⚠️ Suspected Fraud</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                                claim.aiRecommendation === 'Approve' ? 'bg-emerald-50 text-emerald-700' :
                                claim.aiRecommendation === 'Reject' ? 'bg-rose-50 text-rose-700' :
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {claim.aiRecommendation}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right pr-6 space-x-1.5">
                              <button
                                onClick={() => setViewingClaimDetails(claim)}
                                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                                title="View Complete details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              {/* Clerks can edit template before approval */}
                              {['Clerk', 'Admin'].includes(user?.role) && ['Pending Review', 'Refund Rejected', 'Rejected'].includes(claim.status) && (
                                <button
                                  onClick={() => onSelectClaim(claim, 'template')}
                                  className="p-2 hover:bg-sky-50 text-sky-600 hover:text-sky-800 rounded-lg transition-all cursor-pointer"
                                  title="Edit Claim Template"
                                >
                                  <FileText className="w-4.5 h-4.5" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => onSelectClaim(claim, 'pdf')}
                                className="p-2 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-850 rounded-lg transition-all cursor-pointer"
                                title="Download assessment letter PDF"
                              >
                                <Download className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-slate-400">
                      No claims matches this filter setting.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Approvals tab mounted */}
          {activeTab === 'approvals' && (
            <ApprovalsTab 
              claims={claims} 
              token={token} 
              fetchClaims={fetchClaims} 
              user={user} 
            />
          )}

          {/* Legal Tab mounted */}
          {activeTab === 'legal' && (
            <LegalTab 
              claims={claims} 
              token={token} 
              fetchClaims={fetchClaims} 
              user={user} 
            />
          )}

          {/* Refunds Tab mounted */}
          {activeTab === 'refunds' && (
            <RefundsTab 
              claims={claims} 
              token={token} 
              fetchClaims={fetchClaims} 
              user={user} 
            />
          )}

          {/* Documents Tab mounted */}
          {activeTab === 'documents' && (
            <DocumentsTab 
              claims={claims} 
              token={token} 
              fetchClaims={fetchClaims} 
              user={user} 
            />
          )}

          {/* Audit Logs tab mounted */}
          {activeTab === 'audit' && (
            <AuditLogsTab token={token} />
          )}

          {/* Users Admin tab mounted */}
          {activeTab === 'users' && (
            <UsersTab token={token} user={user} />
          )}

        </main>
      </div>

      {/* Claim Detail Drawer overlay (Conditional) */}
      {viewingClaimDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50 animate-fade-in">
          
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-slide-in-left">
            
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                      Claim file: {viewingClaimDetails.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      viewingClaimDetails.fraudStatus === 'Suspicious' ? 'bg-rose-100 text-rose-800' :
                      viewingClaimDetails.fraudStatus === 'Muted' ? 'bg-slate-100 text-slate-500' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      Security: {viewingClaimDetails.fraudStatus}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{viewingClaimDetails.borrowerName}</h3>
                  <p className="text-xs text-slate-400">Account: {viewingClaimDetails.accountNumber}</p>
                </div>
                <button
                  onClick={() => setViewingClaimDetails(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  ✕ Close panel
                </button>
              </div>

              {/* Fraud Alerts warn panel */}
              {viewingClaimDetails.fraudStatus === 'Suspicious' && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-3 border-pulse-red">
                  <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold uppercase tracking-wider">
                    <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
                    ⚠️ Security Alert: Fraud Warning flagged
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {viewingClaimDetails.fraudAlerts && viewingClaimDetails.fraudAlerts.map((alert, idx) => (
                      <div key={idx} className="pl-2.5 border-l-2 border-rose-400">
                        <span className="font-bold text-rose-700">{alert.type}:</span> {alert.message}
                      </div>
                    ))}
                  </div>

                  {isManagerOrAbove && (
                    <div className="pt-2 border-t border-rose-100 flex items-center gap-2 text-xs">
                      <button
                        onClick={() => handleResolveFraud(viewingClaimDetails.id, 'Muted')}
                        disabled={resolvingFraud}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer transition-all"
                      >
                        Mute / Dismiss Warning
                      </button>
                      <button
                        onClick={() => handleResolveFraud(viewingClaimDetails.id, 'Confirmed')}
                        disabled={resolvingFraud}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer transition-all"
                      >
                        Confirm Duplicate Fraud
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold block">Loan Principal</span>
                  <span className="font-bold text-slate-850">${viewingClaimDetails.loanAmount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Outstanding Principal</span>
                  <span className="font-bold text-slate-850">${viewingClaimDetails.outstandingAmount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Contract DPD</span>
                  <span className="font-bold text-slate-850">{viewingClaimDetails.dpd} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">NPA classification</span>
                  <span className="font-bold text-slate-850">{viewingClaimDetails.npaCategory}</span>
                </div>
              </div>

              {/* Justification text */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-sky-500 animate-pulse" />
                  AI recommendation report opinion
                </span>
                <div className="bg-sky-50/20 border border-sky-100 p-4 rounded-xl leading-relaxed italic text-slate-700">
                  "{viewingClaimDetails.justification}"
                </div>
              </div>

              {/* Linked documents list shortcut */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-sky-500" />
                  Attached Guarantee evidence files
                </span>
                
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/20">
                  {viewingClaimDetails.documents && viewingClaimDetails.documents.length > 0 ? (
                    viewingClaimDetails.documents.map(doc => (
                      <div key={doc.id} className="p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="font-bold text-slate-800">{doc.name}</p>
                            <span className="text-[10px] text-slate-400">{doc.type} | {doc.size}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">By {doc.uploadedBy}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400">
                      No guarantee evidence files uploaded. Go to "Documents Vault" to attach verification letters.
                    </div>
                  )}
                </div>
              </div>

              {/* History logs */}
              {viewingClaimDetails.history && viewingClaimDetails.history.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-slate-400" />
                    Audit actions log
                  </span>
                  
                  <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto bg-slate-50/20">
                    {viewingClaimDetails.history.map((h, i) => (
                      <div key={i} className="p-2.5 flex justify-between gap-4">
                        <div>
                          <span className="font-bold text-slate-800">{h.user}</span>
                          <span className="text-slate-400 mx-1 font-semibold">marked</span>
                          <span className="font-bold bg-slate-100 text-slate-600 px-1 rounded text-[9px]">{h.action}</span>
                          <p className="text-slate-500 mt-0.5">{h.comment}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 shrink-0 font-medium mt-0.5">
                          {new Date(h.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setViewingClaimDetails(null)}
                className="px-4 py-2 border border-slate-200 hover:border-slate-350 text-slate-600 font-bold rounded-lg cursor-pointer"
              >
                Close details
              </button>
              
              <button
                onClick={() => { onSelectClaim(viewingClaimDetails, 'pdf'); setViewingClaimDetails(null); }}
                className="flex items-center gap-1 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download PDF Letter
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
