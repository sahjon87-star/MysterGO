import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where, doc, updateDoc, serverTimestamp, increment, addDoc } from 'firebase/firestore';
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
  Loader2
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
      
      // 1. Update booking payment status
      await updateDoc(doc(db, 'bookings', booking.id), {
        paymentStatus: 'paid',
        reviewedByAdmin: adminProfile?.name || 'Admin',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Add funds to provider/shop wallet
      await updateDoc(doc(db, collectionName, booking.providerId), {
        walletBalance: increment(earning),
        totalEarnings: increment(earning)
      });

      // 3. Create transaction record for provider
      await addDoc(collection(db, 'transactions'), {
        userId: booking.providerId,
        userName: booking.providerName,
        userPhone: '', // Not easily available here, but transaction record should have it if possible
        amount: earning,
        type: 'credit',
        status: 'approved',
        description: `Job Payment: ${booking.service} (#${booking.id.slice(-6).toUpperCase()})`,
        reviewedByAdmin: adminProfile?.name || 'Admin',
        reviewedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // 4. Notify provider
      await addDoc(collection(db, 'notifications'), {
        userId: booking.providerId,
        title: 'Payment Received',
        message: `You received ${formatCurrency(earning)} for job #${booking.id.slice(-6).toUpperCase()}`,
        type: 'payment',
        read: false,
        createdAt: serverTimestamp()
      });

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
        reviewedByAdmin: adminProfile?.name || 'Admin',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Notify customer
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'Payment Rejected',
        message: `Your payment for job #${booking.id.slice(-6).toUpperCase()} was rejected. Please check the TrxID and resubmit.`,
        type: 'payment',
        read: false,
        createdAt: serverTimestamp()
      });

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
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800';
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">Booking Matrix</h2>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Operational Service Oversight</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 glass-card bg-white dark:bg-slate-900 border-none rounded-2xl flex items-center justify-center shadow-glass transition-all"
        >
          <Filter className="text-primary-blue w-6 h-6" />
        </motion.button>
      </div>

      {/* Tabs Matrix */}
      <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-[24px] border border-white/20 dark:border-slate-800 shadow-glass overflow-x-auto no-scrollbar">
        {['all', 'pending', 'ongoing', 'completed', 'cancelled'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 min-w-[90px] py-3.5 rounded-[18px] text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center ${activeTab === tab ? 'bg-primary-blue text-white shadow-lg shadow-primary-blue/30 scale-[1.02]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
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
              <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-800 dark:text-white leading-none">Ledger Empty</h4>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest">No activity in this quadrant</p>
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
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-inner overflow-hidden shrink-0">
                  {booking.customerName ? (
                    <span className="text-slate-400 dark:text-slate-500 font-black text-lg">{getInitials(booking.customerName)}</span>
                  ) : (
                    <User className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-slate-800 dark:text-white text-base tracking-tight leading-none truncate group-hover:text-primary-blue transition-colors">
                      {booking.customerName || 'Anonymous Client'}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-widest ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Briefcase className="w-3.5 h-3.5 text-primary-blue" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{booking.service}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 border-l border-slate-100 dark:border-slate-800 pl-4">
                      <Phone className="w-3.5 h-3.5 text-primary-light" />
                      <span className="text-[10px] font-bold tracking-widest">{booking.customerPhone}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{formatCurrency(booking.totalAmount)}</div>
                  <button className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-primary-blue rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2 border-none">
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
                    <Calendar className="w-3.5 h-3.5 text-primary-blue" />
                    <span>Deployment</span>
                  </div>
                  <p className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight">{booking.date} • {booking.time}</p>
                </div>
                <div className="glass-card bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2 border-none">
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
                    <MapPin className="w-3.5 h-3.5 text-primary-light" />
                    <span>Asset Allocated</span>
                  </div>
                  <p className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight truncate">{booking.providerName || 'Assigning...'}</p>
                </div>
              </div>

              {/* Payment Oversight */}
              {booking.status === 'completed' && booking.paymentMethod !== 'cash' && (
                <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {booking.paymentStatus === 'submitted' ? (
                      <div className="flex items-center gap-2 py-1.5 px-3 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/10">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Payment Audit Pending</span>
                      </div>
                    ) : booking.paymentStatus === 'paid' ? (
                      <div className="flex items-center gap-2 py-1.5 px-3 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/10">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Ledger Settled</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full border border-slate-200 dark:border-slate-800">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Capital</span>
                      </div>
                    )}
                    {booking.paymentStatus === 'paid' && (booking as any).reviewedByAdmin && (
                       <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Verified by {(booking as any).reviewedByAdmin}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {booking.paymentStatus === 'submitted' ? (
                      <>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRejectPayment(booking)}
                          disabled={verifying === booking.id}
                          className="px-6 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                          Reject
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprovePayment(booking)}
                          disabled={verifying === booking.id}
                          className="px-6 py-3 bg-primary-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-blue/30 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {verifying === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
                        </motion.button>
                      </>
                    ) : (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/admin/map')}
                        className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
                      >
                        Telemetry
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Data Layer */}
              {booking.paymentStatus === 'submitted' && (booking.trxId || booking.paymentScreenshotUrl) && (
                <div className="mt-4 p-5 glass-card bg-slate-900 border-none rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary-blue" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Transaction Identity</span>
                        <span className="text-xs font-black text-white tracking-widest">{booking.trxId || 'EXTERNAL_TRANSF'}</span>
                      </div>
                    </div>
                    <div className="text-[9px] font-black text-white uppercase tracking-widest bg-primary-blue/30 px-3 py-1.5 rounded-full border border-primary-blue/30">
                      {booking.paymentMethod.toUpperCase()}
                    </div>
                  </div>
                  
                  {booking.paymentScreenshotUrl && (
                    <div 
                      onClick={() => setSelectedBooking(booking)}
                      className="group/img relative h-24 bg-black/40 rounded-2xl overflow-hidden cursor-pointer border border-white/5 transition-all hover:border-white/20"
                    >
                      <img 
                        src={booking.paymentScreenshotUrl} 
                        className="w-full h-full object-cover opacity-40 group-hover/img:opacity-80 transition-opacity" 
                        alt="Payment Screenshot" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/20">
                         <PlayCircle className="w-8 h-8 text-white shadow-2xl" />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-sm">Payment Verification</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">TrxID: {selectedBooking.trxId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800">
                <div className="aspect-[3/4] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner bg-white dark:bg-slate-900">
                  <img 
                    src={selectedBooking.paymentScreenshotUrl} 
                    className="w-full h-full object-contain" 
                    alt="Payment Screenshot Full" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="p-6 flex gap-3">
                <button 
                  onClick={() => {
                    handleRejectPayment(selectedBooking);
                    setSelectedBooking(null);
                  }}
                  className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 dark:border-red-500/20 active:scale-95 transition-all"
                >
                  REJECT
                </button>
                <button 
                  onClick={() => {
                    handleApprovePayment(selectedBooking);
                    setSelectedBooking(null);
                  }}
                  className="flex-[2] bg-primary-blue hover:bg-primary-blue/90 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-blue/20 active:scale-95 transition-all"
                >
                  APPROVE PAYMENT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
