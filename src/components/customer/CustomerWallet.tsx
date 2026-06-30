import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, limit, addDoc, serverTimestamp, doc, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Gift, RefreshCw, X, Loader2, Camera, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { uploadImage } from '../../services/imgbb';
import toast from 'react-hot-toast';

export const CustomerWallet: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

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
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [profile]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [transactions]);

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

  const handleAddMoney = async () => {
    if (!profile || !amount || !trxId) {
      toast.error('Please fill all fields');
      return;
    }
    
    setProcessing(true);
    try {
      let screenshotUrl = '';
      if (screenshot) {
        const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
        if (!apiKey || apiKey === 'undefined') {
          toast.error('ImgBB API Key is missing. Please add it in Settings.');
          setProcessing(false);
          return;
        }
        screenshotUrl = await uploadImage(screenshot);
      }

      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        userName: profile.name,
        userPhone: profile.phone,
        userAddress: profile.address || '',
        amount: parseFloat(amount),
        type: 'credit',
        description: `Add Money via ${method.toUpperCase()}`,
        status: 'pending',
        method,
        trxId: trxId.trim(),
        screenshotUrl,
        userCollection: profile._collection || 'users',
        createdAt: serverTimestamp(),
      });

      toast.success('Request submitted! Admin will verify soon.');
      setShowAddMoney(false);
      setAmount('');
      setTrxId('');
      setScreenshot(null);
      setScreenshotPreview(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

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
      const userRef = doc(db, 'users', profile.uid);
      
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User profile not found");
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
          userPhone: profile.phone,
          userAddress: profile.address || '',
          amount: withdrawAmount,
          type: 'debit',
          description: `Withdrawal via ${method.toUpperCase()}`,
          status: 'pending',
          method,
          accountNumber,
          userCollection: profile._collection || 'users',
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
          userCollection: profile._collection || 'users',
          createdAt: serverTimestamp(),
          linkedTransactionId: txRef.id
        });
      });

      toast.success('Withdrawal request submitted!');
      setShowWithdraw(false);
      setAmount('');
    } catch (err: any) {
      console.error('Withdrawal Error:', err);
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Wallet Hero */}
      <div className="glass-card mx-4 mt-4 p-8 bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-blue/20 rounded-full -mr-40 -mt-40 blur-3xl group-hover:bg-primary-blue/30 transition-all duration-700" />
        
        <div className="relative z-10 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Wallet Balance</p>
            <div className="text-5xl font-black text-white tracking-tighter">
              {formatCurrency(profile?.walletBalance || 0)}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-slate-500 text-[9px] font-black uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full w-fit mx-auto">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            <span>Updated Live</span>
          </div>

          <div className="flex gap-4 pt-4 max-w-sm mx-auto">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddMoney(true)}
              className="flex-1 bg-primary-blue hover:bg-primary-light text-white p-5 rounded-3xl shadow-xl shadow-primary-blue/30 transition-all flex flex-col items-center gap-2 border border-white/10"
            >
              <Plus className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Deposit</span>
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWithdraw(true)}
              className="flex-1 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-5 rounded-3xl transition-all flex flex-col items-center gap-2 border border-white/10"
            >
              <ArrowUpRight className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Payout</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Referral Card */}
      <div className="px-4">
        <div className="glass-card p-6 bg-gradient-to-br from-indigo-600 to-primary-blue border-none text-white shadow-xl relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-[20px] flex items-center justify-center border border-white/20">
                <Gift className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-black text-base uppercase tracking-tight text-white leading-none">Referral Bonus</h3>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Earn ৳20 per successful referral</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-black/30 backdrop-blur-md rounded-2xl px-5 py-4 font-mono font-black text-sm tracking-[0.2em] flex items-center border border-white/10">
                {profile?.referralCode || 'MGO-XXXXXX'}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(profile?.referralCode || '');
                  toast.success('Reward code copied!');
                }}
                className="bg-white text-primary-blue px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                COPY
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4 space-y-5">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Transaction History</h3>
          <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            {sortedTransactions.length} ENTRIES
          </div>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 glass-card animate-pulse" />)
          ) : sortedTransactions.length === 0 ? (
            <div className="glass-card p-16 text-center space-y-4">
              <div className="text-5xl animate-bounce">📦</div>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">No transactions yet</p>
            </div>
          ) : (
            sortedTransactions.map((tx) => (
              <motion.div 
                key={tx.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-5 flex items-center gap-5 hover:bg-white dark:hover:bg-slate-900 transition-all border-slate-100 dark:border-slate-800 relative overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.status === 'approved' ? 'bg-emerald-500' : tx.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${tx.type === 'credit' ? 'bg-primary-blue/10 text-primary-blue' : 'bg-red-500/10 text-red-500'}`}>
                  {tx.type === 'credit' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                     <h4 className="text-sm font-black text-slate-800 dark:text-white truncate tracking-tight">{tx.description}</h4>
                     {tx.status === 'approved' && tx.reviewedByAdmin && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[7px] font-black rounded-full uppercase tracking-widest border border-emerald-500/10">Verified by {tx.reviewedByAdmin}</span>
                     )}
                     {tx.status === 'pending' && (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[7px] font-black rounded-full uppercase tracking-widest border border-amber-500/10">Pending Verification</span>
                     )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {tx.createdAt?.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-base font-black tracking-tighter ${tx.type === 'credit' ? 'text-primary-blue' : 'text-red-500'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                  <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter">Settled</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Money Modal */}
      <AnimatePresence>
        {showAddMoney && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[40px] p-8 space-y-6 border-t border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-white uppercase">Add Money</h3>
                <button onClick={() => setShowAddMoney(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
                <div className="bg-primary-blue/10 p-5 rounded-[32px] border border-primary-blue/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-primary-blue uppercase tracking-widest">Instructions</p>
                    <div className="px-2 py-0.5 bg-primary-blue text-white text-[8px] font-black rounded-full uppercase tracking-tighter">Personal</div>
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                    Please send money to our official <span className="font-black text-primary-blue uppercase">{method}</span> number:
                  </p>
                  <p className="text-2xl font-black text-primary-blue tracking-tight">
                    {method === 'bkash' ? (settings?.bkashNumber || '017XXXXXXXX') : (settings?.nagadNumber || '018XXXXXXXX')}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic">Use "Wallet" as reference</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setMethod('bkash')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${method === 'bkash' ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}
                  >
                    bKash
                  </button>
                  <button 
                    onClick={() => setMethod('nagad')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${method === 'nagad' ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}
                  >
                    Nagad
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Amount (৳)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary-blue outline-none text-lg font-black text-slate-800 dark:text-white"
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Transaction ID (TrxID)</label>
                  <input 
                    type="text" 
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary-blue outline-none text-sm font-bold text-slate-800 dark:text-white"
                    placeholder="Enter TrxID"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Payment Screenshot</label>
                  <div className="relative h-40 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden group flex flex-col items-center justify-center gap-2">
                    {screenshotPreview ? (
                      <img 
                        src={screenshotPreview} 
                        className="w-full h-full object-cover" 
                        alt="Payment Screenshot" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tap to upload screenshot</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddMoney}
                  disabled={processing || !amount || !trxId}
                  className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-blue/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Confirm Deposit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[40px] p-8 space-y-6 border-t border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-white uppercase">Withdraw Money</h3>
                <button onClick={() => setShowWithdraw(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMethod('bkash')}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${method === 'bkash' ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}
                  >
                    bKash
                  </button>
                  <button 
                    onClick={() => setMethod('nagad')}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${method === 'nagad' ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}
                  >
                    Nagad
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Amount (৳)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-primary-blue outline-none text-sm font-bold text-slate-800 dark:text-white"
                    placeholder="Min ৳100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Account Number</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-primary-blue outline-none text-sm font-bold text-slate-800 dark:text-white"
                    placeholder="017XXXXXXXX"
                  />
                </div>

                <button 
                  onClick={handleWithdraw}
                  disabled={processing}
                  className="w-full bg-slate-900 dark:bg-primary-blue text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
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
