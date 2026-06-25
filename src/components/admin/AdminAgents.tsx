import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { AdminProfile } from '../../types';
import toast from 'react-hot-toast';
import { Shield, Plus, X, UserCog, Power } from 'lucide-react';

export const AdminAgents = () => {
  const { isSuperAdmin } = useAuth();
  const [agents, setAgents] = useState<AdminProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // New Agent Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'sub-admin'>('sub-admin');
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canManageSupport, setCanManageSupport] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const q = query(collection(db, 'admins'));
    const unsub = onSnapshot(q, (snap) => {
      setAgents(snap.docs.map(doc => ({ adminId: doc.id, ...doc.data() } as AdminProfile)));
    });
    return () => unsub();
  }, [isSuperAdmin]);

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real scenario, you would trigger a Firebase Function to create the Auth User
      // Here we just create the document, assuming the user logs in with this email via Google/OTP
      const agentId = `admin_${Date.now()}`;
      await setDoc(doc(db, 'admins', agentId), {
        adminId: agentId,
        uid: agentId, // This should match auth UID in reality, here it's mock
        email,
        name,
        role,
        status: 'active',
        isOnline: false,
        currentActiveTickets: 0,
        permissions: {
          canManageUsers,
          canManageWorkers: canManageUsers,
          canViewEarnings: false,
          canManageSupport,
          canDeleteData: false
        },
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });
      toast.success("Agent added successfully!");
      setShowForm(false);
      setEmail('');
      setName('');
    } catch (error) {
      toast.error("Failed to add agent.");
    }
  };

  const toggleAgentStatus = async (agent: AdminProfile) => {
    try {
      await updateDoc(doc(db, 'admins', agent.adminId), {
        status: agent.status === 'active' ? 'inactive' : 'active'
      });
      toast.success("Status updated");
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  if (!isSuperAdmin) {
    return <div className="p-6 text-center text-cream">Unauthorized Access</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-cream uppercase tracking-tight">Support Agents</h1>
          <p className="text-gray-teal text-sm">Role-Based Access Control</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="p-3 bg-brand-amber text-brand-dark rounded-xl hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-brand-slate p-4 rounded-2xl border border-brand-surface overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-cream">Add Sub-Admin</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-teal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-teal uppercase tracking-wider mb-2 block">Name</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-brand-surface/50 border border-brand-surface rounded-xl p-3 text-cream text-sm focus:border-brand-amber outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-teal uppercase tracking-wider mb-2 block">Email</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-brand-surface/50 border border-brand-surface rounded-xl p-3 text-cream text-sm focus:border-brand-amber outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-teal uppercase tracking-wider mb-2 block">Permissions</label>
                <label className="flex items-center gap-2 text-cream text-sm">
                  <input type="checkbox" checked={canManageSupport} onChange={e => setCanManageSupport(e.target.checked)} className="rounded border-brand-surface text-brand-amber focus:ring-brand-amber" />
                  Support Desk (Live Chat)
                </label>
                <label className="flex items-center gap-2 text-cream text-sm">
                  <input type="checkbox" checked={canManageUsers} onChange={e => setCanManageUsers(e.target.checked)} className="rounded border-brand-surface text-brand-amber focus:ring-brand-amber" />
                  Manage Users & Workers
                </label>
              </div>
              <button type="submit" className="w-full py-3 bg-brand-amber text-brand-dark font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-amber/20">
                Create Agent
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.adminId} className="bg-brand-slate border border-brand-surface p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-surface rounded-xl text-gray-teal">
                <UserCog className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-cream text-sm flex items-center gap-2">
                  {agent.name}
                  <span className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                </h3>
                <p className="text-xs text-gray-teal">{agent.email}</p>
                <div className="flex gap-1 mt-1">
                  {agent.role === 'super-admin' && <span className="text-[9px] font-black uppercase tracking-widest text-brand-amber bg-brand-amber/10 px-2 py-0.5 rounded-sm">Super Admin</span>}
                  {agent.permissions.canManageSupport && <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-sm">Support</span>}
                </div>
              </div>
            </div>
            {agent.role !== 'super-admin' && (
              <button 
                onClick={() => toggleAgentStatus(agent)}
                className={`p-2 rounded-xl transition-all ${agent.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
              >
                <Power className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
