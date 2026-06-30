import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  runTransaction, 
  limit 
} from 'firebase/firestore';
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
  TrendingUp, 
  TrendingDown, 
  History, 
  Gift, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  CreditCard,
  ShoppingBag,
  Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Withdrawal } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

export const ShopWallet: React.FC = () => {
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
      const shopRef = doc(db, 'shops', profile.uid);
      
      await runTransaction(db, async (transaction) => {
        const shopDoc = await transaction.get(shopRef);
        if (!shopDoc.exists()) throw new Error("Shop profile not found");

        const currentBalance = shopDoc.data().walletBalance || 0;
        if (currentBalance < withdrawAmount) throw new Error("Insufficient balance");

        transaction.update(shopRef, {
          walletBalance: currentBalance - withdrawAmount,
          updatedAt: serverTimestamp()
        });

        const txRef = doc(collection(db, 'transactions'));
        const txData = {
          userId: profile.uid,
          userName: profile.shopName || profile.name,
          userPhone: profile.phone || '',
          userAddress: profile.shopAddress || profile.address || '',
          amount: withdrawAmount,
          type: 'debit',
          description: `Shop Withdrawal (${method.toUpperCase()})`,
          status: 'pending',
          method,
          accountNumber,
          userCollection: profile._collection || 'shops',
          createdAt: serverTimestamp(),
        };
        transaction.set(txRef, txData);

        const withdrawalRef = doc(collection(db, 'withdrawals'));
        transaction.set(withdrawalRef, {
          userId: profile.uid,
          userName: profile.shopName || profile.name,
          userPhone: profile.phone,
          userAddress: profile.shopAddress || profile.address || '',
          amount: withdrawAmount,
          status: 'pending',
          method,
          accountNumber,
          userCollection: profile._collection || 'shops',
          createdAt: serverTimestamp(),
          type: 'shop',
          linkedTransactionId: txRef.id
        });
      });

      toast.success('Withdrawal request submitted!');
      setShowWithdraw(false);
      setAmount('');
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setProcessing(false);
    }
  };

  const salesRevenue = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'credit' && tx.status === 'approved')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  return (
    <div className="space-y-6 pb-20">
      {/* Wallet Hero */}
      <div className="glass-card mx-4 mt-4 p-8 bg-brand-dark border-none shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-blue/20 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-primary-blue/30 transition-all duration-700" />
        
        <div className="relative z-10 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-gray-teal text-[10px] font-black uppercase tracking-[0.3em]">Business Capital</p>
            <div className="text-5xl font-black text-cream tracking-tighter">
              {formatCurrency(profile?.walletBalance || 0)}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-gray-teal text-[9px] font-black uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full w-fit mx-auto">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            <span>Automatic Settlements Enabled</span>
          </div>

          <div className="pt-4">
             <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWithdraw(true)}
              className="px-12 py-5 bg-primary-blue hover:bg-primary-light text-cream rounded-3xl shadow-xl shadow-primary-blue/30 transition-all flex items-center gap-3 mx-auto border border-white/10"
            >
              <ArrowUpRight className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest">Withdraw Funds</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="px-4 -mt-10 relative z-20 grid grid-cols-2 gap-4">
         <div className="glass-card p-6 border-none shadow-xl space-y-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
               <TrendingUp className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[9px] font-black text-gray-teal uppercase tracking-widest leading-none mb-1">Gross Sales</p>
               <h4 className="text-xl font-black text-cream dark:text-cream truncate tracking-tight">{formatCurrency(salesRevenue)}</h4>
            </div>
         </div>
         <div className="glass-card p-6 border-none shadow-xl space-y-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 shadow-inner">
               <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[9px] font-black text-gray-teal uppercase tracking-widest leading-none mb-1">Total Orders</p>
               <h4 className="text-xl font-black text-cream dark:text-cream tracking-tight">{profile?.totalOrders || 0}</h4>
            </div>
         </div>
      </div>

      {/* Merchant Fee Info */}
      <div className="px-4">
         <div className="glass-card p-6 flex items-center gap-5 border-none shadow-glass bg-slate-50 dark:bg-brand-dark/50">
            <div className="w-14 h-14 bg-brand-slate dark:bg-brand-surface rounded-2xl flex items-center justify-center text-primary-blue shadow-inner shrink-0 border border-slate-100 dark:border-slate-800">
               <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
               <h4 className="text-[10px] font-black text-cream dark:text-cream uppercase tracking-widest">Settlement Policy</h4>
               <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal leading-relaxed">System applies <span className="text-primary-blue">5% commission</span> on all successful product disbursements.</p>
            </div>
         </div>
      </div>

      {/* Referral Card */}
      <div className="px-4">
        <div className="glass-card p-6 bg-gradient-to-br from-indigo-600 to-primary-blue border-none text-cream shadow-xl relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-[20px] flex items-center justify-center border border-white/20">
                <Gift className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-black text-base uppercase tracking-tight text-cream leading-none">Capital Reward</h3>
                <p className="text-cream/70 text-[10px] font-bold uppercase tracking-widest">Earn ৳{settings?.referralRewardAmount ?? 20} per successful referral</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-brand-dark/30 backdrop-blur-md rounded-2xl px-5 py-4 font-mono font-black text-sm tracking-[0.2em] flex items-center border border-white/10">
                {profile?.referralCode || 'MGO-XXXXXX'}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(profile?.referralCode || '');
                  toast.success('Reward code copied!');
                }}
                className="bg-brand-slate text-primary-blue px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                COPY
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex gap-2 bg-white/50 dark:bg-brand-dark/50 backdrop-blur-md p-1.5 rounded-[24px] border border-white/20 dark:border-slate-800 shadow-glass">
          {([
            { id: 'history', label: 'Sales History', icon: History },
            { id: 'withdrawals', label: 'Payout Logs', icon: Banknote },
          ] as const).map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-primary-blue text-cream shadow-lg shadow-primary-blue/30 scale-[1.02]' : 'text-gray-teal dark:text-gray-teal hover:text-slate-600 dark:hover:text-cream'}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 pb-10">
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
                 [1, 2, 3].map(i => <div key={i} className="h-24 glass-card animate-pulse" />)
              ) : transactions.length === 0 ? (
                <div className="glass-card p-16 text-center space-y-4 shadow-sm border-none">
                  <div className="text-5xl animate-bounce">📖</div>
                  <p className="text-gray-teal text-[10px] font-black uppercase tracking-widest">No Sales Recorded</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="glass-card p-5 flex items-center gap-5 hover:bg-brand-slate dark:hover:bg-brand-dark transition-all relative overflow-hidden group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.status === 'approved' ? 'bg-emerald-500' : tx.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    
                    <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                      {tx.type === 'credit' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-cream dark:text-cream truncate tracking-tight">{tx.description}</h4>
                        {tx.reviewedByAdmin && (
                           <span className="px-2 py-0.5 bg-primary-blue/10 text-primary-blue text-[7px] font-black rounded-full uppercase tracking-tighter border border-primary-blue/10">Verified by {tx.reviewedByAdmin}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-3 h-3 text-cream dark:text-slate-600" />
                        <p className="text-[9px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">
                          {tx.createdAt?.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-base font-black tracking-tighter ${tx.type === 'credit' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </div>
                      <p className="text-[7px] font-black text-cream dark:text-slate-600 uppercase tracking-tighter">Sales Revenue</p>
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
                [1, 2, 3].map(i => <div key={i} className="h-24 glass-card animate-pulse" />)
              ) : withdrawals.length === 0 ? (
                <div className="glass-card p-16 text-center space-y-4 shadow-sm">
                  <div className="text-5xl animate-bounce">🏧</div>
                  <p className="text-gray-teal text-[10px] font-black uppercase tracking-widest">No Withdrawal Requests</p>
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="glass-card p-6 flex items-center gap-5 hover:bg-brand-slate dark:hover:bg-brand-dark transition-all relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${w.status === 'approved' ? 'bg-emerald-500' : w.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'}`}>
                      {w.status === 'approved' ? <CheckCircle2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h4 className="text-lg font-black text-cream dark:text-cream tracking-tighter leading-none">{formatCurrency(w.amount)}</h4>
                        <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full border ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                          {w.status}
                        </span>
                        {w.reviewedByAdmin && (
                           <span className="text-[7px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">Verified by {w.reviewedByAdmin}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-gray-teal" />
                          <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">{w.method} • {w.accountNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] font-black text-gray-teal dark:text-gray-teal text-right uppercase tracking-widest">
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
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-brand-slate dark:bg-brand-dark w-full max-w-md rounded-t-[40px] p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Wallet className="w-32 h-32" />
              </div>

              <div className="flex justify-between items-center relative z-10">
                <h3 className="text-2xl font-black tracking-tight text-cream dark:text-cream uppercase">Withdraw Shop Funds</h3>
                <button onClick={() => setShowWithdraw(false)} className="p-3 bg-slate-50 dark:bg-brand-surface rounded-2xl">
                  <X className="w-5 h-5 text-gray-teal" />
                </button>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMethod('bkash')}
                    className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${method === 'bkash' ? 'bg-pink-500 border-pink-500 text-cream shadow-xl shadow-pink-500/20' : 'bg-slate-50 dark:bg-brand-surface border-transparent text-gray-teal'}`}
                  >
                    bKash
                  </button>
                  <button 
                    onClick={() => setMethod('nagad')}
                    className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${method === 'nagad' ? 'bg-orange-500 border-orange-500 text-cream shadow-xl shadow-orange-500/20' : 'bg-slate-50 dark:bg-brand-surface border-transparent text-gray-teal'}`}
                  >
                    Nagad
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.2em] px-4">Amount to Cash Out (৳)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-brand-surface border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-6 outline-none focus:border-primary-blue text-2xl font-black text-cream dark:text-cream shadow-inner"
                    placeholder="Min ৳100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.2em] px-4">Merchant Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-teal">
                       <CreditCard className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-brand-surface border-2 border-slate-100 dark:border-slate-800 rounded-2xl pl-16 pr-6 p-5 outline-none focus:border-primary-blue text-sm font-bold text-cream dark:text-cream shadow-inner"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleWithdraw}
                  disabled={processing || !amount || !accountNumber}
                  className="w-full bg-primary-blue hover:bg-primary-blue/90 text-cream py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary-blue/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
                  Submit Withdrawal Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
