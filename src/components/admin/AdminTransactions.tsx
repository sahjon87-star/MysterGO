import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where, updateDoc, doc, increment, serverTimestamp, addDoc, getDoc, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Clock, 
  TrendingUp,
  TrendingDown,
  History,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

export const AdminTransactions: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'transactions'), limit(100));
    
    if (activeTab === 'pending') {
      q = query(
        collection(db, 'transactions'),
        where('status', 'in', ['pending', 'pending_approval']),
        limit(100)
      );
    } else if (activeTab !== 'all') {
      q = query(
        collection(db, 'transactions'), 
        where('status', '==', activeTab),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      // Client-side sorting to avoid composite index requirement
      data.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleAction = async (tx: Transaction, status: 'approved' | 'rejected') => {
    if (!tx.id || !tx.userId) return;
    setProcessing(tx.id);
    try {
      const collectionName = (tx as any).userCollection || 'users';

      if (status === 'approved') {
        if (tx.type === 'credit') {
          // ADD MONEY FLOW: Increment balance securely via runTransaction
          await runTransaction(db, async (transaction) => {
            const txRef = doc(db, 'transactions', tx.id);
            const txSnap = await transaction.get(txRef);
            if (!txSnap.exists()) {
              throw new Error("Transaction not found");
            }
            const txData = txSnap.data();
            if (txData.status !== 'pending' && txData.status !== 'pending_approval') {
              throw new Error(`Transaction already has status ${txData.status}`);
            }

            let bookingSnap = null;
            let bookingRef = null;
            if (txData.bookingId) {
              bookingRef = doc(db, 'bookings', txData.bookingId);
              bookingSnap = await transaction.get(bookingRef);
              if (bookingSnap.exists()) {
                const bData = bookingSnap.data();
                const validationBooking = {
                  totalPayout: bData.totalPayout ?? (bData.basePrice || 0),
                  providerBaseRate: bData.providerBaseRate ?? (bData.basePrice || 0),
                  helperCount: bData.helperCount ?? 0,
                  helperUnitRate: bData.helperUnitRate ?? 600
                };
                if (validationBooking.totalPayout !== (validationBooking.providerBaseRate + (validationBooking.helperCount * validationBooking.helperUnitRate))) {
                  throw new Error("Financial Ledger Tampering Detected! Aborting Payout System.");
                }
              }
            }

            // Update transaction status
            transaction.update(txRef, {
              status: 'approved',
              reviewedByAdmin: adminProfile?.name || 'Admin',
              reviewedAt: serverTimestamp(),
              approvedAt: serverTimestamp()
            });

            // Increment user/provider wallet securely
            const userRef = doc(db, collectionName, tx.userId);
            const updateData: any = {
              walletBalance: increment(tx.amount),
              updatedAt: serverTimestamp()
            };
            if (tx.description && (tx.description.includes('Job Completed:') || tx.description.includes('Escrow payment'))) {
              updateData.totalEarnings = increment(tx.amount);
            }
            transaction.update(userRef, updateData);

            // Sync booking if any
            if (bookingRef && bookingSnap?.exists()) {
              transaction.update(bookingRef, {
                paymentStatus: 'paid',
                paymentReleased: true,
                reviewedByAdmin: adminProfile?.name || 'Admin',
                reviewedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }

            // Add notification for the user
            const notifRef = doc(collection(db, 'notifications'));
            transaction.set(notifRef, {
              userId: tx.userId,
              title: 'Payment Approved',
              body: `Your payment of ${formatCurrency(tx.amount)} has been approved and added to your wallet.`,
              type: 'payment',
              read: false,
              createdAt: serverTimestamp()
            });
          });
        } else {
          // WITHDRAWAL FLOW: Balance was already deducted at request time
          // We just need to sync the withdrawal document if it exists
          try {
            const wq = query(
              collection(db, 'withdrawals'),
              where('userId', '==', tx.userId),
              where('amount', '==', tx.amount),
              where('status', '==', 'pending'),
              limit(1)
            );
            const wSnap = await getDocs(wq);
            if (!wSnap.empty) {
              await updateDoc(doc(db, 'withdrawals', wSnap.docs[0].id), {
                status: 'approved',
                reviewedByAdmin: adminProfile?.name || 'Admin',
                reviewedAt: serverTimestamp()
              });
            }
          } catch (e) {
            console.error('Failed to sync withdrawal doc', e);
          }

          await addDoc(collection(db, 'notifications'), {
            userId: tx.userId,
            title: 'Withdrawal Approved',
            body: `Your withdrawal request for ${formatCurrency(tx.amount)} has been approved.`,
            type: 'payment',
            read: false,
            createdAt: serverTimestamp()
          });

          await updateDoc(doc(db, 'transactions', tx.id), {
            status: 'approved',
            reviewedByAdmin: adminProfile?.name || 'Admin',
            reviewedAt: serverTimestamp(),
            approvedAt: serverTimestamp()
          });
        }

        toast.success(`${tx.type === 'credit' ? 'Deposit/Release' : 'Withdrawal'} approved!`);
      } else {
        // REJECT FLOW
        if (tx.type === 'debit') {
          // REFUND FLOW: Re-add the deducted amount
          await updateDoc(doc(db, collectionName, tx.userId), {
            walletBalance: increment(tx.amount)
          });

          // Sync withdrawal doc
          try {
            const wq = query(
              collection(db, 'withdrawals'),
              where('userId', '==', tx.userId),
              where('amount', '==', tx.amount),
              where('status', '==', 'pending'),
              limit(1)
            );
            const wSnap = await getDocs(wq);
            if (!wSnap.empty) {
              await updateDoc(doc(db, 'withdrawals', wSnap.docs[0].id), {
                status: 'rejected',
                reviewedByAdmin: adminProfile?.name || 'Admin',
                reviewedAt: serverTimestamp()
              });
            }
          } catch (e) {
            console.error('Failed to sync withdrawal doc for refund', e);
          }

          await addDoc(collection(db, 'notifications'), {
            userId: tx.userId,
            title: 'Withdrawal Rejected',
            body: `Your withdrawal request for ${formatCurrency(tx.amount)} was rejected and refunded.`,
            type: 'payment',
            read: false,
            createdAt: serverTimestamp()
          });
        } else {
          // Sync booking rejection if any
          if ((tx as any).bookingId) {
            try {
              await updateDoc(doc(db, 'bookings', (tx as any).bookingId), {
                paymentStatus: 'rejected',
                paymentReleased: 'rejected',
                reviewedByAdmin: adminProfile?.name || 'Admin',
                reviewedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            } catch (bErr) {
              console.error('Failed to update booking on tx rejection', bErr);
            }
          }

          await addDoc(collection(db, 'notifications'), {
            userId: tx.userId,
            title: 'Payment Rejected',
            body: `Your payment request of ${formatCurrency(tx.amount)} was rejected.`,
            type: 'payment',
            read: false,
            createdAt: serverTimestamp()
          });
        }

        await updateDoc(doc(db, 'transactions', tx.id), {
          status: 'rejected',
          reviewedByAdmin: adminProfile?.name || 'Admin',
          reviewedAt: serverTimestamp(),
          rejectedAt: serverTimestamp()
        });

        toast.error('Transaction rejected');
      }
      setSelectedTx(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-cream dark:text-cream tracking-tight">Financial Logs</h2>
          <p className="text-gray-teal dark:text-gray-teal text-xs font-bold uppercase tracking-widest">Monitor platform transactions</p>
        </div>
        <div className="w-12 h-12 bg-primary-blue rounded-2xl flex items-center justify-center shadow-lg shadow-primary-blue/20 active:scale-90 transition-all">
          <TrendingUp className="text-cream w-6 h-6" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/50 dark:bg-brand-dark/50 backdrop-blur-md p-1.5 rounded-[24px] border border-white/20 dark:border-slate-800 shadow-glass">
        {[
          { id: 'pending', label: 'Pending', icon: Clock },
          { id: 'approved', label: 'Approved', icon: CheckCircle2 },
          { id: 'rejected', label: 'Rejected', icon: XCircle },
          { id: 'all', label: 'All Logs', icon: History },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-primary-blue text-cream shadow-lg shadow-primary-blue/30 scale-[1.02]' : 'text-gray-teal dark:text-gray-teal hover:text-slate-600 dark:hover:text-cream'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="h-28 glass-card animate-pulse shadow-sm" />)
        ) : transactions.length === 0 ? (
          <div className="glass-card p-16 text-center space-y-4 shadow-sm">
            <div className="text-6xl animate-bounce">💸</div>
            <div className="space-y-1">
              <h4 className="font-black uppercase tracking-tight text-base text-cream dark:text-cream">Clean Ledger</h4>
              <p className="text-gray-teal dark:text-gray-teal text-[10px] font-bold uppercase tracking-widest">No {activeTab} transactions found</p>
            </div>
          </div>
        ) : (
          transactions.map((tx) => (
            <motion.div 
              key={tx.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => (tx.status === 'pending' || tx.status === 'pending_approval') && setSelectedTx(tx)}
              className="glass-card p-6 flex items-center gap-5 hover:bg-white/80 dark:hover:bg-brand-dark/80 transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* Status Accent Line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.status === 'approved' ? 'bg-emerald-500' : tx.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />

              <div className={`w-14 h-14 rounded-2x; flex items-center justify-center transition-all group-hover:rotate-12 ${tx.type === 'credit' ? 'bg-primary-blue/10 text-primary-blue' : 'bg-red-500/10 text-red-500'}`}>
                {tx.type === 'credit' ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h4 className="font-black text-cream dark:text-cream text-base truncate tracking-tight">
                    {tx.userName || `User #${tx.userId.slice(0,6)}`}
                  </h4>
                  {tx.reviewedByAdmin && (
                    <div className="px-2 py-0.5 bg-primary-blue/10 dark:bg-primary-blue/20 text-primary-blue text-[8px] font-black rounded-full uppercase tracking-tighter border border-primary-blue/20">
                      Verified by {tx.reviewedByAdmin}
                    </div>
                  )}
                </div>
                
                <p className="text-[11px] font-bold text-gray-teal dark:text-gray-teal truncate mb-2 mt-0.5">{tx.description}</p>
                
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-brand-surface/50 rounded-lg">
                    <Clock className="w-3 h-3 text-gray-teal" />
                    <span className="text-[9px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest line-clamp-1">
                      {tx.createdAt?.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {tx.userPhone && (
                     <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-blue/5 dark:bg-primary-blue/10 rounded-lg">
                       <span className="text-[9px] font-bold text-primary-blue uppercase tracking-widest">
                         📞 {tx.userPhone}
                       </span>
                     </div>
                  )}
                  
                  {tx.userAddress && (
                     <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-brand-surface/50 rounded-lg max-w-[140px]">
                       <span className="text-[9px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest truncate">
                         📍 {tx.userAddress}
                       </span>
                     </div>
                  )}
                  {tx.trxId && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-brand-surface/50 rounded-lg">
                      <span className="text-[9px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">
                        ID: {tx.trxId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1.5">
                <div className={`text-lg font-black tracking-tight ${tx.type === 'credit' ? 'text-primary-blue' : 'text-red-500'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
                {(tx.status === 'pending' || tx.status === 'pending_approval') && (
                  <div className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[8px] font-black rounded-full uppercase tracking-widest border border-amber-500/20">
                    {tx.status === 'pending_approval' ? 'Escrow Release Required' : 'Review Required'}
                  </div>
                )}
                {tx.status === 'approved' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {tx.status === 'rejected' && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-slate dark:bg-brand-dark w-full max-w-lg rounded-[40px] p-8 space-y-6 border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden relative"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight text-cream dark:text-cream uppercase">Verify Payment</h3>
                  <p className="text-[10px] font-bold text-gray-teal uppercase tracking-widest">Review deposit details</p>
                </div>
                <button onClick={() => setSelectedTx(null)} className="p-2 bg-slate-100 dark:bg-brand-surface rounded-xl">
                  <X className="w-5 h-5 text-gray-teal" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-slate-100 dark:bg-brand-surface/50 p-4 rounded-2xl space-y-2">
                   <div className="flex justify-between items-center">
                      <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">User Details</p>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-[7px] font-black text-gray-teal uppercase tracking-tighter">ID: {selectedTx.userId.slice(0, 8)}</span>
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm font-black text-cream dark:text-cream">{selectedTx.userName || 'Anonymous User'}</p>
                      <div className="flex items-center gap-3">
                         <p className="text-[10px] font-bold text-primary-blue">📞 {selectedTx.userPhone || 'No Phone'}</p>
                         <p className="text-[10px] font-bold text-gray-teal truncate flex-1">📍 {selectedTx.userAddress || 'No Address'}</p>
                      </div>
                   </div>
                </div>
                <div className="bg-slate-50 dark:bg-brand-surface rounded-2xl p-4 space-y-1">
                  <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Amount</p>
                  <p className="text-lg font-black text-primary-blue">{formatCurrency(selectedTx.amount)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-brand-surface rounded-2xl p-4 space-y-1">
                  <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Method</p>
                  <p className="text-lg font-black text-cream dark:text-cream uppercase">
                    {(selectedTx as any).paymentMethod || selectedTx.method || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-brand-surface rounded-2xl p-4 space-y-1">
                  <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Type</p>
                  <p className={`text-sm font-black uppercase ${selectedTx.type === 'credit' ? 'text-primary-blue' : 'text-red-500'}`}>
                    {selectedTx.type === 'credit' ? 'DEPOSIT (IN)' : 'WITHDRAWAL (OUT)'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-brand-surface rounded-2xl p-4 space-y-1">
                  <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Account / TrxID</p>
                  <p className="text-sm font-black text-cream dark:text-cream truncate">
                    {(selectedTx as any).transactionId || selectedTx.trxId || (selectedTx as any).accountNumber || 'N/A'}
                  </p>
                </div>
              </div>

              {(() => {
                const screenshot = selectedTx.screenshotUrl || (selectedTx as any).paymentScreenshotUrl;
                if (!screenshot) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest px-2">Payment Screenshot</p>
                    <div className="relative h-64 bg-slate-100 dark:bg-brand-surface rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img 
                        src={screenshot} 
                        className="w-full h-full object-contain cursor-pointer" 
                        alt="Payment Proof" 
                        referrerPolicy="no-referrer"
                        onClick={() => window.open(screenshot, '_blank')}
                      />
                      <a 
                        href={screenshot} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute bottom-4 right-4 bg-white/90 dark:bg-brand-dark/90 p-3 rounded-xl shadow-lg backdrop-blur-sm hover:scale-105 transition-all"
                      >
                        <ExternalLink className="w-4 h-4 text-cream dark:text-cream" />
                      </a>
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const trxIdText = (selectedTx as any).transactionId || selectedTx.trxId || (selectedTx as any).accountNumber || '';
                const isTrxIdMissing = !trxIdText || trxIdText.trim() === '' || trxIdText.trim().toUpperCase() === 'N/A';
                const isTxPending = selectedTx.status === 'pending' || selectedTx.status === 'pending_approval';

                return (
                  <div className="flex flex-col gap-3 pt-2">
                    {!isTxPending ? (
                      <p className="text-emerald-500 text-[10px] font-bold text-center uppercase tracking-wider">
                        Transaction is already {selectedTx.status?.toUpperCase()}
                      </p>
                    ) : (selectedTx.type === 'credit' && isTrxIdMissing && selectedTx.status === 'pending') ? (
                      <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-wider">
                        Cannot approve: Customer has not provided a valid Transaction ID.
                      </p>
                    ) : null}
                    <div className="flex gap-3 w-full">
                      <button 
                        onClick={() => handleAction(selectedTx, 'rejected')}
                        disabled={!!processing || !isTxPending}
                        className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 dark:border-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {processing === selectedTx.id ? '...' : 'REJECT'}
                      </button>
                      <button 
                        onClick={() => handleAction(selectedTx, 'approved')}
                        disabled={!!processing || !isTxPending || (selectedTx.type === 'credit' && isTrxIdMissing && selectedTx.status === 'pending')}
                        className={`flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 ${
                          (!isTxPending || (selectedTx.type === 'credit' && isTrxIdMissing && selectedTx.status === 'pending'))
                            ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-brand-surface text-gray-teal' 
                            : selectedTx.type === 'debit' 
                              ? 'bg-brand-dark dark:bg-brand-surface text-cream' 
                              : 'bg-primary-blue text-cream shadow-primary-blue/20'
                        }`}
                      >
                        {processing === selectedTx.id ? '...' : selectedTx.type === 'debit' ? 'APPROVE Payout' : selectedTx.status === 'pending_approval' ? 'Approve Release' : 'APPROVE & ADD MONEY'}
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
