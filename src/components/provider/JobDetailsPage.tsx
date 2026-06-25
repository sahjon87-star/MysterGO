import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, arrayUnion, collection, addDoc, runTransaction, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  ChevronLeft, 
  MoreHorizontal,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Star,
  Zap,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingMap } from '../shared/TrackingMap';
import { Booking } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

import { notificationService } from '../../services/notificationService';

export const JobDetailsPage: React.FC = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [job, setJob] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showCompletionOtpInput, setShowCompletionOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [completionOtp, setCompletionOtp] = useState('');
  const [updating, setUpdating] = useState(false);
  const [providerLoc, setProviderLoc] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!profile?.uid || !job || !['accepted', 'ongoing'].includes(job.status)) {
      setProviderLoc(null);
      return;
    }

    const unsubProvider = onSnapshot(doc(db, 'providers', profile.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.location?.lat && data.location?.lng) {
          setProviderLoc([data.location.lat, data.location.lng]);
        }
      }
    }, (err) => console.warn('Failed to listen to provider location:', err));

    return () => unsubProvider();
  }, [profile?.uid, job?.status]);

  // Sync providerLoc with direct booking/job providerLocation changes
  useEffect(() => {
    if (job?.providerLocation?.lat && job?.providerLocation?.lng) {
      setProviderLoc([job.providerLocation.lat, job.providerLocation.lng]);
    }
  }, [job?.providerLocation]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('start') === 'true' && job?.status === 'accepted') {
      setShowOtpInput(true);
      if (jobId) {
        updateDoc(doc(db, 'bookings', jobId), { isRequestingStartOtp: true });
      }
    }
  }, [location.search, job?.status, jobId]);

  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(doc(db, 'bookings', jobId), (snap) => {
      if (snap.exists()) {
        setJob({ id: snap.id, ...snap.data() } as Booking);
      } else {
        toast.error('Job not found');
        navigate('/pro/jobs');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `booking/${jobId}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId]);

  useEffect(() => {
    return () => {
      // Cleanup requesting flags on unmount if authenticated and authorized
      if (jobId && (showOtpInput || showCompletionOtpInput)) {
        if (!profile?.uid || !job) return;
        
        const isAuthorized = job.providerId === profile.uid || job.customerId === profile.uid || (job as any).userId === profile.uid;
        if (isAuthorized) {
          updateDoc(doc(db, 'bookings', jobId), { 
            isRequestingStartOtp: false,
            isRequestingCompletionOtp: false
          }).catch(err => {
            console.warn("Unmount cleanup failed (ignoring gracefully):", err);
          });
        }
      }
    };
  }, [jobId, showOtpInput, showCompletionOtpInput, profile, job]);

  const updateStatus = async (newStatus: Booking['status']) => {
    if (!job || !profile) return;
    setUpdating(true);
    try {
      const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        [`${newStatus}At`]: serverTimestamp(),
      };

      if (newStatus === 'accepted') {
        // Generate OTPs automatically on acceptance
        updates.otp = Math.floor(1000 + Math.random() * 9000).toString();
        updates.completionOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        notificationService.notifyUser(
          job.customerId,
          'Job Accepted!',
          `${profile?.name} has accepted your ${job.service} request. Start OTP: ${updates.otp}`,
          'booking'
        );
      } else if (newStatus === 'ongoing') {
        notificationService.notifyUser(
          job.customerId,
          'Job Started!',
          `${profile?.name} has started the work. Completion OTP: ${job.completionOTP}`,
          'booking'
        );
      }

      await updateDoc(doc(db, 'bookings', job.id!), updates);
      toast.success(`Job marked as ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `booking/${job.id}`);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleStartJob = async () => {
    setShowOtpInput(true);
    if (jobId) {
      await updateDoc(doc(db, 'bookings', jobId), { isRequestingStartOtp: true });
    }
  };

  const handleCompleteJob = async () => {
    setShowCompletionOtpInput(true);
    if (jobId) {
      await updateDoc(doc(db, 'bookings', jobId), { isRequestingCompletionOtp: true });
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      toast.error('Please enter OTP');
      return;
    }
    if (job?.otp && otp !== job.otp) {
      toast.error('Invalid OTP');
      return;
    }
    await updateStatus('ongoing');
    setShowOtpInput(false);
    setOtp('');
    // Clear requesting flag
    if (jobId) {
      await updateDoc(doc(db, 'bookings', jobId), { isRequestingStartOtp: false });
    }
  };

  const verifyCompletionOtp = async () => {
    if (!completionOtp) {
      toast.error('Please enter Completion OTP');
      return;
    }
    
    if (job?.completionOTP && completionOtp !== job.completionOTP) {
      toast.error('Invalid Completion OTP');
      return;
    }
    
    await completeJob();
    setShowCompletionOtpInput(false);
    setCompletionOtp('');
    // Clear requesting flag
    if (jobId) {
      await updateDoc(doc(db, 'bookings', jobId), { isRequestingCompletionOtp: false });
    }
  };

  const completeJob = async () => {
    if (!job || !profile) return;
    setUpdating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      let success = false;
      try {
        const response = await fetch('/api/jobs/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            bookingId: job.id,
            providerId: profile.uid,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          success = true;
          toast.success('Job completed! Earning added to wallet.');
        } else if (response.status !== 501) {
          console.warn("Server-side complete-job failed, trying client-side fallback. Error:", data.error);
        }
      } catch (apiErr) {
        console.warn("API call failed, trying client-side fallback:", apiErr);
      }

      if (!success) {
        const bookingRef = doc(db, "bookings", job.id);
        const providerRef = doc(db, "providers", profile.uid);
        const txRef = doc(collection(db, "transactions"));
        const notifyRef = doc(collection(db, "notifications"));

        const earning = (job as any).providerEarning || (job as any).totalAmount || (job as any).price || 0;

        await runTransaction(db, async (transaction) => {
          const bookingSnap = await transaction.get(bookingRef);
          const providerSnap = await transaction.get(providerRef);

          if (!bookingSnap.exists()) {
            throw new Error("Booking not found");
          }
          if (!providerSnap.exists()) {
            throw new Error("Provider not found");
          }

          const bookingData = bookingSnap.data();
          if (bookingData.status === "completed") {
            throw new Error("Booking is already completed");
          }

          transaction.update(bookingRef, {
            status: "completed",
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Only increment total jobs. Earnings and wallet balance will be updated upon admin approval
          transaction.update(providerRef, {
            totalJobs: increment(1)
          });

          transaction.set(txRef, {
            userId: profile.uid,
            userName: providerSnap.data()?.name || "",
            amount: earning,
            type: "credit",
            description: `Job Completed: ${job.service || "Mistri Service"}`,
            status: "pending",
            bookingId: job.id,
            userCollection: "providers",
            createdAt: serverTimestamp()
          });

          if (job.customerId) {
            transaction.set(notifyRef, {
              userId: job.customerId,
              title: "কাজ সম্পন্ন হয়েছে! 🎉",
              body: `আপনার ${job.service || "মিস্ত্রি"} বুকিং সফলভাবে সম্পন্ন হয়েছে।`,
              read: false,
              type: "job_completed",
              createdAt: serverTimestamp()
            });
          }
        });

        toast.success('Job completed! Earning added to wallet.');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to complete job');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary-blue" />
    </div>
  );

  if (!job) return null;

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-teal hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${
            job.status === 'pending' ? 'bg-brand-amber/20 text-brand-amber' :
            job.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
            job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
            'bg-brand-surface text-gray-teal'
          }`}>
            {job.status}
          </span>
          <button className="p-2 text-gray-teal hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Customer Preview */}
      <div className="px-4">
        <div className="bg-brand-slate rounded-[40px] p-8 border border-white/5 shadow-2xl space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-brand-surface rounded-[32px] flex items-center justify-center text-brand-amber font-black text-2xl border-4 border-brand-dark shadow-lg shrink-0">
              {getInitials(job.customerName)}
            </div>
            <div className="flex-1 space-y-1 overflow-hidden">
              <h3 className="text-xl font-black text-cream truncate uppercase tracking-tight">{job.customerName}</h3>
              <p className="text-[10px] font-black text-brand-amber uppercase tracking-widest">{job.service}</p>
              <div className="flex items-center gap-1.5 text-brand-amber pt-1">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[10px] font-black">4.9 NEW REQUEST</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button 
              onClick={() => window.open(`tel:${job.customerPhone}`)} 
              className="flex items-center justify-center gap-2 py-4 bg-brand-surface rounded-2xl text-[10px] font-black uppercase tracking-widest text-cream hover:bg-white/10 transition-all border border-white/5 active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </button>
            <button 
              onClick={() => navigate(`/chat/${job.customerId}`)} 
              className="flex items-center justify-center gap-2 py-4 bg-brand-surface rounded-2xl text-[10px] font-black uppercase tracking-widest text-cream hover:bg-white/10 transition-all border border-white/5 active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="px-4 space-y-8">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] px-4">Location Details</h3>
          <div className="bg-brand-slate rounded-[32px] p-6 border border-white/5 shadow-2xl space-y-6">
            {['accepted', 'ongoing'].includes(job.status) && (
              <div className="rounded-[24px] overflow-hidden border border-white/5 shadow-lg">
                <TrackingMap 
                  userRole="provider"
                  customerLocation={
                    (job?.location?.lat && job?.location?.lng)
                      ? [job.location.lat, job.location.lng]
                      : [23.8103, 90.4125]
                  }
                  providerLocation={providerLoc}
                  onCall={() => window.open(`tel:${job.customerPhone}`)}
                  onChat={() => navigate(`/chat/${job.customerId}`)}
                  statusInfo={job.status === 'ongoing' ? 'Working on Site' : 'Heading to Location'}
                />
              </div>
            )}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-surface rounded-xl flex items-center justify-center text-brand-amber shrink-0 border border-white/5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest leading-none">Service Address</p>
                <p className="text-sm font-bold text-cream leading-relaxed pr-2">{job.address}</p>
              </div>
            </div>
             <button 
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-brand-amber text-brand-dark rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-amber/20 active:scale-95 transition-all"
            >
              <Navigation className="w-4 h-4" />
              Navigate with Google Maps
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] px-4">Work Requirements</h3>
          <div className="bg-brand-slate rounded-[32px] p-8 border border-white/5 shadow-2xl space-y-8">
             <div className="flex items-center gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest leading-none">Job Type</p>
                  <p className="text-lg font-black text-cream uppercase tracking-tight">{job.jobType}</p>
                </div>
                <div className="h-10 w-px bg-white/5" />
                <div className="space-y-1 text-right ml-auto">
                  <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest leading-none">Time Slot</p>
                  <p className="text-lg font-black text-cream uppercase tracking-tight">{job.time}</p>
                </div>
             </div>

             {job.description && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest leading-none">Job Description</p>
                  <p className="text-sm font-medium text-gray-teal leading-relaxed italic">"{job.description}"</p>
                </div>
             )}

             <div className="flex items-center justify-between p-6 bg-brand-surface rounded-[28px] border border-white/5">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-teal uppercase tracking-widest">Total Payout</p>
                  <div className="text-2xl font-black text-brand-amber tracking-tighter">{formatCurrency(job.providerEarning)}</div>
                </div>
                <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center border border-white/5 text-brand-amber shadow-sm">
                  <Package className="w-6 h-6" />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 p-4 w-full bg-brand-slate/90 backdrop-blur-xl border-t border-white/5 z-[60]">
        <div className="flex gap-3">
          {job.status === 'pending' && (
            <>
              <button 
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="flex-1 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-red-400 border-2 border-red-500/20 hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject Job
              </button>
              <button 
                onClick={() => updateStatus('accepted')}
                disabled={updating}
                className="flex-[2] py-5 bg-brand-amber text-brand-dark rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-amber/20 hover:bg-brand-amber/90 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Accept Request
              </button>
            </>
          )}

          {job.status === 'accepted' && (
            <div className="w-full space-y-4">
              <div className="flex gap-3">
                <button 
                  onClick={handleStartJob}
                  disabled={updating}
                  className="flex-1 py-5 bg-brand-amber text-brand-dark rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-amber/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Enter Start OTP
                </button>
              </div>
            </div>
          )}

          {job.status === 'ongoing' && (
            <button 
              onClick={handleCompleteJob}
              disabled={updating}
              className="w-full py-5 bg-emerald-500 text-brand-dark font-black rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Complete Job (OTP Required)
            </button>
          )}

          {job.status === 'completed' && (
             <div className="w-full py-5 text-center text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                Payment received in your wallet
             </div>
          )}
        </div>
      </div>

      {/* OTP Modals */}
      <AnimatePresence>
        {/* Start OTP Modal */}
        {showOtpInput && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-dark/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-slate w-full max-w-sm rounded-[40px] p-8 space-y-6 shadow-2xl relative overflow-hidden border border-white/5"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck className="w-24 h-24 text-brand-amber" />
              </div>
              
              <div className="space-y-2 relative z-10">
                <h3 className="text-xl font-black text-cream uppercase tracking-tight">Security Check</h3>
                <p className="text-xs font-medium text-gray-teal">Ask the customer for the <span className="font-black text-brand-amber">Start OTP</span> to begin working.</p>
              </div>

              <input 
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="otp-input w-full rounded-3xl py-6 text-center text-4xl font-black tracking-[0.5em] focus:border-brand-amber outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="0000"
              />

              <div className="flex gap-3 relative z-10">
                <button 
                  onClick={async () => { 
                    setShowOtpInput(false); 
                    setOtp(''); 
                    if (jobId) {
                      await updateDoc(doc(db, 'bookings', jobId), { isRequestingStartOtp: false });
                    }
                  }}
                  className="flex-1 py-4 bg-brand-surface rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-teal border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={verifyOtp}
                  disabled={updating}
                  className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${updating ? 'bg-brand-amber/50 text-brand-dark/50 cursor-not-allowed' : 'bg-brand-amber text-brand-dark shadow-brand-amber/20 active:scale-95 transition-all'}`}
                >
                  {updating ? 'Verifying...' : 'Confirm OTP'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Completion OTP Modal */}
        {showCompletionOtpInput && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-dark/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-slate w-full max-w-sm rounded-[40px] p-8 space-y-6 shadow-2xl relative overflow-hidden border border-white/5"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <CheckCircle2 className="w-24 h-24 text-emerald-500" />
              </div>
              
              <div className="space-y-2 relative z-10">
                <h3 className="text-xl font-black text-cream uppercase tracking-tight">Final Settlement</h3>
                <p className="text-xs font-medium text-gray-teal">Ask the customer for the <span className="font-black text-brand-amber">6-digit Completion OTP</span> to release payment.</p>
              </div>

              <input 
                type="text"
                maxLength={6}
                value={completionOtp}
                onChange={(e) => setCompletionOtp(e.target.value)}
                className="otp-input w-full rounded-3xl py-6 text-center text-4xl font-black tracking-[0.35em] focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="000000"
              />

              <div className="flex gap-3 relative z-10">
                 <button 
                  onClick={async () => { 
                    setShowCompletionOtpInput(false); 
                    setCompletionOtp(''); 
                    if (jobId) {
                      await updateDoc(doc(db, 'bookings', jobId), { isRequestingCompletionOtp: false });
                    }
                  }}
                  className="flex-1 py-4 bg-brand-surface rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-teal border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={verifyCompletionOtp}
                  disabled={updating}
                  className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${updating ? 'bg-emerald-500/50 text-brand-dark/50 cursor-not-allowed' : 'bg-emerald-500 text-brand-dark shadow-emerald-500/20 active:scale-95 transition-all'}`}
                >
                  {updating ? 'Verifying...' : 'Finish Job'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
