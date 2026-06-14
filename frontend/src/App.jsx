import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ClaimProcess from './components/ClaimProcess';
import ClaimTemplate from './components/ClaimTemplate';
import LetterPreview from './components/LetterPreview';
import { Loader2 } from 'lucide-react';
import './App.css';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // login, dashboard, create-claim, edit-template, pdf-preview
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appInitializing, setAppInitializing] = useState(true);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });
          const data = await response.json();
          if (response.ok && data.user) {
            setToken(savedToken);
            setUser(data.user);
            setView('dashboard');
            await fetchClaims(savedToken);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error('Session validation error:', err);
          handleLogout();
        }
      } else {
        setView('login');
      }
      setAppInitializing(false);
    };

    checkSession();
  }, []);

  const fetchClaims = async (authToken) => {
    setLoading(true);
    try {
      const response = await fetch('/api/claims', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken || token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setClaims(data);
      }
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (authToken, loggedInUser) => {
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setUser(loggedInUser);
    setView('dashboard');
    fetchClaims(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setClaims([]);
    setView('login');
  };

  const handleStartNewClaim = () => {
    setView('create-claim');
  };

  const handleSelectClaim = (claim, mode) => {
    setSelectedClaim(claim);
    if (mode === 'template') {
      setView('edit-template');
    } else if (mode === 'pdf' || mode === 'view') {
      setView('pdf-preview');
    }
  };

  const handleSaveClaimFromWizard = async (claimData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(claimData)
      });
      const newClaim = response.ok ? await response.json() : null;
      if (newClaim) {
        await fetchClaims(token);
        setSelectedClaim(newClaim);
        setView('edit-template');
      } else {
        const errorData = await response.json();
        alert(`Failed to save claim: ${errorData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error saving claim:', err);
      alert('Failed to save claim details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClaimTemplate = async (updatedClaim) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/claims/${updatedClaim.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedClaim)
      });
      if (response.ok) {
        await fetchClaims(token);
        setView('dashboard');
      } else {
        alert('Failed to update claim on server');
      }
    } catch (err) {
      console.error('Error updating template:', err);
      alert('Network error saving template');
    } finally {
      setLoading(false);
    }
  };

  if (appInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
          <p className="text-sm font-semibold text-slate-400">Loading ClaimSphere Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'login' && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      
      {view === 'dashboard' && (
        <Dashboard 
          claims={claims} 
          onStartNewClaim={handleStartNewClaim}
          onSelectClaim={handleSelectClaim}
          onLogout={handleLogout}
          user={user}
          token={token}
          fetchClaims={fetchClaims}
        />
      )}

      {view === 'create-claim' && (
        <ClaimProcess 
          onBack={() => setView('dashboard')}
          onSaveClaim={handleSaveClaimFromWizard}
          token={token}
        />
      )}

      {view === 'edit-template' && selectedClaim && (
        <ClaimTemplate 
          claim={selectedClaim}
          onBack={() => setView('dashboard')}
          onSave={handleSaveClaimTemplate}
          mode={claims.some(c => c.id === selectedClaim.id) ? 'edit' : 'create'}
        />
      )}

      {view === 'pdf-preview' && selectedClaim && (
        <LetterPreview 
          claim={selectedClaim}
          onBack={() => setView('dashboard')}
          token={token}
        />
      )}
    </>
  );
}
