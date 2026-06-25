import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, limit, updateDoc, doc, serverTimestamp, addDoc, increment, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight,
  User,
  Banknote,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userAddress?: string;
  amount: number;
  method: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByAdmin?: string;
  reviewedAt?: any;
  createdAt: any;
}

export const AdminWithdrawals: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'withdrawals'),
      where('status', '==', activeTab),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      // Client-side sorting to avoid composite index requirement
      data.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setRequests(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleAction = async (request: WithdrawalRequest, status: 'approved' | 'rejected') => {
    setProcessing(request.id);
    setFeedback(null);
    try {
      // Update withdrawal status
      await updateDoc(doc(db, 'withdrawals', request.id), {
        status,
        reviewedByAdmin: adminProfile?.name || 'Admin',
        reviewedAt: serverTimestamp()
      });

      if (status === 'approved') {
        // FIX H-1: Do NOT create another debit transaction here.
        // The debit was already created when the provider submitted the withdrawal request.
        // We only send the notification.

        // Notify provider — FIX M-1: use 'body' field to match Notification type
        await addDoc(collection(db, 'notifications'), {
          userId: request.userId,
          title: 'Withdrawal Approved',
          body: `Your withdrawal request for ${formatCurrency(request.amount)} has been approved and sent to your ${request.method} account.`,
          type: 'payment',
          read: false,
          createdAt: serverTimestamp()
        });

        // SYNC WITH FINANCE LOGS
        try {
          const linkedId = (request as any).linkedTransactionId;
          if (linkedId) {
            await updateDoc(doc(db, 'transactions', linkedId), {
              status: 'approved',
              reviewedByAdmin: adminProfile?.name || 'Admin',
              reviewedAt: serverTimestamp()
            });
          } else {
            // Fallback for older records
            const tq = query(
              collection(db, 'transactions'),
              where('userId', '==', request.userId),
              where('amount', '==', request.amount),
              where('type', '==', 'debit'),
              where('status', '==', 'pending'),
              limit(1)
            );
            const tSnap = await getDocs(tq);
            if (!tSnap.empty) {
              await updateDoc(doc(db, 'transactions', tSnap.docs[0].id), {
                status: 'approved',
                reviewedByAdmin: adminProfile?.name || 'Admin',
                reviewedAt: serverTimestamp()
              });
            }
          }
        } catch (e) {
          console.error('Finance sync failed', e);
        }
        
        setFeedback({ type: 'success', message: 'Withdrawal approved and provider notified.' });
        toast.success('Withdrawal approved!');
      } else {
        // If rejected, refund the balance to user/provider/shop
        const collectionName = (request as any).userCollection || 'providers';
        
        try {
          await updateDoc(doc(db, collectionName, request.userId), {
            walletBalance: increment(request.amount)
          });
        } catch (e) {
          console.error(`Refund failed for collection ${collectionName}, trying fallbacks`, e);
          // Fallback logic for older requests without userCollection
          try {
            await updateDoc(doc(db, 'providers', request.userId), {
              walletBalance: increment(request.amount)
            });
          } catch {
            await updateDoc(doc(db, 'users', request.userId), {
              walletBalance: increment(request.amount)
            });
          }
        }

        // Create a credit refund transaction to show in history
        await addDoc(collection(db, 'transactions'), {
          userId: request.userId,
          userName: request.userName,
          userPhone: request.userPhone || '',
          description: `Withdrawal Rejected — Refund (${request.method})`,
          amount: request.amount,
          type: 'credit',
          status: 'approved',
          reviewedByAdmin: adminProfile?.name || 'Admin',
          reviewedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });

        // Notify provider — FIX M-1: use 'body' field to match Notification type
        await addDoc(collection(db, 'notifications'), {
          userId: request.userId,
          title: 'Withdrawal Rejected',
          body: `Your withdrawal request for ${formatCurrency(request.amount)} was rejected. The amount has been refunded to your wallet.`,
          type: 'payment',
          read: false,
          createdAt: serverTimestamp()
        });

        // SYNC WITH FINANCE LOGS
        try {
          const linkedId = (request as any).linkedTransactionId;
          if (linkedId) {
            await updateDoc(doc(db, 'transactions', linkedId), {
              status: 'rejected',
              reviewedByAdmin: adminProfile?.name || 'Admin',
              reviewedAt: serverTimestamp()
            });
          } else {
            // Fallback for older records
            const tq = query(
              collection(db, 'transactions'),
              where('userId', '==', request.userId),
              where('amount', '==', request.amount),
              where('type', '==', 'debit'),
              where('status', '==', 'pending'),
              limit(1)
            );
            const tSnap = await getDocs(tq);
            if (!tSnap.empty) {
              await updateDoc(doc(db, 'transactions', tSnap.docs[0].id), {
                status: 'rejected',
                reviewedByAdmin: adminProfile?.name || 'Admin',
                reviewedAt: serverTimestamp()
              });
            }
          }
        } catch (e) {
          console.error('Finance sync failed', e);
        }

        setFeedback({ type: 'success', message: 'Withdrawal rejected and funds refunded.' });
        toast.success('Withdrawal rejected and refunded');
      }
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Action failed' });
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Withdrawal Requests</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Manage provider payouts</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-[24px] border border-white/20 dark:border-slate-800 shadow-glass">
        {[
          { id: 'pending', label: 'Pending', icon: Clock },
          { id: 'approved', label: 'Approved', icon: CheckCircle2 },
          { id: 'rejected', label: 'Rejected', icon: XCircle },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-primary-blue text-white shadow-lg shadow-primary-blue/30 scale-[1.02]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 glass-card animate-pulse shadow-sm" />)
        ) : requests.length === 0 ? (
          <div className="glass-card p-16 text-center space-y-4 shadow-sm">
            <div className="text-6xl animate-bounce">💰</div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-tight text-base text-slate-800 dark:text-white">All Clear</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">No {activeTab} requests pending</p>
            </div>
          </div>
        ) : (
          requests.map((req) => (
            <motion.div 
              key={req.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              className="glass-card p-8 shadow-glass transition-all relative overflow-hidden"
            >
              {/* Status Accent Line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === 'approved' ? 'bg-emerald-500' : req.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[20px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-white/20 shadow-inner">
                    <User className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-slate-800 dark:text-white text-lg tracking-tight leading-none">{req.userName}</h4>
                      {req.reviewedByAdmin && (
                        <div className="px-2 py-0.5 bg-primary-blue/10 dark:bg-primary-blue/20 text-primary-blue text-[7px] font-black rounded-full uppercase tracking-widest border border-primary-blue/20">
                          By {req.reviewedByAdmin}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          {req.createdAt?.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      {req.userPhone && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary-blue/5 dark:bg-primary-blue/10 rounded-lg">
                          <p className="text-[9px] font-black text-primary-blue uppercase tracking-widest">
                            📞 {req.userPhone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end gap-1 px-4 py-3 bg-primary-blue/5 dark:bg-primary-blue/10 rounded-2xl border border-primary-blue/10">
                  <div className="text-2xl font-black text-primary-blue tracking-tighter leading-none">{formatCurrency(req.amount)}</div>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{req.method}</p>
                </div>
              </div>

              {req.userAddress && (
                 <div className="bg-slate-100/50 dark:bg-slate-800/30 p-4 rounded-2xl flex items-start gap-4 mt-6 border border-white/10">
                    <span className="text-lg translate-y-0.5">📍</span>
                    <div className="space-y-0.5 text-left">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Location</p>
                       <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase">{req.userAddress}</p>
                    </div>
                 </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="glass-card shadow-none bg-slate-50/50 dark:bg-slate-800/20 p-5 space-y-2 relative group hover:bg-white transition-all">
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">
                    <Banknote className="w-4 h-4" />
                    <span>Payout Destination</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 dark:text-white tracking-widest">{req.accountNumber || 'N/A'}</p>
                </div>
                <div className="glass-card shadow-none bg-slate-50/50 dark:bg-slate-800/20 p-5 space-y-2 hover:bg-white transition-all">
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Interface</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{req.method}</p>
                </div>
              </div>

              {activeTab === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => handleAction(req, 'rejected')}
                    disabled={processing === req.id}
                    className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {processing === req.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white group-hover:text-red-500" /> : 'REJECT REQUEST'}
                  </button>
                  <button 
                    onClick={() => handleAction(req, 'approved')}
                    disabled={processing === req.id}
                    className="flex-[2] bg-primary-blue hover:bg-primary-light text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary-blue/30 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {processing === req.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : 'APPROVE & FINAL PAYOUT'}
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
