import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where, doc, updateDoc, serverTimestamp, increment, addDoc, runTransaction, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Briefcase, 
  Search, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  PlayCircle,
  MoreVertical,
  Filter,
  CreditCard,
  Check,
  User,
  Phone,
  X,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Booking } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const AdminBookings: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'ongoing' | 'completed' | 'cancelled'>('all');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'bookings'), limit(50));
    if (activeTab !== 'all') {
      q = query(collection(db, 'bookings'), where('status', '==', activeTab), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      // Client-side sorting to avoid composite index requirement
      data.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setBookings(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleApprovePayment = async (booking: Booking) => {
    if (verifying) return;
    setVerifying(booking.id);
    setFeedback(null);
    try {
      const earning = booking.providerEarning || 0;
      const collectionName = booking.providerCollection || 'providers';
      
      await runTransaction(db, async (transaction) => {
        const bookingRef = doc(db, 'bookings', booking.id);
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists()) {
          throw new Error("Booking not found");
        }
        const bData = bookingSnap.data();

        // Enforce a strict server-side calculation check before releasing funds
        const validationBooking = {
          totalPayout: bData.totalPayout ?? (bData.basePrice || 0),
          providerBaseRate: bData.providerBaseRate ?? (bData.basePrice || 0),
          helperCount: bData.helperCount ?? 0,
          helperUnitRate: bData.helperUnitRate ?? 600
        };
        if (validationBooking.totalPayout !== (validationBooking.providerBaseRate + (validationBooking.helperCount * validationBooking.helperUnitRate))) {
          throw new Error("Financial Ledger Tampering Detected! Aborting Payout System.");
        }

        // Ensure we are indeed in a state that can be approved
        if (bData.paymentStatus !== 'submitted' && bData.paymentStatus !== 'pending_approval') {
          throw new Error(`Booking payment status is already ${bData.paymentStatus}`);
        }

        // 1. Update booking payment status and release status
        transaction.update(bookingRef, {
          paymentStatus: 'paid',
          paymentReleased: true,
          reviewedByAdmin: adminProfile?.name || 'Admin',
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 2. Add funds to provider/shop wallet securely
        const providerRef = doc(db, collectionName, booking.providerId);
        transaction.update(providerRef, {
          walletBalance: increment(earning),
          totalEarnings: increment(earning),
          updatedAt: serverTimestamp()
        });

        // 3. Create or update transaction record for provider
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          userId: booking.providerId,
          userName: booking.providerName,
          amount: earning,
          type: 'credit',
          status: 'approved',
          description: `Job Payment Released: ${booking.service} (#${booking.id.slice(-6).toUpperCase()})`,
          reviewedByAdmin: adminProfile?.name || 'Admin',
          reviewedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          bookingId: booking.id
        });

        // 4. Notify provider
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: booking.providerId,
          title: 'Payment Released',
          message: `Payment of ${formatCurrency(earning)} has been released to your wallet for job #${booking.id.slice(-6).toUpperCase()}`,
          type: 'payment',
          read: false,
          createdAt: serverTimestamp()
        });
      });

      // Synchronize any matching transaction document that was pending_approval or pending
      try {
        const txQuery = query(
          collection(db, 'transactions'),
          where('bookingId', '==', booking.id),
          where('status', 'in', ['pending', 'pending_approval']),
          limit(1)
        );
        const txSnap = await getDocs(txQuery);
        if (!txSnap.empty) {
          await updateDoc(doc(db, 'transactions', txSnap.docs[0].id), {
            status: 'approved',
            reviewedByAdmin: adminProfile?.name || 'Admin',
            reviewedAt: serverTimestamp(),
            approvedAt: serverTimestamp()
          });
        }
      } catch (txErr) {
        console.warn("Could not sync transaction status on approval:", txErr);
      }

      setFeedback({ type: 'success', message: 'Payment verified and funds released!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('Approval Error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to approve payment' });
    } finally {
      setVerifying(null);
    }
  };

  const handleRejectPayment = async (booking: Booking) => {
    if (verifying) return;
    setVerifying(booking.id);
    setFeedback(null);
    try {
      // 1. Update booking payment status
      await updateDoc(doc(db, 'bookings', booking.id), {
        paymentStatus: 'rejected',
        paymentReleased: 'rejected',
        reviewedByAdmin: adminProfile?.name || 'Admin',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Notify customer
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'Payment Rejected',
        message: `Your payment/release for job #${booking.id.slice(-6).toUpperCase()} was rejected. Please check the details and resubmit.`,
        type: 'payment',
        read: false,
        createdAt: serverTimestamp()
      });

      // Synchronize any matching transaction document to rejected
      try {
        const txQuery = query(
          collection(db, 'transactions'),
          where('bookingId', '==', booking.id),
          where('status', 'in', ['pending', 'pending_approval']),
          limit(1)
        );
        const txSnap = await getDocs(txQuery);
        if (!txSnap.empty) {
          await updateDoc(doc(db, 'transactions', txSnap.docs[0].id), {
            status: 'rejected',
            reviewedByAdmin: adminProfile?.name || 'Admin',
            reviewedAt: serverTimestamp(),
            rejectedAt: serverTimestamp()
          });
        }
      } catch (txErr) {
        console.warn("Could not sync transaction status on rejection:", txErr);
      }

      setFeedback({ type: 'success', message: 'Payment rejected and customer notified.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('Rejection Error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to reject payment' });
    } finally {
      setVerifying(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-primary-blue bg-primary-blue/10 border-primary-blue/20';
      case 'pending': return 'text-action-orange bg-action-orange/10 border-action-orange/20';
      case 'ongoing': return 'text-primary-blue bg-primary-blue/10 border-primary-blue/20';
      case 'cancelled': return 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20';
      case 'rejected': return 'text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
      default: return 'text-gray-teal bg-slate-50 dark:bg-brand-surface border-slate-100 dark:border-slate-800';
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-cream dark:text-cream tracking-tighter leading-none">Manage Bookings</h2>
          <p className="text-gray-teal dark:text-gray-teal text-[10px] font-black uppercase tracking-[0.3em]">All service bookings</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 glass-card bg-brand-slate dark:bg-brand-dark border-none rounded-2xl flex items-center justify-center shadow-glass transition-all"
        >
          <Filter className="text-primary-blue w-6 h-6" />
        </motion.button>
      </div>

      {/* Tabs Matrix */}
      <div className="flex bg-white/50 dark:bg-brand-dark/50 backdrop-blur-md p-1.5 rounded-[24px] border border-white/20 dark:border-slate-800 shadow-glass overflow-x-auto no-scrollbar">
        {['all', 'pending', 'ongoing', 'completed', 'cancelled'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 min-w-[90px] py-3.5 rounded-[18px] text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center ${activeTab === tab ? 'bg-primary-blue text-cream shadow-lg shadow-primary-blue/30 scale-[1.02]' : 'text-gray-teal dark:text-gray-teal hover:text-slate-600 dark:hover:text-cream'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Booking Ledger */}
      <div className="space-y-5">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-40 glass-card animate-pulse shadow-sm" />)
        ) : bookings.length === 0 ? (
          <div className="glass-card p-20 text-center space-y-5 shadow-sm">
            <div className="text-6xl animate-bounce">📋</div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-widest text-[10px] text-cream dark:text-cream leading-none">No Bookings</h4>
              <p className="text-gray-teal dark:text-gray-teal text-[9px] font-black uppercase tracking-widest">No booking activity found</p>
            </div>
          </div>
        ) : (
          bookings.map((booking, index) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card p-6 border-none shadow-xl space-y-5 relative group overflow-hidden"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                booking.status === 'completed' ? 'bg-emerald-500' :
                booking.status === 'pending' ? 'bg-amber-500' :
                booking.status === 'ongoing' ? 'bg-primary-blue' :
                'bg-red-500'
              }`} />

              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-brand-slate dark:bg-brand-surface border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-inner overflow-hidden shrink-0">
                  {booking.customerName ? (
                    <span className="text-gray-teal dark:text-gray-teal font-black text-lg">{getInitials(booking.customerName)}</span>
                  ) : (
                    <User className="w-8 h-8 text-cream" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-cream dark:text-cream text-base tracking-tight leading-none truncate group-hover:text-primary-blue transition-colors">
                      {booking.customerName || 'Anonymous Client'}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-widest ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1.5 text-gray-teal dark:text-gray-teal">
                      <Briefcase className="w-3.5 h-3.5 text-primary-blue" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{booking.service}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-teal dark:text-gray-teal border-l border-slate-100 dark:border-slate-800 pl-4">
                      <Phone className="w-3.5 h-3.5 text-primary-light" />
                      <span className="text-[10px] font-bold tracking-widest">{booking.customerPhone}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-xl font-black text-cream dark:text-cream tracking-tighter leading-none">{formatCurrency(booking.totalAmount)}</div>
                  <button className="p-2 bg-slate-50 dark:bg-brand-surface text-cream hover:text-primary-blue rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card bg-slate-50 dark:bg-brand-surface/50 p-4 space-y-2 border-none">
                  <div className="flex items-center gap-2 text-gray-teal dark:text-gray-teal text-[9px] font-black uppercase tracking-[0.2em]">
                    <Calendar className="w-3.5 h-3.5 text-primary-blue" />
                    <span>Scheduled Time</span>
                  </div>
                  <p className="text-[11px] font-black text-cream dark:text-cream tracking-tight">{booking.date} • {booking.time}</p>
                </div>
                <div className="glass-card bg-slate-50 dark:bg-brand-surface/50 p-4 space-y-2 border-none">
                  <div className="flex items-center gap-2 text-gray-teal dark:text-gray-teal text-[9px] font-black uppercase tracking-[0.2em]">
                    <MapPin className="w-3.5 h-3.5 text-primary-light" />
                    <span>Provider Assigned</span>
                  </div>
                  <p className="text-[11px] font-black text-cream dark:text-cream tracking-tight truncate">{booking.providerName || 'Assigning...'}</p>
                </div>
              </div>

              {/* Payment Oversight */}
              {booking.status === 'completed' && booking.paymentMethod !== 'cash' && (
                <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {booking.paymentStatus === 'paid' ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 py-1.5 px-3 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/10">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Ledger Sync: Verified & Released</span>
                        </div>
                        {(booking as any).reviewedByAdmin && (
                          <span className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">Verified & Released by {(booking as any).reviewedByAdmin}</span>
                        )}
                      </div>
                    ) : booking.paymentStatus === 'submitted' ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 py-1.5 px-3 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/10">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Ledger Sync: Pending Verification (Escrow Held)</span>
                        </div>
                      </div>
                    ) : booking.paymentStatus === 'pending_approval' ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 py-1.5 px-3 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/10 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-brand-amber" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-amber">Ledger Sync: Escrow Release Requested</span>
                        </div>
                      </div>
                    ) : booking.paymentStatus === 'rejected' ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 py-1.5 px-3 bg-red-500/10 text-red-600 rounded-full border border-red-500/10">
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Ledger Sync: Payment Rejected</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-100 dark:bg-brand-surface text-gray-teal rounded-full border border-slate-200 dark:border-slate-800">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Ledger Sync: Awaiting Payment Submission</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {booking.paymentStatus === 'submitted' || booking.paymentStatus === 'pending_approval' ? (
                      <div className="flex flex-col items-end gap-2">
                        {booking.paymentStatus === 'submitted' && (!booking.trxId || booking.trxId.trim() === '' || booking.trxId.trim().toUpperCase() === 'N/A') && (
                          <p className="text-red-500 text-[9px] font-bold uppercase tracking-wider text-right max-w-[250px]">
                            Cannot approve: Customer has not provided a valid Transaction ID.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleRejectPayment(booking)}
                            disabled={verifying === booking.id}
                            className="px-6 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                          >
                            Reject
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleApprovePayment(booking)}
                            disabled={verifying === booking.id || (booking.paymentStatus === 'submitted' && (!booking.trxId || booking.trxId.trim() === '' || booking.trxId.trim().toUpperCase() === 'N/A'))}
                            className="px-6 py-3 bg-primary-blue text-cream rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-blue/30 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {verifying === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : booking.paymentStatus === 'pending_approval' ? 'Approve Release' : 'Approve'}
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/admin/map')}
                        className="px-6 py-3 bg-brand-slate dark:bg-brand-surface text-slate-600 dark:text-cream rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
                      >
                        Telemetry
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Data Layer */}
              {(booking.paymentStatus === 'submitted' || booking.paymentStatus === 'pending_approval') && (booking.trxId || booking.paymentScreenshotUrl) && (
                <div className="mt-4 p-5 glass-card bg-brand-dark border-none rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary-blue" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-teal uppercase tracking-[0.2em] leading-none mb-1">Transaction Identity</span>
                        <span className="text-xs font-black text-cream tracking-widest">{booking.trxId || 'EXTERNAL_TRANSF'}</span>
                      </div>
                    </div>
                    <div className="text-[9px] font-black text-cream uppercase tracking-widest bg-primary-blue/30 px-3 py-1.5 rounded-full border border-primary-blue/30">
                      {booking.paymentMethod.toUpperCase()}
                    </div>
                  </div>
                  
                  {booking.paymentScreenshotUrl && (
                    <div 
                      onClick={() => setSelectedBooking(booking)}
                      className="group/img relative h-24 bg-brand-dark/40 rounded-2xl overflow-hidden cursor-pointer border border-white/5 transition-all hover:border-white/20"
                    >
                      <img 
                        src={booking.paymentScreenshotUrl} 
                        className="w-full h-full object-cover opacity-40 group-hover/img:opacity-80 transition-opacity" 
                        alt="Payment Screenshot" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-brand-dark/20">
                         <PlayCircle className="w-8 h-8 text-cream shadow-2xl" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Feedback Message */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-4 right-4 w-full z-[110] p-4 rounded-2xl shadow-2xl flex items-center gap-3 ${
              feedback.type === 'success' ? 'bg-primary-blue text-white' : 'bg-red-500 text-white'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <p className="text-xs font-black uppercase tracking-widest">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-slate dark:bg-brand-dark w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-brand-surface flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-teal dark:text-gray-teal" />
                  </div>
                  <div>
                    <h3 className="font-black text-cream dark:text-cream text-sm">Payment Verification</h3>
                    <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">Verify Booking Escrow</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 bg-slate-50 dark:bg-brand-surface rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-teal dark:text-gray-teal" />
                </button>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-brand-surface space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-slate dark:bg-brand-dark rounded-2xl p-4 space-y-1 shadow-sm">
                    <p className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">METHOD</p>
                    <p className="text-base font-black text-cream dark:text-cream uppercase">
                      {selectedBooking.paymentMethod || (selectedBooking as any).method || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-brand-slate dark:bg-brand-dark rounded-2xl p-4 space-y-1 shadow-sm">
                    <p className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">ACCOUNT / TRXID</p>
                    <p className="text-base font-black text-cream dark:text-cream truncate">
                      {selectedBooking.trxId || (selectedBooking as any).transactionId || 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedBooking.paymentScreenshotUrl && (
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest px-2">Payment Receipt Screenshot</p>
                    <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner bg-brand-slate dark:bg-brand-dark">
                      <img 
                        src={selectedBooking.paymentScreenshotUrl} 
                        className="w-full h-full object-contain cursor-pointer" 
                        alt="Payment Screenshot Full" 
                        referrerPolicy="no-referrer"
                        onClick={() => window.open(selectedBooking.paymentScreenshotUrl, '_blank')}
                      />
                      <a 
                        href={selectedBooking.paymentScreenshotUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute bottom-4 right-4 bg-white/90 dark:bg-brand-dark/90 p-3 rounded-xl shadow-lg backdrop-blur-sm hover:scale-105 transition-all"
                      >
                        <ExternalLink className="w-4 h-4 text-cream dark:text-cream" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {(() => {
                const bookingTrxId = selectedBooking.trxId || '';
                const isBookingTrxIdMissing = !bookingTrxId || bookingTrxId.trim() === '' || bookingTrxId.trim().toUpperCase() === 'N/A';
                const isPendingVerification = selectedBooking.paymentStatus === 'submitted';

                return (
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-col gap-3">
                    {!isPendingVerification ? (
                      <p className="text-emerald-500 text-[10px] font-bold text-center uppercase tracking-wider">
                        Payment status is already {selectedBooking.paymentStatus.toUpperCase()}
                      </p>
                    ) : isBookingTrxIdMissing ? (
                      <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-wider">
                        Cannot approve: Customer has not provided a valid Transaction ID.
                      </p>
                    ) : null}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          handleRejectPayment(selectedBooking);
                          setSelectedBooking(null);
                        }}
                        disabled={!isPendingVerification}
                        className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 dark:border-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        REJECT
                      </button>
                      <button 
                        onClick={() => {
                          handleApprovePayment(selectedBooking);
                          setSelectedBooking(null);
                        }}
                        disabled={!isPendingVerification || isBookingTrxIdMissing}
                        className="flex-[2] bg-primary-blue hover:bg-primary-blue/90 text-cream py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-blue/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        APPROVE PAYMENT
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
