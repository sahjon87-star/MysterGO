import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Briefcase, Clock, MapPin, CheckCircle2, ChevronRight, Filter, AlertCircle, XCircle, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

import { notificationService } from '../../services/notificationService';

export const ProviderJobs: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled'>('pending');

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'bookings'),
      where('providerId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      // Sort client-side
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setJobs(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const updateStatus = async (jobId: string, status: Booking['status']) => {
    try {
      const updates: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      const job = jobs.find(j => j.id === jobId);

      if (status === 'accepted') {
        updates.acceptedAt = serverTimestamp();
        // Generate OTPs automatically on acceptance
        updates.otp = Math.floor(1000 + Math.random() * 9000).toString();
        updates.completionOTP = Math.floor(100000 + Math.random() * 900000).toString();

        if (job) {
          notificationService.notifyUser(
            job.customerId,
            'Job Accepted!',
            `${profile?.name} has accepted your ${job.service} request. Start OTP: ${updates.otp}`,
            'booking'
          );
        }
      }

      await updateDoc(doc(db, 'bookings', jobId), updates);
      toast.success(`Job ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredJobs = jobs.filter(j => activeTab === 'all' ? true : j.status === activeTab);

  const tabs = [
    { id: 'pending', label: 'Requested' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'ongoing', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'all', label: 'History' },
  ] as const;

  return (
    <div className="space-y-8 pb-32 transition-all duration-500 bg-brand-dark min-h-screen">
      {/* Protocol Header */}
      <div className="px-6 pt-10 space-y-1.5">
        <h2 className="text-3xl font-black text-cream uppercase tracking-tighter leading-none">Job Management</h2>
        <p className="text-[10px] font-black text-gray-teal uppercase tracking-[0.4em] leading-none">View and manage your jobs</p>
      </div>

      {/* Persistence Tabs - High Contrast */}
      <div className="px-6 sticky top-16 z-40 bg-brand-dark/80 backdrop-blur-3xl py-4 transition-colors border-b border-white/5">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
          {tabs.map((tab) => (
            <motion.button 
              key={tab.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3.5 rounded-[22px] text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap transition-all border shadow-2xl ${activeTab === tab.id ? 'bg-brand-amber text-brand-dark border-brand-amber shadow-lg shadow-brand-amber/30' : 'bg-brand-slate text-gray-teal border-white/5'}`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-brand-slate animate-pulse border border-white/5 shadow-2xl rounded-[48px]" />
          ))
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-32 space-y-8 grayscale">
            <div className="w-24 h-24 bg-brand-slate rounded-full flex items-center justify-center mx-auto shadow-inner border border-white/5">
              <Briefcase className="w-10 h-10 text-gray-teal" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black text-cream uppercase tracking-[0.3em]">No Active Nodes</h3>
              <p className="text-[9px] font-black text-gray-teal uppercase tracking-widest">Awaiting decentralized directive inputs...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((job) => (
              <motion.div 
                key={job.id}
                layoutId={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/pro/job/${job.id}`)}
                className="bg-brand-slate rounded-[48px] p-8 border border-white/5 shadow-2xl hover:border-brand-amber/40 transition-all cursor-pointer group relative overflow-hidden"
              >
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-amber/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-brand-amber/10 transition-all" />
                
                <div className="flex items-center gap-5 border-b border-white/5 pb-6 mb-6 relative z-10">
                   <div className="w-16 h-16 bg-brand-dark rounded-2xl flex items-center justify-center text-brand-amber font-black text-xl border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-brand-amber/5 animate-pulse" />
                    <span className="relative z-10">{getInitials(job.customerName)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-cream uppercase tracking-tighter text-lg leading-none group-hover:text-brand-amber transition-colors truncate">{job.customerName}</h4>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] ${
                        job.status === 'pending' ? 'bg-brand-amber/20 text-brand-amber animate-pulse' :
                        job.status === 'accepted' ? 'bg-brand-amber/20 text-brand-amber' :
                        job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-brand-surface text-gray-teal'
                      }`}>
                        {job.status === 'pending' ? 'UNCONFIRMED' : job.status.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em] mt-1.5 leading-none">Logic: {job.service}</p>
                  </div>
                </div>

                <div className="space-y-5 relative z-10">
                   <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-brand-amber flex-shrink-0" />
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest truncate">{job.address}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-2 text-gray-teal">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{job.time}</span>
                      </div>
                      <div className="w-1 h-1 bg-brand-surface rounded-full" />
                      <div className="flex items-center gap-2 text-gray-teal">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                          {job.jobType === 'daily' ? 'CYCLE' : job.jobType === 'contract' ? 'NODE' : `${job.hours}HR`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-black text-cream tracking-tighter leading-none">{formatCurrency(job.providerEarning)}</div>
                      <div className="text-[8px] font-black text-gray-teal uppercase tracking-[0.4em] mt-1 leading-none">Yield Credit</div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {job.status === 'pending' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="flex flex-col gap-3 mt-8 pt-6 border-t border-white/5 relative z-10 w-full"
                    >
                      {/* Job Description block before Action Buttons */}
                      <div className="bg-slate-100 rounded-2xl p-4 border border-brand-amber/20 text-left space-y-1 w-full">
                        <span className="text-[9px] font-black text-brand-amber uppercase tracking-wider block">
                          Job Description / কাজের বিবরণ
                        </span>
                        <p className="text-xs font-bold text-cream leading-relaxed">
                          {job.deploymentDescription || job.description || 'No description provided / কোনো কাজের বিবরণ নেই'}
                        </p>
                        
                        <div className="my-3 p-3 bg-brand-surface/80 border border-slate-700 rounded-lg">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-teal block mb-1">
                            প্রয়োজনীয় কর্মী / Crew Requirements
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🧑🤝🧑</span>
                            <span className="text-sm font-bold text-cream">
                              {(job.helperCount || 0) > 0 
                                ? `${job.helperCount} সাহায্যকারী প্রয়োজন (${job.helperCount} Helper Required)` 
                                : "কোন সাহায্যকারী লাগবে না (Only Mistri)"}
                            </span>
                          </div>
                          {(job.helperCount || 0) > 0 && (
                            <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                              +৳{job.totalHelperCost} Jogan Fare added to ultimate payout
                            </p>
                          )}
                        </div>

                        <p className="text-[9px] text-gray-teal font-medium leading-normal mt-1 pt-1 border-t border-slate-200">
                          Please read the details carefully. Once accepted, cancellations may affect your provider rating.
                        </p>
                      </div>

                      <div className="flex gap-3 w-full">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); updateStatus(job.id, 'cancelled'); }}
                          className="flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] text-gray-teal border border-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center gap-2 bg-brand-surface"
                        >
                          <XCircle className="w-4 h-4" />
                          Abort
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); updateStatus(job.id, 'accepted'); }}
                          className="flex-[2] py-4 bg-brand-amber text-brand-dark rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] shadow-xl shadow-brand-amber/20 hover:shadow-brand-amber/40 transition-all flex items-center justify-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Confirm Matrix
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {job.status === 'accepted' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-8 pt-6 border-t border-white/5 relative z-10"
                    >
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/pro/job/${job.id}?start=true`); }}
                        className="w-full py-5 bg-brand-amber text-brand-dark rounded-[24px] text-[10px] font-black uppercase tracking-[0.4em] shadow-xl shadow-brand-amber/20 flex items-center justify-center gap-3 transition-all"
                      >
                        <Zap className="w-4 h-4 text-brand-dark" />
                        Initialize OTP Sync
                      </motion.button>
                    </motion.div>
                  )}

                  {job.status === 'ongoing' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-8 pt-6 border-t border-white/5 relative z-10"
                    >
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/pro/job/${job.id}`); }}
                        className="w-full py-5 bg-emerald-500 text-brand-dark font-black rounded-[24px] text-[10px] font-black uppercase tracking-[0.4em] shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all"
                      >
                        Monitor Live Stream
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
