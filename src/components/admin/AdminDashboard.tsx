import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, limit, orderBy, getDocs, addDoc, serverTimestamp, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Bell,
  Gift,
  Store,
  Megaphone,
  X,
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalReferrals: 0,
    pendingKYC: 0,
    pendingShopKYC: 0,
    pendingWithdrawals: 0,
    pendingDeposits: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const fetchCount = async (coll: string, q?: any) => {
          try {
            return await getCountFromServer(q || collection(db, coll));
          } catch (e) {
            console.warn(`Count failed for ${coll}:`, e);
            return { data: () => ({ count: 0 }) } as any;
          }
        };

        const fetchData = async (coll: string, q: any) => {
          try {
            return await getDocs(q);
          } catch (e) {
            console.warn(`Fetch failed for ${coll}:`, e);
            return { docs: [] } as any;
          }
        };

        const [
          usersCount,
          providersCount,
          pendingKYCCount,
          withdrawalsCount,
          pendingWithdrawalsCount,
          pendingDepositsCount,
          bookingsCount,
          recentBookingsSnap,
          referralsCountUsers,
          referralsCountProviders,
          referralsCountShops,
          pendingShopKYCCount
        ] = await Promise.all([
          fetchCount('users'),
          fetchCount('providers'),
          fetchCount('providers', query(collection(db, 'providers'), where('kycStatus', '==', 'pending'))),
          fetchCount('withdrawals'),
          fetchCount('withdrawals', query(collection(db, 'withdrawals'), where('status', '==', 'pending'))),
          fetchCount('transactions', query(collection(db, 'transactions'), where('status', '==', 'pending'), where('type', '==', 'credit'))),
          fetchCount('bookings'),
          fetchData('bookings', query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(5))),
          fetchCount('users', query(collection(db, 'users'), where('referredBy', '!=', null))),
          fetchCount('providers', query(collection(db, 'providers'), where('referredBy', '!=', null))),
          fetchCount('shops', query(collection(db, 'shops'), where('referredBy', '!=', null))),
          fetchCount('shops', query(collection(db, 'shops'), where('kycStatus', '==', 'pending')))
        ]);

        const revenueSnap = await fetchData('bookings', query(collection(db, 'bookings'), where('status', '==', 'completed'), limit(100)));
        const totalRevenue = revenueSnap.docs.reduce((acc: any, doc: any) => acc + (doc.data().commission || 0), 0);

        setStats({
          totalUsers: usersCount.data().count,
          totalProviders: providersCount.data().count,
          totalBookings: bookingsCount.data().count,
          totalRevenue,
          totalReferrals: (referralsCountUsers.data().count || 0) + (referralsCountProviders.data().count || 0) + (referralsCountShops.data().count || 0),
          pendingKYC: pendingKYCCount.data().count,
          pendingShopKYC: pendingShopKYCCount.data().count,
          pendingWithdrawals: pendingWithdrawalsCount.data().count,
          pendingDeposits: pendingDepositsCount.data().count
        });

        setRecentActivity(recentBookingsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching admin stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastType, setBroadcastType] = useState('promo');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      toast.error('You must be logged in to broadcast.');
      return;
    }
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error('Please enter both title and message.');
      return;
    }

    setIsBroadcasting(true);
    try {
      // 1. Create a record inside `/broadcast_alerts` as requested
      const broadcastData = {
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        type: broadcastType,
        createdAt: serverTimestamp(),
        senderId: user.uid
      };
      await addDoc(collection(db, 'broadcast_alerts'), broadcastData);

      // 2. Query both `/users` & `/providers` collections to find any/all active tokens
      const [usersSnap, providersSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'providers'))
      ]);

      const recipients: string[] = [];
      usersSnap.forEach(doc => {
        if (doc.id) recipients.push(doc.id);
      });
      providersSnap.forEach(doc => {
        if (doc.id) recipients.push(doc.id);
      });

      const uniqueRecipients = Array.from(new Set(recipients));

      // 3. Simultaneously transmit identical unread notifications to trigger live UseFCM background/foreground push actions
      const batchPromises = uniqueRecipients.map(recipientId => {
        return addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          type: 'broadcast',
          read: false,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(batchPromises);

      toast.success(`Broadcast signal transmitted successfully to ${uniqueRecipients.length} targets!`);
      setIsBroadcastModalOpen(false);
      setBroadcastTitle('');
      setBroadcastBody('');
    } catch (err: any) {
      console.error('Failed to send broadcast:', err);
      toast.error(err.message || 'Failed to transmit broadcast signal.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary-blue bg-primary-blue/10', path: '/admin/users' },
    { label: 'Active Providers', value: stats.totalProviders, icon: ShieldCheck, color: 'text-primary-blue bg-primary-blue/10', path: '/admin/providers' },
    { label: 'Platform Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'text-action-orange bg-action-orange/10', path: '/admin/transactions' },
    { label: 'Total Referrals', value: stats.totalReferrals, icon: Gift, color: 'text-emerald-500 bg-emerald-500/10', path: '/admin/settings' },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Title Section */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">Control Panel</h2>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Administrative Control Panel</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsBroadcastModalOpen(true)}
          className="glass-card flex items-center gap-2 px-6 py-3 bg-white/50 dark:bg-slate-800/50 text-brand-amber hover:text-white hover:bg-brand-amber rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-glass"
        >
          <Megaphone className="w-3.5 h-3.5" />
          Send Broadcast
        </motion.button>
      </div>

      {/* Hero Stats Matrix */}
      <div className="grid grid-cols-2 gap-5">
        {cards.map((card, index) => (
          <motion.button 
            key={card.label} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(card.path)}
            className="glass-card p-6 bg-white dark:bg-slate-900 border-none shadow-xl space-y-6 text-left group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-blue/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary-blue/10 transition-colors" />
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner ${card.color}`}>
              <card.icon className="w-7 h-7" />
            </div>
            
            <div className="space-y-1 relative z-10">
              <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter group-hover:text-primary-blue transition-colors">
                {card.value}
              </div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {card.label}
              </div>
            </div>
            
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
               <ArrowUpRight className="w-5 h-5 text-primary-blue" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Critical Action Center */}
      <div className="grid gap-4">
        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-[10px] px-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Critical Tasks Queue
        </h3>
        
        <div className="grid gap-3">
          {stats.pendingKYC > 0 && (
            <motion.div 
              whileHover={{ x: 5 }}
              className="glass-card bg-gradient-to-r from-action-orange/10 to-transparent border-l-4 border-l-action-orange p-6 flex items-center gap-5 shadow-glass"
            >
              <div className="w-14 h-14 bg-action-orange/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <ShieldCheck className="text-action-orange w-8 h-8" />
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{stats.pendingKYC} Professional KYC</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Verification Pending</p>
              </div>
              <button 
                onClick={() => navigate('/admin/providers')}
                className="bg-white dark:bg-slate-800 text-action-orange px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all border border-action-orange/10"
              >
                Review
              </button>
            </motion.div>
          )}

          {stats.pendingShopKYC > 0 && (
            <motion.div 
              whileHover={{ x: 5 }}
              className="glass-card bg-gradient-to-r from-primary-blue/10 to-transparent border-l-4 border-l-primary-blue p-6 flex items-center gap-5 shadow-glass"
            >
              <div className="w-14 h-14 bg-primary-blue/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <Store className="text-primary-blue w-8 h-8" />
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{stats.pendingShopKYC} Merchant KYC</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trade License Verification</p>
              </div>
              <button 
                onClick={() => navigate('/admin/shops')}
                className="bg-white dark:bg-slate-800 text-primary-blue px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all border border-primary-blue/10"
              >
                Review
              </button>
            </motion.div>
          )}

          {stats.pendingWithdrawals > 0 && (
            <motion.div 
              whileHover={{ x: 5 }}
              className="glass-card bg-gradient-to-r from-emerald-500/10 to-transparent border-l-4 border-l-emerald-500 p-6 flex items-center gap-5 shadow-glass"
            >
              <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <TrendingUp className="text-emerald-500 w-8 h-8" />
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{stats.pendingWithdrawals} Payout Logs</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Awaiting Capital Disbursement</p>
              </div>
              <button 
                onClick={() => navigate('/admin/withdrawals')}
                className="bg-white dark:bg-slate-800 text-emerald-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all border border-emerald-500/10"
              >
                Disburse
              </button>
            </motion.div>
          )}

          {stats.pendingDeposits > 0 && (
            <motion.div 
              whileHover={{ x: 5 }}
              className="glass-card bg-gradient-to-r from-indigo-500/10 to-transparent border-l-4 border-l-indigo-500 p-6 flex items-center gap-5 shadow-glass"
            >
              <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <AlertCircle className="text-indigo-500 w-8 h-8" />
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{stats.pendingDeposits} Deposit Slips</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Manual Payment Verification</p>
              </div>
              <button 
                onClick={() => navigate('/admin/transactions')}
                className="bg-white dark:bg-slate-800 text-indigo-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all border border-indigo-500/10"
              >
                Verify
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Activity Feed Ledger */}
      <div className="space-y-5 pb-20">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-[10px]">Recent Activity</h3>
          <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            LIVE FEED
          </div>
        </div>
        
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="glass-card p-16 text-center space-y-4">
              <div className="text-5xl animate-bounce">📡</div>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">No Recent Activity</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <motion.div 
                key={activity.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="glass-card p-5 flex items-center gap-5 hover:bg-white dark:hover:bg-slate-900 transition-all border-none relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-800" />
                <div className="w-12 h-12 rounded-[18px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                  <Clock className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight leading-snug">
                    New <span className="text-primary-blue">{activity.service}</span> booking detected for <span className="text-primary-blue">{activity.customerName}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {activity.createdAt?.toDate?.() ? activity.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'System Latency'} • {activity.status?.toUpperCase() || 'UNKNOWN'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-sm font-black text-slate-800 dark:text-white tracking-tighter">
                      {formatCurrency(activity.totalAmount || activity.markupPrice)}
                   </div>
                   <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter">Entry Code: {activity.id.slice(0, 4)}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Global Broadcast Modal */}
      <AnimatePresence>
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl p-6 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-amber/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-amber/10 flex items-center justify-center text-brand-amber">
                    <Megaphone className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tighter uppercase text-slate-100">Global Broadcast Signal</h3>
                    <p className="text-[9px] font-black tracking-widest text-brand-amber uppercase">Transmit Campaign to All Devices</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Broadcast Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'promo', label: '📢 Promo Alert' },
                      { id: 'system', label: '⚙️ Operational' },
                      { id: 'festive', label: '🎉 Holiday Greeting' },
                      { id: 'flash', label: '⚡ Flash Offer' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setBroadcastType(type.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold text-left border transition-all ${
                          broadcastType === type.id
                            ? 'bg-brand-amber/20 border-brand-amber text-brand-amber'
                            : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Campaign Title</label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Enter short engaging headline..."
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-amber/50 focus:border-brand-amber transition-colors shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Custom message body</label>
                  <textarea
                    required
                    rows={4}
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    placeholder="Type promotional launch details, system updates, or holiday announcements..."
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-amber/50 focus:border-brand-amber transition-colors resize-none shadow-inner"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBroadcastModalOpen(false)}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBroadcasting}
                    className="flex-1 py-4 bg-brand-amber hover:bg-amber-500 disabled:bg-amber-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-amber/10 active:scale-[0.98]"
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Transmitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Transmit Broadcast
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
