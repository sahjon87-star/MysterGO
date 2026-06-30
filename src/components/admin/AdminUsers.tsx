import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Users, 
  Search, 
  MoreVertical, 
  UserPlus, 
  Shield, 
  Trash2, 
  Ban,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { getInitials, formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const toggleBlock = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !currentStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = (users || []).filter(u => 
    (u.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (u.phone || '').includes(searchTerm) || 
    (u.email || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-cream dark:text-cream tracking-tight">User Management</h2>
          <p className="text-gray-teal dark:text-gray-teal text-xs font-bold uppercase tracking-widest">Manage platform customers</p>
        </div>
        <button className="w-12 h-12 bg-brand-dark dark:bg-primary-blue rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20 dark:shadow-primary-blue/20 active:scale-90 transition-all">
          <UserPlus className="text-cream w-6 h-6" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-teal dark:text-gray-teal" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, phone or email..."
          className="w-full bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-slate-900 dark:focus:ring-primary-blue outline-none shadow-sm font-medium text-sm text-cream dark:text-cream placeholder:text-gray-teal dark:placeholder:text-slate-600"
        />
      </div>

      {/* User List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-brand-slate dark:bg-brand-dark rounded-[32px] animate-pulse border border-slate-100 dark:border-slate-800" />)
        ) : filteredUsers.length === 0 ? (
          <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] p-16 text-center space-y-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="text-5xl opacity-20">👥</div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-tight text-sm text-cream dark:text-cream">No users found</h4>
              <p className="text-gray-teal dark:text-gray-teal text-[10px] font-medium">Try searching with a different term.</p>
            </div>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <motion.div 
              key={user.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 relative group transition-all duration-300 hover:shadow-glass-strong ${user.isBlocked ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-blue/30 group-hover:w-1.5 transition-all" />
              
              <div className="w-16 h-16 rounded-2xl bg-brand-slate dark:bg-brand-surface border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    className="w-full h-full object-cover" 
                    alt="Avatar" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-gray-teal dark:text-gray-teal font-black text-xl">{getInitials(user.name)}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  <h4 className="font-black text-cream dark:text-cream text-base tracking-tight leading-none truncate">{user.name || 'Anonymous User'}</h4>
                  {user.isBlocked && (
                    <span className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest shadow-lg shadow-red-500/20">Blacklisted</span>
                  )}
                  {user.walletBalance != null && (
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-emerald-500/10 tracking-widest">
                      {formatCurrency(user.walletBalance)}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-teal dark:text-gray-teal">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-primary-blue" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{user.phone || 'No Phone'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-primary-light" />
                    <span className="text-[10px] font-bold lowercase tracking-tight">{user.email || 'No Email'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex items-start gap-2 max-w-md">
                   <MapPin className="w-3.5 h-3.5 text-cream dark:text-slate-600 shrink-0 mt-0.5" />
                   <p className="text-[10px] font-medium text-gray-teal dark:text-gray-teal italic line-clamp-1">{user.address || 'Physical address not registered'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center border-l border-slate-50 dark:border-slate-800 pl-4">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleBlock(user.uid, user.isBlocked)}
                  className={`p-3 rounded-2xl transition-all shadow-sm ${user.isBlocked ? 'bg-primary-blue/10 text-primary-blue hover:bg-primary-blue/20' : 'bg-red-500/5 text-red-500 hover:bg-red-500/10'}`}
                  title={user.isBlocked ? "Reinstate User" : "Suspend User"}
                >
                  {user.isBlocked ? <CheckCircle2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
