import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs, runTransaction, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { uploadImage } from '../../services/imgbb';
import { ArrowLeft, Phone, MessageCircle, CheckCircle2, Clock, MapPin, XCircle, CreditCard, AlertCircle, Camera, Loader2, Key, Star, Zap } from 'lucide-react';;
import { motion, AnimatePresence } from 'motion/react';
import { Booking } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { TrackingMap } from '../shared/TrackingMap';
import { useAuth } from '../../contexts/AuthContext';

export const BookingStatusPage: React.FC = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: authUser, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [trxId, setTrxId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [providerLoc, setProviderLoc] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (authLoading || !authUser) return;
    if (!booking?.providerId || !['accepted', 'ongoing'].includes(booking.status)) {
      setProviderLoc(null);
      return;
    }

    const unsubProvider = onSnapshot(doc(db, 'providers', booking.providerId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.location?.lat && data.location?.lng) {
          setProviderLoc([data.location.lat, data.location.lng]);
        }
      }
    }, (err) => console.warn('Failed to listen to provider location:', err));

    return () => unsubProvider();
  }, [booking?.providerId, booking?.status, authLoading, authUser]);

  // Sync providerLoc with direct booking.providerLocation changes
  useEffect(() => {
    if (booking?.providerLocation?.lat && booking?.providerLocation?.lng) {
      setProviderLoc([booking.providerLocation.lat, booking.providerLocation.lng]);
    }
  }, [booking?.providerLocation]);

  useEffect(() => {
    if (authLoading || !authUser) return;
    // Fetch platform settings for numbers
    const fetchSettings = async () => {
      try {
        const snap = await getDocs(collection(db, 'settings'));
        if (!snap.empty) {
          setSettings(snap.docs[0].data());
        }
      } catch (err) {
        console.warn('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, [authLoading, authUser]);

  useEffect(() => {
    if (authLoading || !authUser || !bookingId) return;
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Booking;
        setBooking(data);
        if (data.trxId) setTrxId(data.trxId);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `bookings/${bookingId}`);
    });
    return () => unsubscribe();
  }, [bookingId, authLoading, authUser]);

  const handleCancel = async () => {
    if (!bookingId) return;
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
      });
      setFeedback({ type: 'success', message: 'Booking cancelled successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!bookingId || !trxId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      // Check for duplicate TrxID
      const q = query(collection(db, 'bookings'), where('trxId', '==', trxId.trim()));
      const snap = await getDocs(q);
      
      const isDuplicate = snap.docs.some(d => d.id !== bookingId);
      if (isDuplicate) {
        setFeedback({ type: 'error', message: 'This Transaction ID has already been used.' });
        setSubmitting(false);
        return;
      }

      let screenshotUrl = booking?.paymentScreenshotUrl || '';
      if (screenshot) {
        screenshotUrl = await uploadImage(screenshot);
      }

      await updateDoc(doc(db, 'bookings', bookingId), {
        trxId: trxId.trim(),
        paymentScreenshotUrl: screenshotUrl,
        paymentStatus: 'submitted',
        hasSubmittedTrx: true,
        updatedAt: serverTimestamp(),
      });
      setFeedback({ type: 'success', message: 'Payment details submitted!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!bookingId || !booking || userRating === 0) return;
    setReviewSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const providerRef = doc(db, 'providers', booking.providerId);
        const providerSnap = await transaction.get(providerRef);
        
        if (!providerSnap.exists()) {
          throw new Error("Provider not found");
        }

        const providerData = providerSnap.data();
        const currentRating = providerData.rating || 0;
        const currentReviewCount = providerData.reviewCount || 0;
        
        const newReviewCount = currentReviewCount + 1;
        const newRating = ((currentRating * currentReviewCount) + userRating) / newReviewCount;

        // Update provider
        transaction.update(providerRef, {
          rating: newRating,
          reviewCount: newReviewCount,
          updatedAt: serverTimestamp()
        });

        // Update booking
        transaction.update(doc(db, 'bookings', bookingId), {
          reviewSubmitted: true,
          rating: userRating,
          updatedAt: serverTimestamp()
        });

        // Add review document
        const reviewRef = doc(collection(db, 'reviews'));
        transaction.set(reviewRef, {
          bookingId,
          customerId: booking.customerId,
          customerName: booking.customerName,
          providerId: booking.providerId,
          rating: userRating,
          comment,
          createdAt: serverTimestamp()
        });
      });

      setFeedback({ type: 'success', message: 'Review submitted! Thank you.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!booking) return <div className="min-h-screen flex items-center justify-center">Booking not found</div>;

  const isOTPVerified = booking.status === 'completed';
  const hasSubmittedTrx = booking.paymentMethod === 'cash' || 
    booking.paymentMethod === 'wallet' || 
    booking.hasSubmittedTrx === true || 
    ['submitted', 'paid', 'pending_approval'].includes(booking.paymentStatus);

  const steps = [
    { id: 'pending', label: 'Requested', icon: Clock, color: 'text-brand-amber', bg: 'bg-brand-amber/10' },
    { id: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'text-brand-amber', bg: 'bg-brand-amber/10' },
    { id: 'ongoing', label: 'Ongoing', icon: MapPin, color: 'text-brand-amber', bg: 'bg-brand-amber/10' },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-brand-amber', bg: 'bg-brand-amber/10' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === booking.status);
  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="min-h-screen bg-brand-dark pb-32">
      <nav className="sticky top-0 z-40 bg-brand-slate border-b border-white/5 h-16 flex items-center px-4 gap-4 shadow-xl">
        <button onClick={() => navigate('/bookings')} className="p-2 hover:bg-brand-surface rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-teal" />
        </button>
        <div className="flex flex-col">
           <h1 className="font-black text-cream uppercase tracking-tighter text-[10px] leading-none">Booking Verification</h1>
           <span className="text-[8px] font-black text-brand-amber uppercase tracking-[0.3em] mt-1">
             Status: {isOTPVerified && !hasSubmittedTrx ? 'PAYMENT REQUIRED' : booking.status.toUpperCase()}
           </span>
        </div>
        <button 
          onClick={() => navigate(`/chat/${booking.providerId}`)}
          className="ml-auto p-2 bg-brand-amber/10 text-brand-amber rounded-xl border border-brand-amber/20"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </nav>

      <div className="p-4 space-y-6">
        {/* Feedback Message */}
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                feedback.type === 'success' ? 'bg-brand-amber text-brand-dark border-brand-amber/20' : 'bg-red-500 text-white border-red-500/20'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <p className="text-[10px] font-black uppercase tracking-widest">{feedback.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OTP Section (Critical Visibility) */}
        {booking.status === 'accepted' && booking.otp && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-[40px] p-8 text-center space-y-6 shadow-[0_20px_50px_rgba(255,179,0,0.15)] border-2 transition-all duration-500 ${booking.isRequestingStartOtp ? 'bg-brand-amber border-white scale-105 shadow-2xl animate-pulse' : 'bg-brand-slate border-brand-amber/30'}`}
          >
            <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto relative shadow-inner border-2 ${ booking.isRequestingStartOtp ? 'bg-brand-dark border-brand-dark/20' : 'bg-brand-dark border-white/5'}`}>
              <Zap className={`w-10 h-10 ${ booking.isRequestingStartOtp ? 'text-brand-amber animate-bounce' : 'text-brand-amber opacity-50'}`} />
              {booking.isRequestingStartOtp && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full border-4 border-white animate-ping" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className={`text-2xl font-black uppercase tracking-tighter leading-none ${ booking.isRequestingStartOtp ? 'text-brand-dark' : 'text-slate-900 dark:text-white'}`}>
                {booking.isRequestingStartOtp ? 'OTP Required' : 'Start Code'}
              </h3>
              <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${ booking.isRequestingStartOtp ? 'text-brand-dark/80' : 'text-gray-teal'}`}>
                {booking.isRequestingStartOtp ? 'Provider is ready to start - Share this OTP' : 'Share this OTP with provider to start work'}
              </p>
            </div>

            <div className={`rounded-3xl py-6 text-5xl font-black tracking-[0.5em] shadow-inner border-4 transition-colors ${ booking.isRequestingStartOtp ? 'bg-brand-dark text-brand-amber border-brand-dark/10' : 'bg-brand-dark text-slate-900 dark:text-white border-slate-200 dark:border-white/5'}`}>
              {booking.otp}
            </div>

            {booking.isRequestingStartOtp && (
              <div className="flex items-center justify-center gap-2 text-brand-dark animate-pulse">
                 <AlertCircle size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Verification</span>
              </div>
            )}
          </motion.div>
        )}

        {booking.status === 'ongoing' && booking.completionOTP && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-[40px] p-8 text-center space-y-6 shadow-2xl border-2 transition-all duration-500 ${booking.isRequestingCompletionOtp ? 'bg-emerald-500 border-white scale-105 animate-pulse' : 'bg-brand-slate border-brand-amber/30'}`}
          >
            <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto relative shadow-inner border-2 ${ booking.isRequestingCompletionOtp ? 'bg-brand-dark border-brand-dark/20' : 'bg-brand-dark border-white/5'}`}>
              <Key className={`w-10 h-10 ${ booking.isRequestingCompletionOtp ? 'text-emerald-500 animate-bounce' : 'text-brand-amber opacity-50'}`} />
              {booking.isRequestingCompletionOtp && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full border-4 border-white animate-ping" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className={`text-2xl font-black uppercase tracking-tighter leading-none ${ booking.isRequestingCompletionOtp ? 'text-brand-dark' : 'text-slate-900 dark:text-white'}`}>
                {booking.isRequestingCompletionOtp ? 'CONFIRM FINISH' : 'Completion Key'}
              </h3>
              <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${ booking.isRequestingCompletionOtp ? 'text-brand-dark/80' : 'text-gray-teal'}`}>
                {booking.isRequestingCompletionOtp ? 'WORKER REQUESTING SITE CLOSURE code' : 'Transmit only if fully satisfied'}
              </p>
            </div>

            <div className={`rounded-3xl py-6 text-5xl font-black tracking-[0.5em] shadow-inner border-4 transition-colors ${ booking.isRequestingCompletionOtp ? 'bg-brand-dark text-emerald-500 border-brand-dark/10' : 'bg-brand-dark text-slate-900 dark:text-white border-slate-200 dark:border-white/5'}`}>
              {booking.completionOTP}
            </div>
          </motion.div>
        )}

        {/* Milestone Requests (Refactored) */}
        {booking.jobType === 'contract' && booking.milestones && booking.milestones.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-black text-cream uppercase tracking-[0.3em] text-[10px] px-2 flex items-center gap-3">
               <div className="w-5 h-[1px] bg-brand-amber" />
               Contractual Milestones
            </h3>
            <div className="space-y-4">
              {booking.milestones.map((m) => (
                <div key={m.id} className="bg-brand-slate rounded-[32px] p-6 border border-brand-surface shadow-2xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xl font-black text-cream tracking-tighter">{formatCurrency(m.amount)}</p>
                      <p className="text-[9px] font-black text-gray-teal uppercase tracking-widest">{m.description}</p>
                    </div>
                    {m.status === 'paid' ? (
                      <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        SETTLED
                      </div>
                    ) : (
                      <div className="bg-brand-amber/10 text-brand-amber border border-brand-amber/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                        PENDING APPROVAL
                      </div>
                    )}
                  </div>
                  
                  {m.status === 'pending' && (
                    <div className="bg-brand-dark rounded-2xl p-5 text-center space-y-3 border border-white/5">
                      <p className="text-[8px] font-black text-gray-teal uppercase tracking-[0.3em]">Verification OTP</p>
                      <p className="text-3xl font-black text-brand-amber tracking-[0.6em] leading-none">{m.otp}</p>
                      <p className="text-[7px] text-gray-teal font-black uppercase tracking-[0.1em] opacity-50">Transmitting this code authorizes payment</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Real-Time Map Tracking (Service Booking Flow) */}
        {['accepted', 'ongoing'].includes(booking.status) && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] px-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-amber opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-amber"></span>
              </span>
              Live Dispatch Tracking
            </h3>
            <div className="px-1">
              <TrackingMap 
                userRole="customer"
                customerLocation={
                  (booking?.location?.lat && booking?.location?.lng)
                    ? [booking.location.lat, booking.location.lng]
                    : [23.8103, 90.4125]
                }
                providerLocation={providerLoc}
                onCall={() => window.open(`tel:${booking.provider?.phone || booking.customerPhone}`)}
                onChat={() => navigate(`/chat/${booking.providerId}`)}
                statusInfo={booking.status === 'ongoing' ? 'Worker on Site' : 'Worker En Route'}
              />
            </div>
          </div>
        )}

        {/* Worker Mini Card (Refactored) */}
        <div className="bg-brand-slate rounded-[32px] p-5 border border-white/5 shadow-2xl flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-dark flex items-center justify-center overflow-hidden border-2 border-white/10 shadow-2xl">
            {booking.provider?.photoURL ? (
                <img src={booking.provider.photoURL} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            ) : (
                <span className="text-brand-amber font-black text-xl">{getInitials(booking.providerName)}</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="font-black text-cream text-sm uppercase tracking-tighter truncate leading-none">{booking.providerName}</h3>
            <p className="text-brand-amber text-[9px] font-black uppercase tracking-widest mt-1.5">{booking.service}</p>
          </div>
          <button 
            onClick={() => window.open(`tel:${booking.provider?.phone || booking.customerPhone}`)} 
            className="p-4 bg-brand-surface text-brand-amber rounded-2xl border border-white/5 shadow-lg active:scale-95 transition-all"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>

        {/* Booking Info (Contrast fix) */}
        <div className="flex justify-between items-center px-4 text-[9px] font-black text-gray-teal uppercase tracking-[0.3em]">
          <span>Booking: <span className="text-cream">#{booking.id.slice(-8).toUpperCase()}</span></span>
          <span className="text-brand-amber border-b border-brand-amber/20 pb-0.5">{formatCurrency(booking.totalAmount)} Payment</span>
        </div>

        {/* Status Tracker (Themed) */}
        <div className="bg-brand-slate rounded-[40px] p-10 border border-white/5 shadow-2xl">
          {isCancelled ? (
            <div className="text-center py-6 space-y-4">
              <XCircle className="w-20 h-20 text-red-500 mx-auto opacity-50" />
              <div className="space-y-1">
                 <h3 className="text-xl font-black text-cream uppercase tracking-tighter">Booking Cancelled</h3>
                 <p className="text-red-500/60 text-[10px] font-black uppercase tracking-widest">This booking has been cancelled</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {steps.map((step, index) => {
                let isDone = index <= currentStepIndex;
                let isActive = index === currentStepIndex;
                const isLast = index === steps.length - 1;

                let label = step.label;
                let subtext = isActive ? 'In Progress' : isDone ? 'Completed' : 'Upcoming';
                let stepIcon = step.icon;
                let customBg = '';
                let customText = '';

                if (step.id === 'completed') {
                  if (isOTPVerified) {
                    if (!hasSubmittedTrx) {
                      label = "⚠️ PAYMENT REQUIRED";
                      subtext = "Action Needed";
                      customBg = "bg-brand-amber/20 text-brand-amber border-brand-amber";
                      customText = "text-brand-amber font-black";
                      stepIcon = AlertCircle;
                      isDone = true;
                      isActive = true;
                    } else {
                      label = "COMPLETED";
                      subtext = "Job Fully Completed";
                      customBg = "bg-emerald-500 text-brand-dark border-emerald-500";
                      stepIcon = CheckCircle2;
                      isDone = true;
                      isActive = false;
                    }
                  } else {
                    isDone = false;
                    isActive = false;
                  }
                }

                return (
                  <div key={step.id} className="flex gap-8 relative">
                    {!isLast && (
                      <div className={`absolute left-[19px] top-10 bottom-0 w-1 transition-all duration-1000 ${isDone && !isActive ? 'bg-brand-amber' : 'bg-brand-surface opacity-30'}`} />
                    )}
                    
                    <div className="relative z-10">
                      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center border-4 border-brand-slate shadow-2xl transition-all duration-700 ${customBg ? customBg : isDone ? 'bg-brand-amber text-brand-dark' : 'bg-brand-surface text-gray-teal/30'}`}>
                        {isDone && !isActive && step.id !== 'completed' ? <CheckCircle2 className="w-5 h-5" /> : React.createElement(stepIcon, { className: "w-4 h-4" })}
                      </div>
                    </div>

                    <div className={`pb-12 transition-all duration-700 ${isActive ? 'translate-x-1' : 'opacity-30'}`}>
                      <h4 className={`text-xs font-black uppercase tracking-widest ${customText ? customText : isActive ? 'text-cream' : 'text-gray-teal'}`}>{label}</h4>
                      <p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1.5 ${customText ? customText : isActive ? 'text-brand-amber' : 'text-gray-teal'}`}>
                        {subtext}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rating Section (Themed) */}
        {booking.status === 'completed' && !booking.reviewSubmitted && hasSubmittedTrx && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-slate rounded-[40px] p-8 border border-white/5 shadow-3xl space-y-8"
          >
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-cream uppercase tracking-tighter">Rate Your Experience</h3>
              <p className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em]">How was your work with {booking.providerName}?</p>
            </div>

            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.2, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setUserRating(star)}
                  className="transition-all"
                >
                  <Star 
                    className={`w-12 h-12 transition-colors duration-300 ${
                      star <= userRating 
                        ? 'fill-brand-amber text-brand-amber drop-shadow-[0_0_8px_rgba(255,179,0,0.4)]' 
                        : 'text-brand-surface opacity-50'
                    }`} 
                  />
                </motion.button>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em] px-2">Your Feedback</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review here..."
                className="w-full bg-brand-dark border border-brand-surface rounded-[28px] px-6 py-5 text-sm font-bold focus:ring-2 focus:ring-brand-amber outline-none text-cream min-h-[120px] resize-none shadow-inner placeholder:text-gray-teal/50"
              />
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={userRating === 0 || reviewSubmitting}
              className="w-full bg-brand-amber text-brand-dark font-black py-5 rounded-[28px] shadow-2xl hover:shadow-brand-amber/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.3em] text-[10px]"
            >
              {reviewSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Review'}
            </button>
          </motion.div>
        )}

        {/* Review Submitted Info (Themed) */}
        {booking.reviewSubmitted && (
          <div className="bg-brand-amber/10 border border-brand-amber/20 rounded-[40px] p-8 text-center space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  className={`w-6 h-6 ${
                    star <= (booking.rating || 0) 
                      ? 'fill-brand-amber text-brand-amber' 
                      : 'text-brand-amber/20'
                  }`} 
                />
              ))}
            </div>
            <div className="space-y-1">
               <h4 className="font-black text-brand-amber text-sm uppercase tracking-widest">Review Submitted</h4>
               <p className="text-[9px] text-gray-teal font-black uppercase tracking-[0.2em] opacity-80 leading-relaxed">Thank you for sharing your experience!</p>
            </div>
          </div>
        )}

        {/* Details Card (Contrast fix) */}
        <div className="bg-brand-slate rounded-[40px] p-8 border border-brand-surface shadow-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-teal uppercase tracking-[0.4em] px-2">Work Address / ঠিকানা</label>
            <div className="flex items-start gap-3 bg-brand-dark rounded-2xl p-4 border border-brand-surface">
               <MapPin className="text-brand-amber w-4 h-4 mt-0.5 shrink-0" />
               <p className="text-xs font-bold text-cream tracking-tight leading-relaxed">{booking.address}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-teal uppercase tracking-[0.4em] px-2">Service Date</label>
              <p className="bg-brand-dark rounded-xl px-4 py-3 text-xs font-black text-cream border border-brand-surface uppercase tracking-tighter">{booking.date}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-teal uppercase tracking-[0.4em] px-2">Preferred Time</label>
              <p className="bg-brand-dark rounded-xl px-4 py-3 text-xs font-black text-cream border border-brand-surface uppercase tracking-tighter">{booking.time}</p>
            </div>
          </div>
        </div>

        {/* Payment Section (Refactored) */}
        {booking.status === 'completed' && booking.paymentMethod !== 'cash' && (
          <div className="bg-brand-slate rounded-[40px] p-8 border border-white/5 shadow-3xl space-y-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-brand-amber/10 rounded-[22px] flex items-center justify-center border border-brand-amber/20 shadow-inner">
                <CreditCard className="w-6 h-6 text-brand-amber" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-cream text-base uppercase tracking-tighter leading-none">Payment Verification</h3>
                <p className="text-[9px] font-black text-gray-teal uppercase tracking-[0.2em]">Method: {booking.paymentMethod.toUpperCase()}</p>
              </div>
            </div>

            {booking.paymentStatus === 'pending' || booking.paymentStatus === 'rejected' ? (
              <div className="space-y-6">
                {booking.paymentStatus === 'rejected' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-5 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">PAYMENT REJECTED</h4>
                      <p className="text-[9px] text-red-500/80 font-bold uppercase tracking-widest leading-relaxed">The Transaction ID was invalid. Please double check and resubmit.</p>
                    </div>
                  </div>
                )}

                <div className="bg-brand-dark rounded-[32px] p-6 space-y-4 border border-brand-surface shadow-inner">
                  <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest opacity-60 leading-relaxed px-1">Send <span className="text-cream bg-brand-amber/20 px-2 py-0.5 rounded-lg border border-brand-amber/20">{formatCurrency(booking.totalAmount)}</span> to Official {booking.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} Number:</p>
                  <div className="flex items-center justify-between bg-brand-surface p-5 rounded-2xl border border-white/5 group active:scale-95 transition-all">
                     <p className="text-2xl font-black text-brand-amber tracking-tighter leading-none">
                        {booking.paymentMethod === 'bkash' ? (settings?.bkashNumber || '017XXXXXXXX') : (settings?.nagadNumber || '018XXXXXXXX')}
                     </p>
                     <span className="text-[8px] font-black text-gray-teal uppercase tracking-[0.3em] opacity-40">Copy Number</span>
                  </div>
                  <p className="text-[8px] text-gray-teal font-black uppercase tracking-[0.3em] text-center italic">Please complete the payment on bKash/Nagad first</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.4em] px-2">{booking.paymentMethod === 'bkash' ? 'bKash Transaction ID (TrxID)' : 'Nagad Transaction ID (TrxID)'}</label>
                  <input 
                    type="text"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder={booking.paymentMethod === 'bkash' ? 'bKash Transaction ID (TrxID)' : 'Nagad Transaction ID (TrxID)'}
                    className="w-full bg-brand-dark border border-brand-surface rounded-[28px] px-6 py-5 text-base font-black focus:ring-2 focus:ring-brand-amber outline-none text-cream tracking-widest shadow-inner placeholder:text-gray-teal/50"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.4em] px-2">Upload Payment Screenshot</label>
                  <div className="relative h-48 bg-brand-dark border-2 border-dashed border-white/5 rounded-[32px] overflow-hidden group flex flex-col items-center justify-center gap-3 shadow-inner hover:border-brand-amber/20 transition-all">
                    {screenshotPreview || booking?.paymentScreenshotUrl ? (
                      <img 
                        src={screenshotPreview || booking?.paymentScreenshotUrl} 
                        className="w-full h-full object-cover" 
                        alt="Payment Screenshot" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-brand-surface flex items-center justify-center text-gray-teal/30 border border-white/5 group-hover:text-brand-amber transition-colors">
                           <Camera className="w-7 h-7" />
                        </div>
                        <span className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em] opacity-40">Upload Payment Screenshot</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSubmitPayment}
                  disabled={!trxId || submitting}
                  className="w-full bg-brand-amber text-brand-dark font-black py-5 rounded-[28px] shadow-2xl hover:shadow-brand-amber/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.4em] text-[10px]"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
                </button>
              </div>
            ) : booking.paymentStatus === 'submitted' ? (
              <div className="bg-brand-slate rounded-[32px] border-2 border-brand-amber/20 p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-brand-amber/10 rounded-[28px] flex items-center justify-center mx-auto border border-brand-amber/20">
                   <Clock className="w-8 h-8 text-brand-amber animate-pulse" />
                </div>
                <div className="space-y-1">
                   <h4 className="font-black text-brand-amber text-sm uppercase tracking-widest">Verifying Payment</h4>
                   <p className="text-[9px] text-gray-teal font-black uppercase tracking-[0.2em] leading-relaxed">Our team is verifying your Transaction ID: <span className="text-white border-b border-white/20 pb-0.5">{booking.trxId}</span></p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border-2 border-emerald-500/20 rounded-[32px] p-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                <div className="space-y-1">
                   <h4 className="font-black text-emerald-500 text-sm uppercase tracking-widest leading-none">Payment Confirmed</h4>
                   <p className="text-[9px] text-gray-teal font-black uppercase tracking-[0.2em]">Your payment has been successfully verified!</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cash Payment Info (Themed) */}
        {booking.status === 'completed' && booking.paymentMethod === 'cash' && (
          <div className="bg-brand-slate rounded-[40px] p-8 border border-brand-surface shadow-3xl space-y-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-brand-amber/10 rounded-[22px] flex items-center justify-center border border-brand-amber/20">
                <CreditCard className="w-6 h-6 text-brand-amber" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-cream text-base uppercase tracking-tighter leading-none">Physical Settlement</h3>
                <p className="text-[9px] font-black text-gray-teal uppercase tracking-[0.2em] opacity-60">Direct Site Handover</p>
              </div>
            </div>
            <div className="bg-brand-dark border-2 border-brand-amber/20 rounded-[28px] p-6">
              <p className="text-[11px] font-black text-cream uppercase tracking-widest text-center leading-relaxed">
                Release <span className="text-brand-amber text-lg">{formatCurrency(booking.totalAmount)}</span> in physical currency to <span className="text-brand-amber text-lg">{booking.providerName}</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {!isCancelled && booking.status === 'pending' && (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-brand-dark/80 backdrop-blur-3xl border-t border-white/5 p-6 pb-10 z-50">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleCancel}
            className="w-full bg-brand-surface text-red-500 font-black py-5 rounded-[24px] border border-red-500/10 active:scale-[0.98] transition-all uppercase tracking-[0.4em] text-[10px] shadow-lg"
          >
            Cancel Booking
          </motion.button>
        </div>
      )}
    </div>
  );
};
