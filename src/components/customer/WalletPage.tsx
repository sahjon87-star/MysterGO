import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Transaction } from '../../types';
import { 
  ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, 
  History, CreditCard, ChevronRight, Gift, Shield, 
  Banknote, TrendingUp, Sparkles
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export const WalletPage: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMoney, setAddingMoney] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  const [method, setMethod] = useState('bkash');
  const [trxId, setTrxId] = useState('');

  const handleAddMoney = async () => {
    if (!profile?.uid || !amount || !trxId) {
      toast.error('Please enter amount and TrxID');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      toast.error('Minimum recharge: ৳10');
      return;
    }

    setAddingMoney(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      let success = false;
      try {
        const response = await fetch('/api/wallet/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: profile.uid,
            amount: numAmount,
            method: method,
            trxId: trxId,
            name: profile.name || '',
            phone: profile.phone || '',
            collection: 'users'
          }),
        });

        const data = await response.json();
        if (response.ok) {
          success = true;
          toast.success(data.message || 'Funds injected to pool!');
        } else {
          console.warn("Server-side topup failed, trying client-side fallback. Error:", data.error);
        }
      } catch (apiErr) {
        console.warn("API call failed, trying client-side fallback:", apiErr);
      }

      if (!success) {
        // Direct Client-Side Pending Transaction
        await addDoc(collection(db, "transactions"), {
          userId: profile.uid,
          userName: profile.name || "",
          userPhone: profile.phone || "",
          userAddress: profile.address || "",
          amount: numAmount,
          type: "credit",
          description: `Wallet Top up (via ${method})`,
          status: "pending", // Status is pending, admin must approve
          method: method,
          trxId: trxId,
          userCollection: "users",
          createdAt: serverTimestamp()
        });

        toast.success("Topup request submitted. Pending admin approval.");
      }

      setAmount('');
      setTrxId('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Recharge protocol failed');
    } finally {
      setAddingMoney(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header Visual */}
      <div className="bg-brand-dark dark:bg-brand-dark p-8 pt-12 rounded-b-[48px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/20 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-action-orange/10 rounded-full -ml-24 -mb-24 blur-3xl" />
        
        <div className="flex items-center justify-between text-cream mb-10 relative z-10">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.3em]">Capital Node</h1>
          <button className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <Shield className="w-5 h-5 text-emerald-400" />
          </button>
        </div>

        <div className="space-y-2 text-center relative z-10 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-teal">Total Liquid Credits</p>
          <h2 className="text-5xl font-black text-cream tracking-tight">{formatCurrency(profile?.walletBalance || 0)}</h2>
          <div className="flex justify-center gap-2 pt-2">
            <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5">
              <TrendingUp size={12} />
              Verified Assets
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-6 relative z-10">
        {/* Quick Recharge */}
        <div className="bg-brand-slate dark:bg-brand-dark rounded-[40px] p-6 shadow-2xl shadow-black/5 border border-white dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-cream dark:text-cream uppercase tracking-tight">Top Up Wallet</h3>
            <CreditCard className="w-4 h-4 text-cream" />
          </div>

          <div className="space-y-4">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-slate-50 dark:bg-brand-surface/50 border border-transparent dark:border-slate-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold text-cream dark:text-cream transition-all"
            >
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
            </select>
            
            <input 
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="Enter Transaction ID (TrxID)"
              className="w-full bg-slate-50 dark:bg-brand-surface/50 border border-transparent dark:border-slate-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold text-cream dark:text-cream transition-all"
            />
          </div>

          <div className="relative group">
            <Banknote className="absolute left-6 top-1/2 -translate-y-1/2 text-primary-blue w-6 h-6 group-focus-within:scale-110 transition-transform" />
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount (৳)"
              className="w-full bg-slate-50 dark:bg-brand-surface/50 border border-transparent dark:border-slate-700 py-6 pl-16 pr-6 rounded-3xl outline-none focus:ring-2 focus:ring-primary-blue font-black text-xl text-cream dark:text-cream transition-all"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[100, 500, 1000, 2000].map(val => (
              <button 
                key={val}
                onClick={() => setAmount(val.toString())}
                className="py-3 bg-slate-50 dark:bg-brand-surface rounded-2xl text-[10px] font-black text-gray-teal hover:bg-primary-blue hover:text-cream transition-all active:scale-95"
              >
                ৳{val}
              </button>
            ))}
          </div>

          <button 
            disabled={addingMoney}
            onClick={handleAddMoney}
            className="w-full h-16 bg-primary-blue text-cream rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary-blue/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {addingMoney ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus size={20} />
                Confirm Recharge
              </>
            )}
          </button>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black text-cream dark:text-cream uppercase tracking-tight">Access Logs</h3>
            <button className="text-[9px] font-black text-primary-blue uppercase tracking-widest flex items-center gap-1">
              Filter <History size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-20 bg-brand-slate dark:bg-brand-dark rounded-3xl animate-pulse" />)
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-20 bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-dashed border-slate-300">
                <History size={32} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">No Log History</p>
              </div>
            ) : (
              transactions.map((tx, idx) => (
                <motion.div 
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-brand-slate dark:bg-brand-dark p-4 rounded-[28px] border border-slate-100 dark:border-slate-800 flex items-center gap-4 group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    tx.type === 'credit' ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                  )}>
                    {tx.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className="flex-1">
                    <h5 className="text-[10px] font-black text-cream dark:text-cream uppercase tracking-tight">{tx.description}</h5>
                    <p className="text-[9px] font-bold text-gray-teal uppercase tracking-widest mt-0.5">
                      {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'Processing...'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-black",
                      tx.type === 'credit' ? "text-emerald-500" : "text-red-500"
                    )}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[8px] font-black text-cream uppercase tracking-widest">Completed</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Bonus Section */}
        <div 
          onClick={() => navigate('/referral')}
          className="bg-gradient-to-br from-action-orange to-orange-600 rounded-[32px] p-6 text-cream relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
        >
          <Sparkles className="absolute right-0 top-0 w-32 h-32 text-cream/10 -mr-8 -mt-8 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
          <div className="space-y-4 relative z-10">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
              <Gift size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black uppercase tracking-tight">Expand the Mesh</h4>
              <p className="text-[11px] font-bold text-cream/80 uppercase tracking-widest leading-relaxed">Refer a worker or customer and unlock ৳100 credits for your next engagement.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
              Initiate Referral <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
