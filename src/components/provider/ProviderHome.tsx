import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, limit, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Briefcase, 
  Wallet, 
  Star, 
  MapPin, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Package, 
  MoreHorizontal,
  ChevronRight,
  TrendingDown,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking, Transaction } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { ReferralBanner } from '../shared/ReferralBanner';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

import { notificationService } from '../../services/notificationService';

export const ProviderHome: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const updateStatus = async (jobId: string, status: Booking['status']) => {
    try {
      const updates: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      const job = activeJobs.find(j => j.id === jobId);

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

  useEffect(() => {
    if (!profile?.uid) return;

    // Listen for current active jobs
    const qJobs = query(
      collection(db, 'bookings'),
      where('providerId', '==', profile.uid),
      where('status', 'in', ['pending', 'accepted', 'ongoing']),
      limit(5)
    );

    const unsubJobs = onSnapshot(qJobs, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      // Manual sorting to avoid complex indexing
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setActiveJobs(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    // Listen for recent wallet transactions
    const qTrx = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      where('status', '==', 'approved'),
      limit(5)
    );

    const unsubTrx = onSnapshot(qTrx, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRecentPayouts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubJobs();
      unsubTrx();
    };
  }, [profile?.uid]);

  const stats = [
    { label: 'Rating', value: profile?.rating?.toFixed(1) || '0.0', icon: Star, color: 'text-action-orange bg-action-orange/10' },
    { label: 'Today Earning', value: '৳0', icon: TrendingUp, color: 'text-primary-blue bg-primary-blue/10' },
    { label: 'Total Jobs', value: profile?.totalJobs || '0', icon: Briefcase, color: 'text-primary-blue bg-primary-blue/10' },
  ];

  return (
    <div className="space-y-10 pb-20 transition-all duration-500">
      {/* Executive Command Header */}
      <div className="bg-brand-dark px-6 pt-12 pb-24 relative overflow-hidden">
        {/* Dynamic Background Vectors */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-amber/10 rounded-full -mr-32 -mt-32 blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full -ml-32 -mb-32 blur-[80px]" />
        
        <div className="relative z-10 flex items-center justify-between mb-10">
          <div className="space-y-1.5 px-2">
            <p className="text-gray-teal text-[9px] font-black uppercase tracking-[0.4em] leading-none">Online Status</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-cream tracking-tighter uppercase leading-none">{profile?.name}</h2>
              {profile?.isVerified && (
                <div className="group relative">
                  <ShieldCheck className="w-6 h-6 text-brand-amber shadow-lg shadow-brand-amber/20" />
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 bg-slate-900 text-[8px] font-black text-slate-100 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest border border-white/5">Verified Expert</div>
                </div>
              )}
            </div>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 rounded-[24px] bg-brand-surface border border-white/10 p-1 flex items-center justify-center overflow-hidden shadow-2xl ring-1 ring-white/20"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} className="w-full h-full object-cover rounded-[20px]" alt="Profile" />
            ) : (
              <span className="text-brand-amber font-black text-2xl">{profile ? getInitials(profile.name) : '??'}</span>
            )}
          </motion.div>
        </div>

        {/* Operational Metrics Matrix */}
        <div className="grid grid-cols-3 gap-5 relative z-10">
          {[
            { label: 'Rating', value: profile?.rating?.toFixed(1) || '0.0', icon: Star, color: 'text-brand-amber bg-brand-amber/10' },
            { label: 'Earnings', value: '৳0', icon: TrendingUp, color: 'text-blue-400 bg-blue-400/10' },
            { label: 'Jobs Done', value: profile?.totalJobs || '0', icon: Briefcase, color: 'text-emerald-400 bg-emerald-400/10' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-brand-slate/60 backdrop-blur-3xl border border-white/10 rounded-[28px] p-5 space-y-3 shadow-xl"
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-xl ${stat.color} shadow-inner border border-white/5`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-xl font-black text-cream tracking-tighter leading-none">{stat.value}</div>
                <div className="text-[8px] font-black text-gray-teal uppercase tracking-[0.2em]">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Offline Alert Protocol */}
      {!profile?.isOnline && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-6 -mt-12 relative z-20"
        >
          <div className="bg-brand-slate rounded-[40px] p-8 border border-white/5 shadow-2xl flex items-center justify-between group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-amber/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-brand-amber/10 transition-all" />
            <div className="space-y-1 relative z-10">
              <h3 className="font-black text-xs uppercase tracking-[0.3em] text-brand-amber flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-amber rounded-full animate-ping" />
                Dormant Signal
              </h3>
              <p className="text-[9px] font-bold text-gray-teal uppercase tracking-widest leading-relaxed">External requests are currently blocked.</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/pro/settings')}
              className="bg-brand-amber text-brand-dark px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] shadow-lg shadow-brand-amber/20 relative z-10 transition-all hover:shadow-brand-amber/40"
            >
              Initialize Node
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Referrals & Incentives */}
      <div className="px-6">
        <ReferralBanner />
      </div>
      
      {/* Financial Core */}
      <section className="px-6">
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => navigate('/pro/wallet')}
          className="bg-brand-slate rounded-[48px] border border-white/5 p-10 flex items-center justify-between shadow-2xl group cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-teal">
              <Wallet className="w-5 h-5 text-brand-amber" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Matrix Credit Balance</span>
            </div>
            <div className="text-4xl font-black text-cream tracking-tighter">
              {formatCurrency(profile?.walletBalance || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">Withdrawal Port Active</span>
            </div>
          </div>
          <div className="w-16 h-16 rounded-3xl bg-brand-surface flex items-center justify-center text-gray-teal transition-all group-hover:bg-brand-amber group-hover:text-brand-dark group-hover:shadow-lg group-hover:shadow-brand-amber/20 border border-white/5">
            <ChevronRight className="w-8 h-8" />
          </div>
        </motion.div>
      </section>

      {/* Job Deployment Queue */}
      <section className="space-y-6">
        <div className="px-8 flex items-center justify-between">
          <h3 className="font-black text-cream uppercase tracking-[0.3em] text-[11px] flex items-center gap-3">
            <div className="w-6 h-[1px] bg-brand-amber" />
            Job Requests
          </h3>
          <motion.button 
            whileHover={{ x: 3 }}
            onClick={() => navigate('/pro/jobs')} 
            className="text-[9px] font-black text-brand-amber uppercase tracking-[0.2em] flex items-center gap-1.5 transition-all"
          >
            Job History <ArrowRight size={14} />
          </motion.button>
        </div>
        
        <div className="px-6 space-y-5">
          {loading ? (
            <div className="h-28 bg-brand-slate/50 rounded-[40px] animate-pulse" />
          ) : activeJobs.length === 0 ? (
            <div className="text-center py-20 p-10 bg-brand-slate/30 border border-white/5 backdrop-blur-xl rounded-[48px] space-y-6">
              <div className="w-20 h-20 bg-brand-surface rounded-full flex items-center justify-center mx-auto text-gray-teal shadow-inner border border-white/5">
                <Package className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <p className="text-cream font-black text-sm uppercase tracking-widest leading-none">No requests</p>
                <p className="text-gray-teal text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-[200px] mx-auto">Stay online to receive job requests.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <motion.div 
                  key={job.id}
                  layoutId={job.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-brand-slate rounded-[40px] border border-white/5 shadow-2xl overflow-hidden hover:border-brand-amber/40 transition-all cursor-pointer group relative"
                >
                  <div 
                    onClick={() => navigate(`/pro/job/${job.id}`)}
                    className="p-6 flex items-center gap-5"
                  >
                    <div className="w-16 h-16 bg-brand-dark rounded-2xl flex items-center justify-center text-brand-amber font-black text-xl border border-white/10 shadow-2xl relative overflow-hidden">
                      <div className="absolute inset-0 bg-brand-amber/5 animate-pulse" />
                      <span className="relative z-10">{getInitials(job.customerName)}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-black text-cream uppercase tracking-tighter group-hover:text-brand-amber transition-colors truncate">{job.customerName}</h4>
                      <div className="flex items-center gap-3">
                        <p className="text-[9px] font-black text-gray-teal uppercase tracking-[0.2em]">{job.service}</p>
                        <div className="w-1.5 h-1.5 bg-brand-surface rounded-full" />
                        <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${job.status === 'pending' ? 'text-brand-amber animate-pulse' : 'text-blue-400'}`}>
                          {job.status === 'pending' ? 'UNCONFIRMED' : job.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-1 text-cream-white">
                      <div className="text-lg font-black tracking-tighter text-brand-amber">{formatCurrency(job.providerEarning)}</div>
                      <div className="text-[8px] font-black text-gray-teal uppercase tracking-widest">{job.time}</div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex flex-col gap-3">
                    <AnimatePresence>
                      {job.status === 'pending' && (
                        <div className="flex flex-col w-full gap-3">
                          {/* Job Description block before Action Buttons */}
                          <div className="bg-slate-100 rounded-2xl p-4 border border-brand-amber/20 text-left space-y-1">
                            <span className="text-[9px] font-black text-brand-amber uppercase tracking-wider block">
                              Job Description / কাজের বিবরণ
                            </span>
                            <p className="text-xs font-bold text-slate-900 leading-relaxed">
                              {job.deploymentDescription || job.description || 'No description provided / কোনো কাজের বিবরণ নেই'}
                            </p>
                            
                            <div className="my-3 p-3 bg-slate-800/80 border border-slate-700 rounded-lg">
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                                প্রয়োজনীয় কর্মী / Crew Requirements
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">🧑🤝🧑</span>
                                <span className="text-sm font-bold text-white">
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

                            <p className="text-[9px] text-slate-500 font-medium leading-normal mt-1 pt-1 border-t border-slate-200">
                              Please read the details carefully. Once accepted, cancellations may affect your provider rating.
                            </p>
                          </div>

                          <div className="flex w-full gap-3">
                            <motion.button 
                              whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgba(239, 68, 68, 1)' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => { e.stopPropagation(); updateStatus(job.id, 'cancelled'); }}
                              className="flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] text-gray-teal border border-white/5 flex items-center justify-center gap-2 transition-all bg-brand-surface"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline Request
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={(e) => { e.stopPropagation(); updateStatus(job.id, 'accepted'); }}
                              className="flex-[1.5] py-4 bg-brand-amber text-brand-dark rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] shadow-xl shadow-brand-amber/20 flex items-center justify-center gap-2 transition-all"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              Accept Job
                            </motion.button>
                          </div>
                        </div>
                      )}

                      {job.status === 'accepted' && (
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/pro/job/${job.id}?start=true`); }}
                          className="w-full py-4 bg-brand-amber text-brand-dark font-black rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] shadow-xl shadow-brand-amber/20 flex items-center justify-center gap-2 transition-all"
                        >
                          Start Job (Enter OTP)
                        </motion.button>
                      )}

                      {job.status === 'ongoing' && (
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/pro/job/${job.id}`); }}
                          className="w-full py-4 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all"
                        >
                          View Job Details
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Intelligence Insight Matrix */}
      <section className="px-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-brand-slate rounded-[56px] p-12 text-cream relative overflow-hidden group shadow-2xl active:scale-[0.99] transition-all cursor-pointer border border-white/5"
          onClick={() => navigate('/pro/insights')}
        >
          <div className="absolute top-0 right-0 p-12 opacity-10 scale-150 group-hover:scale-[1.6] transition-transform duration-1000">
            <TrendingUp className="w-32 h-32 text-brand-amber" />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tighter">Earning Insights</h3>
                <p className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em]">Your Earning Performance</p>
              </div>
              <div className="px-4 py-1.5 bg-brand-surface border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-teal">Period: Weekly</div>
            </div>

            <div className="flex items-baseline gap-4">
              <div className="text-6xl font-black tracking-tighter text-cream">৳0</div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+0% Growth</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-teal font-bold leading-relaxed max-w-[280px]">Your weekly earnings are at baseline. Accept more jobs to increase your earnings.</p>
            
            <div className="flex items-center gap-3 text-brand-amber font-black text-[10px] uppercase tracking-[0.4em] group-hover:gap-5 transition-all">
              View Detailed Earnings 
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
          
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-amber/5 rounded-full blur-[100px] -mr-32 -mb-32 group-hover:bg-brand-amber/10 transition-all" />
        </motion.div>
      </section>
    </div>
  );
};
