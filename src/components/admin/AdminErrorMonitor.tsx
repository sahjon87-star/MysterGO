import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppError } from '../../types';
import { Bug, Clock, AlertTriangle, Monitor, Smartphone, CheckCircle, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminErrorMonitor = () => {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedError, setSelectedError] = useState<AppError | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'app_errors'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const errorData = snapshot.docs.map(doc => ({
        ...doc.data(),
        errorId: doc.id
      })) as AppError[];
      
      setErrors(errorData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (errorId: string, newStatus: AppError['status']) => {
    try {
      await updateDoc(doc(db, 'app_errors', errorId), {
        status: newStatus
      });
      if (selectedError?.errorId === errorId) {
         setSelectedError(prev => prev ? {...prev, status: newStatus} : null);
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const filteredErrors = errors.filter(err => {
    const matchesFilter = filter === 'all' || err.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      err.message.toLowerCase().includes(searchLower) ||
      err.location.page.toLowerCase().includes(searchLower) ||
      err.location.component.toLowerCase().includes(searchLower) ||
      (err.errorId || '').toLowerCase().includes(searchLower);
    
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Bug className="w-6 h-6 text-red-500" />
            Error Monitor
          </h1>
          <p className="text-gray-teal mt-1">Real-time system crash & exception logging</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
           {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 bg-brand-slate p-4 rounded-3xl border border-brand-surface shadow-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-teal" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search error message, component..."
                className="w-full bg-brand-dark/50 border border-brand-surface rounded-2xl pl-12 pr-4 py-3 text-cream focus:border-brand-amber outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'unresolved', 'resolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                    filter === f
                      ? 'bg-brand-amber text-brand-dark shadow-lg shadow-brand-amber/20'
                      : 'bg-brand-dark text-gray-teal hover:bg-brand-surface'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="bg-brand-slate rounded-3xl border border-brand-surface overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-8 text-center text-gray-teal animate-pulse">Loading errors...</div>
            ) : filteredErrors.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                 <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 opacity-50" />
                 <p className="text-cream font-bold text-lg">No errors found</p>
                 <p className="text-gray-teal">System is running smoothly.</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-surface">
                {filteredErrors.map((err) => (
                  <div 
                    key={err.errorId} 
                    onClick={() => setSelectedError(err)}
                    className={`p-4 cursor-pointer hover:bg-brand-surface/50 transition-colors ${selectedError?.errorId === err.errorId ? 'bg-brand-surface' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {err.severity === 'critical' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : err.severity === 'medium' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="font-bold text-cream truncate max-w-xs">{err.message}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${
                        err.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' :
                        err.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {err.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-teal">
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {err.location.platform}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {err.timestamp ? new Date(err.timestamp.toDate()).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <AnimatePresence>
          {selectedError ? (
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-brand-slate border border-brand-surface rounded-3xl p-6 shadow-2xl h-fit sticky top-24"
             >
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-lg font-black text-cream uppercase tracking-tight">Error Details</h2>
                 <button onClick={() => setSelectedError(null)} className="text-gray-teal hover:text-cream">✕</button>
               </div>

               <div className="space-y-6">
                 <div>
                   <h3 className="text-[10px] text-gray-teal font-black uppercase tracking-widest mb-1">Message</h3>
                   <p className="text-sm text-red-400 font-mono bg-brand-dark p-3 rounded-xl border border-red-500/20 break-words">{selectedError.message}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-dark p-3 rounded-xl border border-brand-surface">
                      <h3 className="text-[10px] text-gray-teal font-black uppercase tracking-widest mb-1">Platform</h3>
                      <p className="text-sm text-cream font-medium">{selectedError.location.platform}</p>
                    </div>
                    <div className="bg-brand-dark p-3 rounded-xl border border-brand-surface">
                      <h3 className="text-[10px] text-gray-teal font-black uppercase tracking-widest mb-1">Component / Page</h3>
                      <p className="text-xs text-cream font-medium truncate">{selectedError.location.component}</p>
                      <p className="text-[10px] text-gray-teal truncate">{selectedError.location.page}</p>
                    </div>
                 </div>

                 <div className="bg-brand-dark p-3 rounded-xl border border-brand-surface space-y-2">
                    <h3 className="text-[10px] text-gray-teal font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Smartphone className="w-3 h-3" /> Device Info
                    </h3>
                    <p className="text-xs text-cream"><span className="text-gray-teal">OS:</span> {selectedError.deviceInfo.os}</p>
                    <p className="text-xs text-cream break-all"><span className="text-gray-teal">Client:</span> {selectedError.deviceInfo.browserOrClient}</p>
                 </div>

                 {selectedError.userContext && (
                    <div className="bg-brand-dark p-3 rounded-xl border border-brand-surface space-y-2">
                      <h3 className="text-[10px] text-gray-teal font-black uppercase tracking-widest mb-1">User Context</h3>
                      <p className="text-xs text-cream"><span className="text-gray-teal">ID:</span> {selectedError.userContext.userId}</p>
                      <p className="text-xs text-cream"><span className="text-gray-teal">Role:</span> {selectedError.userContext.role}</p>
                      {selectedError.userContext.userPhone && <p className="text-xs text-cream"><span className="text-gray-teal">Phone:</span> {selectedError.userContext.userPhone}</p>}
                    </div>
                 )}

                 {selectedError.stackTrace && (
                   <div>
                     <h3 className="text-[10px] text-gray-teal font-black uppercase tracking-widest mb-1">Stack Trace (Truncated)</h3>
                     <div className="bg-brand-dark p-3 rounded-xl border border-brand-surface max-h-40 overflow-y-auto">
                        <pre className="text-[10px] text-gray-teal font-mono whitespace-pre-wrap">{selectedError.stackTrace}</pre>
                     </div>
                   </div>
                 )}

                 <div className="pt-4 border-t border-brand-surface flex gap-2">
                    {selectedError.status !== 'resolved' && (
                       <button 
                         onClick={() => handleStatusChange(selectedError.errorId!, 'resolved')}
                         className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                       >
                         Mark Resolved
                       </button>
                    )}
                    {selectedError.status === 'unresolved' && (
                       <button 
                         onClick={() => handleStatusChange(selectedError.errorId!, 'in-progress')}
                         className="flex-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                       >
                         In Progress
                       </button>
                    )}
                 </div>
               </div>
             </motion.div>
          ) : (
            <div className="hidden lg:flex bg-brand-slate/50 border border-brand-surface/50 rounded-3xl p-6 items-center justify-center text-center">
              <p className="text-gray-teal text-sm">Select an error to view details</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
