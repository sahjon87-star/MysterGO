import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDocs, runTransaction, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  X, 
  Loader2, 
  CreditCard,
  TrendingUp,
  History,
  TrendingDown,
  Gift,
  AlertCircle,
  CheckCircle2,
  Clock,
  Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Withdrawal } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

export const ProviderWallet: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'withdrawals'>('history');

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (profile && !isInitialized) {
      if (profile.phone) {
        setAccountNumber(profile.phone);
      }
      setIsInitialized(true);
    }
  }, [profile, isInitialized]);

  useEffect(() => {
    if (!profile?.uid) return;

    // Listen for transactions
    const qTrx = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      limit(50)
    );

    const unsubTrx = onSnapshot(qTrx, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    // Listen for withdrawals
    const qWithdraws = query(
      collection(db, 'withdrawals'),
      where('userId', '==', profile.uid),
      limit(50)
    );

    const unsubWithdraws = onSnapshot(qWithdraws, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setWithdrawals(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });

    return () => {
      unsubTrx();
      unsubWithdraws();
    };
  }, [profile?.uid]);

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'system_config'));
        if (snap.exists()) {
          setSettings(snap.data());
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleWithdraw = async () => {
    if (!profile || !amount || !accountNumber) {
      toast.error('Please fill all fields');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > (profile.walletBalance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    if (withdrawAmount < 100) {
      toast.error('Minimum withdrawal is ৳100');
      return;
    }

    setProcessing(true);
    try {
      const userRef = doc(db, 'providers', profile.uid);
      
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("Provider profile not found");
        }

        const currentBalance = userDoc.data().walletBalance || 0;
        if (currentBalance < withdrawAmount) {
          throw new Error("Insufficient balance for withdrawal");
        }

        // 1. Deduct from wallet
        transaction.update(userRef, {
          walletBalance: currentBalance - withdrawAmount,
          updatedAt: serverTimestamp()
        });

        // 3. Create transaction record
        const txRef = doc(collection(db, 'transactions'));
        const txData = {
          userId: profile.uid,
          userName: profile.name,
          userPhone: profile.phone || '',
          userAddress: profile.address || '',
          amount: withdrawAmount,
          type: 'debit',
          description: `Withdrawal via ${method.toUpperCase()}`,
          status: 'pending',
          method,
          accountNumber,
          userCollection: profile._collection || 'providers',
          createdAt: serverTimestamp(),
        };
        transaction.set(txRef, txData);

        // 2. Create withdrawal request
        const withdrawalRef = doc(collection(db, 'withdrawals'));
        transaction.set(withdrawalRef, {
          userId: profile.uid,
          userName: profile.name,
          userPhone: profile.phone,
          userAddress: profile.address || '',
          amount: withdrawAmount,
          status: 'pending',
          method,
          accountNumber,
          userCollection: profile._collection || 'providers',
          createdAt: serverTimestamp(),
          linkedTransactionId: txRef.id
        });
      });

      toast.success('Withdrawal request submitted! It will be processed within 24 hours.');
      setShowWithdraw(false);
      setAmount('');
    } catch (err: any) {
      console.error('Withdrawal Error:', err);
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setProcessing(false);
    }
  };

  const totalEarnings = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'credit' && tx.status === 'approved')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  return (
    <div className="space-y-6 pb-20 bg-brand-dark min-h-screen">
      {/* Wallet Hero */}
      <div className="mx-4 mt-4 p-8 bg-brand-slate rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-amber/5 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-brand-amber/10 transition-all duration-700" />
        
        <div className="relative z-10 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-gray-teal text-[10px] font-black uppercase tracking-[0.3em]">Wallet Balance</p>
            <div className="text-5xl font-black text-cream tracking-tighter">
              {formatCurrency(profile?.walletBalance || 0)}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-gray-teal text-[9px] font-black uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full w-fit mx-auto border border-white/5">
            <RefreshCw className="w-3 h-3 animate-spin-slow text-brand-amber" />
            <span>Updated Live</span>
          </div>

          <div className="flex gap-4 pt-4 max-w-sm mx-auto">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWithdraw(true)}
              className="flex-1 bg-brand-amber text-brand-dark p-5 rounded-3xl shadow-xl shadow-brand-amber/20 transition-all flex flex-col items-center gap-2"
            >
              <ArrowUpRight className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest">Withdraw Funds</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-4 -mt-10 relative z-20">
        <div className="bg-brand-slate p-6 border border-white/5 rounded-[32px] shadow-2xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-teal">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Total Earned</span>
            </div>
            <div className="text-2xl font-black text-cream tracking-tight">{formatCurrency(totalEarnings)}</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <TrendingUp className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Referral Info */}
      <div className="px-4">
        <div className="bg-brand-slate p-6 flex items-center gap-5 border border-white/5 rounded-[32px] shadow-2xl">
           <div className="w-14 h-14 bg-brand-amber/10 border border-brand-amber/20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
            <Gift className="w-7 h-7 text-brand-amber" />
          </div>
          <div className="flex-1 space-y-0.5">
            <h4 className="font-black text-xs text-cream uppercase tracking-tight leading-none">Refer and Earn ৳{settings?.referralRewardAmount ?? 20}</h4>
            <p className="text-[10px] font-bold text-gray-teal uppercase tracking-widest">Share code: <span className="text-brand-amber">{profile?.referralCode}</span></p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/referral')} 
            className="p-3 bg-brand-amber/10 hover:bg-brand-amber text-brand-amber hover:text-brand-dark rounded-2xl transition-all shadow-sm border border-brand-amber/20"
          >
            <ArrowUpRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex gap-2 bg-brand-slate p-1.5 rounded-[24px] border border-white/5 shadow-2xl">
          {([
            { id: 'history', label: 'Transaction History', icon: History },
            { id: 'withdrawals', label: 'Withdrawal History', icon: Banknote },
          ] as const).map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-brand-amber text-brand-dark shadow-lg shadow-brand-amber/20 scale-[1.02]' : 'text-gray-teal hover:text-white'}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'history' ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-4"
            >
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-24 bg-brand-slate animate-pulse rounded-3xl border border-white/5" />)
              ) : transactions.length === 0 ? (
                <div className="bg-brand-slate p-16 rounded-[40px] text-center border border-white/5 space-y-4 shadow-sm">
                  <div className="text-5xl animate-bounce grayscale">📖</div>
                  <p className="text-gray-teal text-[10px] font-black uppercase tracking-widest">No activities recorded</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="bg-brand-slate p-5 rounded-3xl flex items-center gap-5 hover:bg-brand-surface/50 border border-white/5 transition-all relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.status === 'approved' ? 'bg-emerald-500' : tx.status === 'rejected' ? 'bg-red-500' : 'bg-brand-amber'}`} />
                    
                    <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shadow-inner ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {tx.type === 'credit' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-cream truncate tracking-tight uppercase">{tx.description}</h4>
                        {tx.reviewedByAdmin && (
                           <span className="px-2 py-0.5 bg-brand-amber/10 text-brand-amber text-[7px] font-black rounded-full uppercase tracking-tighter border border-brand-amber/10">Verified</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-gray-teal" />
                        <p className="text-[9px] font-bold text-gray-teal uppercase tracking-widest">
                          {tx.createdAt?.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-base font-black tracking-tighter ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-500'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </div>
                      <p className="text-[7px] font-black text-gray-teal uppercase tracking-tighter">Completed</p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="withdrawals"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-24 bg-brand-slate animate-pulse rounded-3xl border border-white/5" />)
              ) : withdrawals.length === 0 ? (
                <div className="bg-brand-slate p-16 rounded-[40px] text-center border border-white/5 space-y-4 shadow-sm">
                  <div className="text-5xl animate-bounce grayscale">🏧</div>
                  <p className="text-gray-teal text-[10px] font-black uppercase tracking-widest">No withdrawals found</p>
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="bg-brand-slate p-6 rounded-3xl flex items-center gap-5 hover:bg-brand-surface/50 border border-white/5 transition-all relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${w.status === 'approved' ? 'bg-emerald-500' : w.status === 'rejected' ? 'bg-red-500' : 'bg-brand-amber'}`} />
                    
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-brand-amber/10 text-brand-amber border border-brand-amber/20'}`}>
                      {w.status === 'approved' ? <CheckCircle2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h4 className="text-lg font-black text-cream tracking-tighter leading-none">{formatCurrency(w.amount)}</h4>
                        <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full border ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-brand-amber/10 text-brand-amber border-brand-amber/20'}`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-gray-teal" />
                          <p className="text-[10px] font-bold text-gray-teal uppercase tracking-widest">{w.method} • {w.accountNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] font-black text-gray-teal text-right uppercase tracking-widest">
                      {w.createdAt?.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-brand-dark/80 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-brand-slate w-full max-w-md rounded-t-[40px] p-8 space-y-6 border-t border-white/5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight text-cream uppercase">Withdraw Earnings</h3>
                <button onClick={() => setShowWithdraw(false)} className="p-2 bg-brand-surface rounded-xl border border-white/5">
                  <X className="w-5 h-5 text-gray-teal" />
                </button>
              </div>

              <div className="space-y-4">
                 <div className="bg-brand-amber text-brand-dark rounded-[32px] p-6 space-y-2">
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Withdrawal Rule</p>
                   <p className="text-xs font-bold leading-relaxed">Withdrawals are processed within 24 hours. Minimum amount: ৳100.</p>
                 </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setMethod('bkash')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${method === 'bkash' ? 'bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-600/20' : 'bg-brand-surface border-white/5 text-gray-teal'}`}
                  >
                    bKash
                  </button>
                  <button 
                    onClick={() => setMethod('nagad')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${method === 'nagad' ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-brand-surface border-white/5 text-gray-teal'}`}
                  >
                    Nagad
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-2">Withdraw Amount (৳)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-brand-dark border border-white/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-brand-amber outline-none text-lg font-black text-cream"
                    placeholder="Min ৳100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-2">Account Number</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-brand-dark border border-white/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-brand-amber outline-none text-sm font-bold text-cream uppercase"
                    placeholder="017XXXXXXXX"
                  />
                </div>

                <button 
                  onClick={handleWithdraw}
                  disabled={processing || !amount || !accountNumber}
                  className="w-full bg-brand-amber text-brand-dark py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-amber/20 flex items-center justify-center gap-2 transition-all hover:shadow-brand-amber/40"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  Confirm Withdrawal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
