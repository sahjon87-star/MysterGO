import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Package, 
  Loader2, 
  Filter,
  Search,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const ShopOrders: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('pending');

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'orders'),
      where('shopId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      // Manual sorting due to multiple wheres and complexity
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const filteredOrders = orders.filter(o => activeTab === 'all' ? true : o.status === activeTab);

  const tabs = [
    { id: 'pending', label: 'Incoming' },
    { id: 'processing', label: 'Processing' },
    { id: 'shipped', label: 'Out for Delivery' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'all', label: 'History' },
  ] as const;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="px-4 pt-6 space-y-1">
        <div className="flex items-center gap-2">
           <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Orders</h2>
        </div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">Manage customer fulfillment</p>
      </div>

      {/* Tabs */}
      <div className="px-4 sticky top-16 z-30 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md py-2 flex gap-2 overflow-x-auto scrollbar-hide no-scrollbar pr-10">
        {tabs.map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary-blue text-white shadow-lg shadow-primary-blue/20' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="px-4 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
             <div key={i} className="h-36 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 animate-pulse" />
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-24 space-y-4 col-span-full">
             <div className="text-6xl opacity-10">🛍️</div>
             <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">No {activeTab} Orders</h3>
             <p className="text-slate-500 dark:text-slate-500 text-xs font-medium max-w-[200px] mx-auto leading-relaxed">Incoming orders will appear here for you to fulfill.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <motion.div 
              key={order.id}
              layoutId={order.id}
              onClick={() => navigate(`/merchant/order/${order.id}`)}
              className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-6 relative overflow-hidden group hover:border-primary-blue/30 transition-all cursor-pointer"
            >
               <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-5">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-primary-blue/10 rounded-2xl flex items-center justify-center text-primary-blue font-black text-lg border border-primary-blue/20 shadow-inner">
                        {order.totalItems}
                     </div>
                     <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white transition-colors group-hover:text-primary-blue uppercase tracking-tight">#{order.id?.slice(-8).toUpperCase()}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{order.customerName}</p>
                     </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    order.status === 'pending' ? 'bg-action-orange/10 text-action-orange' :
                    order.status === 'processing' ? 'bg-primary-blue/10 text-primary-blue' :
                    order.status === 'shipped' ? 'bg-purple-500/10 text-purple-500' :
                    order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {order.status}
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Deliver To</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed truncate pr-10">{order.customerAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4 text-slate-400">
                        <div className="flex items-center gap-1.5">
                           <Clock className="w-3.5 h-3.5" />
                           <span className="text-[10px] font-black uppercase tracking-wider">{order.time || 'Today'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <Truck className="w-3.5 h-3.5" />
                           <span className="text-[10px] font-black uppercase tracking-wider">{order.deliveryMethod || 'Standard'}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatCurrency(order.totalAmount)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Amount</div>
                     </div>
                  </div>
               </div>

               {order.status === 'pending' && (
                 <div className="bg-primary-blue/5 dark:bg-primary-blue/10 p-4 rounded-2xl border border-primary-blue/10 text-center">
                    <p className="text-[9px] font-black text-primary-blue uppercase tracking-[0.2em] animate-pulse">New Order Notification • Click to process</p>
                 </div>
               )}
            </motion.div>
          ))
        )}
      </div>

      {orders.length > 0 && (
         <div className="px-4 text-center pb-10">
            <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em]">End of orders list</p>
         </div>
      )}
    </div>
  );
};
