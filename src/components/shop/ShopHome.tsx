import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ShoppingBag, 
  Package, 
  Wallet, 
  TrendingUp, 
  Star, 
  Clock, 
  ChevronRight, 
  AlertCircle,
  Plus,
  Store,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { ReferralBanner } from '../shared/ReferralBanner';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const ShopHome: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    // Listen for current active orders
    const qOrders = query(
      collection(db, 'orders'),
      where('shopId', '==', profile.uid),
      where('status', 'in', ['pending', 'processing', 'shipped']),
      limit(5)
    );

    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setActiveOrders(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    // Listen for low stock products
    const qProducts = query(
      collection(db, 'products'),
      where('shopId', '==', profile.uid),
      where('stock', '<', 5),
      limit(5)
    );

    const unsubProducts = onSnapshot(qProducts, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setLowStockProducts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, [profile?.uid]);

  const stats = [
    { label: 'Rating', value: profile?.rating?.toFixed(1) || '0.0', icon: Star, color: 'text-action-orange bg-action-orange/10' },
    { label: 'Total Orders', value: profile?.totalOrders || '0', icon: ShoppingBag, color: 'text-primary-blue bg-primary-blue/10' },
    { label: 'Products', value: profile?.totalProducts || '0', icon: Package, color: 'text-green-500 bg-green-500/10' },
  ];

  return (
    <div className="space-y-10 pb-20 transition-all duration-500">
      {/* Executive Command Header */}
      <div className="bg-slate-950 px-6 pt-12 pb-24 relative overflow-hidden">
        {/* Dynamic Background Vectors */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-blue/20 rounded-full -mr-32 -mt-32 blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-[80px]" />
        
        <div className="relative z-10 flex items-center justify-between mb-10">
          <div className="space-y-1.5 px-2">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] leading-none">Commerce Overview</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{profile?.shopName || profile?.name}</h2>
              {profile?.isVerified && (
                <div className="group relative">
                  <ShieldCheck className="w-6 h-6 text-primary-light shadow-lg shadow-primary-blue/20" />
                </div>
              )}
            </div>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 rounded-[24px] bg-white/5 backdrop-blur-3xl border border-white/10 p-1 flex items-center justify-center overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/20"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} className="w-full h-full object-cover rounded-[20px]" alt="Shop" />
            ) : (
              <Store className="w-8 h-8 text-white opacity-40" />
            )}
          </motion.div>
        </div>

        {/* Tactical Metrics Matrix */}
        <div className="grid grid-cols-3 gap-5 relative z-10">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[28px] p-5 space-y-3 shadow-glass"
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-xl ${stat.color} shadow-inner`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-xl font-black text-white tracking-tighter leading-none">{stat.value}</div>
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Shutdown Alert Protocol */}
      {!profile?.isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-6 -mt-12 relative z-20"
        >
          <div className="bg-slate-900/80 backdrop-blur-3xl rounded-[40px] p-8 border border-white/5 shadow-2xl flex items-center justify-between group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-action-orange/10 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-action-orange/20 transition-all" />
            <div className="space-y-1 relative z-10">
              <h3 className="font-black text-xs uppercase tracking-[0.3em] text-action-orange flex items-center gap-2">
                <div className="w-2 h-2 bg-action-orange rounded-full animate-ping" />
                Station Dormant
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Commerce node is currently offline.</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/merchant/settings')}
              className="bg-action-orange text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] shadow-lg shadow-action-orange/20 relative z-10 transition-all hover:bg-white hover:text-action-orange"
            >
              Initialize Store
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Strategic Actions */}
      <div className="px-6">
        <ReferralBanner />
      </div>
      
      <section className="px-6 grid grid-cols-2 gap-5">
        <motion.button 
          whileHover={{ y: -5 }}
          onClick={() => navigate('/merchant/add-product')}
          className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-glass flex flex-col gap-5 text-left group transition-all"
        >
          <div className="w-14 h-14 bg-primary-blue/10 rounded-2xl flex items-center justify-center text-primary-blue group-hover:rotate-90 transition-transform duration-500">
            <Plus className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">Deploy SKU</h4>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Append Catalog</p>
          </div>
        </motion.button>
        <motion.button 
          whileHover={{ y: -5 }}
          onClick={() => navigate('/merchant/wallet')}
          className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-glass flex flex-col gap-5 text-left group transition-all"
        >
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">Capital Core</h4>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Bal: {formatCurrency(profile?.walletBalance || 0)}</p>
          </div>
        </motion.button>
      </section>

      {/* Operational Order Flow */}
      <section className="space-y-6">
        <div className="px-8 flex items-center justify-between">
          <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-[0.3em] text-[11px] flex items-center gap-3">
            <div className="w-6 h-[1px] bg-primary-blue" />
            Recent Protocols
          </h3>
          <motion.button 
            whileHover={{ x: 3 }}
            onClick={() => navigate('/merchant/orders')} 
            className="text-[9px] font-black text-primary-blue uppercase tracking-[0.2em] flex items-center gap-1.5 transition-all"
          >
            History <ChevronRight size={14} />
          </motion.button>
        </div>
        
        <div className="px-6 space-y-5">
          {loading ? (
             <div className="h-24 bg-slate-100 dark:bg-slate-900 rounded-[40px] animate-pulse" />
          ) : activeOrders.length === 0 ? (
            <div className="text-center py-20 bg-white/50 dark:bg-slate-900/30 backdrop-blur-xl rounded-[48px] border border-slate-100 dark:border-white/5 space-y-6 grayscale opacity-50">
              <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-inner">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <p className="text-slate-800 dark:text-white font-black text-sm uppercase tracking-widest">No Active Protocol</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <motion.div 
                  key={order.id}
                  layoutId={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => navigate(`/merchant/order/${order.id}`)}
                  className="bg-white dark:bg-slate-900 rounded-[40px] p-6 border border-slate-100 dark:border-white/5 shadow-glass flex items-center gap-5 hover:border-primary-blue/30 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-primary-light font-black text-xl border border-white/10 shadow-2xl relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-primary-blue/10 animate-pulse" />
                    {order.totalItems}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-900 dark:text-white group-hover:text-primary-blue transition-colors truncate uppercase tracking-tighter text-lg leading-none">{order.customerName}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.2em]">ID: #{order.id?.slice(-5)}</p>
                      <div className="w-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
                      <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${order.status === 'pending' ? 'text-action-orange animate-pulse' : 'text-primary-blue'}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <div className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{formatCurrency(order.totalAmount)}</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{order.time}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Critical Stock Matrix */}
      {lowStockProducts.length > 0 && (
        <section className="space-y-6">
          <div className="px-8 flex items-center justify-between">
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-[0.3em] text-[11px] flex items-center gap-3">
              <div className="w-6 h-[1px] bg-red-500" />
              Depletion Alert
            </h3>
            <span className="text-[8px] font-black text-white bg-red-500 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-red-500/20">{lowStockProducts.length} Conflict Zones</span>
          </div>
          
          <div className="px-6 flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar pr-10">
            {lowStockProducts.map((p) => (
              <motion.div 
                key={p.id}
                whileHover={{ y: -5 }}
                onClick={() => navigate('/merchant/inventory')}
                className="min-w-[220px] bg-red-50/20 dark:bg-red-500/5 backdrop-blur-md rounded-[32px] p-6 border border-red-100 dark:border-red-900/20 flex items-center gap-4 cursor-pointer transition-all shrink-0 shadow-glass"
              >
                 <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center border border-red-100 shrink-0 shadow-2xl">
                   <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                 </div>
                 <div className="min-w-0">
                    <h5 className="text-[9px] font-black text-slate-900 dark:text-slate-300 uppercase truncate tracking-[0.1em] leading-none mb-1.5">{p.name}</h5>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] leading-none">Units: {p.stock}</p>
                 </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Strategic Intelligence Matrix */}
      <section className="px-6">
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => navigate('/merchant/insights')}
          className="bg-slate-950 rounded-[56px] p-12 text-white relative overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] group active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 group-hover:scale-[1.6] transition-transform duration-1000">
            <TrendingUp className="w-32 h-32" />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter">Business Logic Yield</h3>
              <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400">Node Cycle: Weekly</div>
            </div>
            
            <div className="grid grid-cols-2 gap-12">
               <div className="space-y-3">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Matrix Revenue</p>
                 <div className="text-4xl font-black tracking-tighter text-white">{formatCurrency(profile?.walletBalance || 0)}</div>
               </div>
               <div className="space-y-3">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Signal Impressions</p>
                 <div className="text-4xl font-black tracking-tighter text-white">12.4k</div>
               </div>
            </div>

            <div className="flex items-center gap-3 text-primary-light font-black text-[10px] uppercase tracking-[0.4em] group-hover:gap-5 transition-all">
              Execute Intelligence Audit 
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
          
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-blue/10 rounded-full blur-[100px] -mr-32 -mb-32 group-hover:bg-primary-blue/20 transition-all" />
        </motion.div>
      </section>
    </div>
  );
};
