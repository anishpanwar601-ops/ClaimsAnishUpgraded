import React, { useState, useEffect } from 'react';
import { User, Shield, UserPlus, Trash2, Edit2, Key, Loader2, AlertCircle } from 'lucide-react';

export default function UsersTab({ token, user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [targetUserId, setTargetUserId] = useState(null);
  
  // Fields
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Clerk');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setUsername('');
    setName('');
    setRole('Clerk');
    setPassword('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (userObj) => {
    setModalMode('edit');
    setTargetUserId(userObj.id);
    setUsername(userObj.username);
    setName(userObj.name);
    setRole(userObj.role);
    setPassword(''); // Leave blank unless changing password
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    let url = '/api/users';
    let method = 'POST';
    let body = { username, password, name, role };

    if (modalMode === 'edit') {
      url = `/api/users/${targetUserId}`;
      method = 'PUT';
      // Only include password if entered
      body = password ? { name, role, password } : { name, role };
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit user details');

      await fetchUsers();
      setShowModal(false);
      alert(`User profile successfully ${modalMode === 'create' ? 'created' : 'updated'}.`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId, userN) => {
    if (userN === user.username) {
      alert('Cannot delete your own active session account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user account "${userN}"?`)) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchUsers();
        alert('User deleted successfully.');
      } else {
        const err = await response.json();
        alert(`Failed to delete user: ${err.error || 'Error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting user');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-3" />
        <p className="text-sm font-semibold">Retrieving system user database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System User Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Manage user access authorizations, modify employee roles, and reset credentials.</p>
        </div>
        
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Create New User Account
        </button>
      </div>

      {showModal ? (
        /* Form Card */
        <div className="max-w-xl bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">{modalMode === 'create' ? 'Register New User Profile' : 'Edit User Profile Settings'}</h3>
            <p className="text-xs text-slate-400">Specify login credentials, employee name, and portal role authorizations.</p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Username (Login ID)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={modalMode === 'edit'}
                  placeholder="e.g. clerk2"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 disabled:opacity-60 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Green"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">System Access Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-semibold"
                  required
                >
                  <option value="Clerk">Clerk (Analyst)</option>
                  <option value="Manager">Operations Manager</option>
                  <option value="Executive">Senior Executive</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                  {modalMode === 'create' ? 'Account Password' : 'Reset Password (Leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password value"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850 focus:outline-none"
                  required={modalMode === 'create'}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
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
                {modalMode === 'create' ? 'Create Account' : 'Save Profiles'}
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* Users Directory Table */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 font-extrabold uppercase border-b border-slate-100">
                  <th className="p-4 pl-6">ID</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Access Role</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-4 pl-6 font-bold text-slate-400">{u.id}</td>
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      {u.username}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{u.name}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        u.role === 'Admin' ? 'bg-red-50 text-red-700' :
                        u.role === 'Executive' ? 'bg-indigo-50 text-indigo-700' :
                        u.role === 'Manager' ? 'bg-amber-50 text-amber-700' :
                        'bg-sky-50 text-sky-700'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-550 rounded transition-all cursor-pointer inline-flex items-center justify-center border border-slate-200"
                        title="Edit Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer inline-flex items-center justify-center border border-rose-100"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
