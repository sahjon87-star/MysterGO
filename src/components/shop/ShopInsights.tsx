import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  BarChart2, 
  ChevronLeft, 
  ChevronRight,
  PieChart,
  BarChart,
  Clock,
  Target,
  Zap,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const ShopInsights: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeRange, setActiveRange] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchData = async () => {
      try {
        const ordersQ = query(
          collection(db, 'orders'),
          where('shopId', '==', profile.uid),
          where('status', '==', 'delivered')
        );
        const ordersSnap = await getDocs(ordersQ);
        setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));

        const productsQ = query(
          collection(db, 'products'),
          where('shopId', '==', profile.uid)
        );
        const productsSnap = await getDocs(productsQ);
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'shop_insights');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.uid]);

  const stats = useMemo(() => {
    const totalSales = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0;
    
    // Most popular product logic
    const productSales: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });

    const bestSeller = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalSales,
      avgOrderValue,
      orderCount: orders.length,
      bestSeller,
      inventoryCount: products.length,
      lowStockCount: products.filter(p => p.stock < 5).length
    };
  }, [orders, products]);

  const metricCards = [
    { label: 'Inventory', value: stats.inventoryCount, sub: 'Items listed', icon: Package, color: 'text-primary-blue bg-primary-blue/10' },
    { label: 'Best Seller', value: stats.bestSeller, sub: 'Most ordered', icon: Zap, color: 'text-action-orange bg-action-orange/10' },
    { label: 'Avg Order', value: formatCurrency(stats.avgOrderValue), sub: 'Per transaction', icon: ShoppingBag, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Low Stock', value: stats.lowStockCount, sub: 'Needs refill', icon: AlertCircle, color: 'text-red-500 bg-red-500/10', critical: stats.lowStockCount > 0 }
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="px-4 pt-6 space-y-1">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Business Intelligence</h2>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 leading-none">Global Shop Performance Analysis</p>
      </div>

      {/* Main Revenue Card */}
      <div className="px-4">
        <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 p-8 opacity-10">
            <BarChart className="w-32 h-32" />
          </div>
          
          <div className="relative z-10 space-y-8">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Sales Revenue</p>
                   <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(stats.totalSales)}</h3>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                   <TrendingUp className="w-6 h-6 text-primary-blue" />
                </div>
             </div>

             <div className="h-32 flex items-end justify-between gap-3 px-2">
                {[60, 45, 90, 65, 80, 55, 75].map((h, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        className={`w-full rounded-t-xl relative group ${i === 2 ? 'bg-primary-blue shadow-lg shadow-primary-blue/30' : 'bg-white/10'}`}
                      >
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all text-[8px] font-bold">
                           {h}%
                         </div>
                      </motion.div>
                   </div>
                ))}
             </div>
             <p className="text-[9px] font-black text-slate-500 text-center uppercase tracking-widest">Week-over-week growth performance</p>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {metricCards.map((card, i) => (
          <div 
            key={i} 
            className={`bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-50 dark:border-slate-800 shadow-sm space-y-3 relative group transition-all hover:border-primary-blue/20 ${card.critical ? 'ring-2 ring-red-500' : ''}`}
          >
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${card.color}`}>
                <card.icon className="w-5 h-5" />
             </div>
             <div className="space-y-0.5">
                <p className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">{card.value}</p>
                <div className="flex items-center gap-1">
                   <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{card.label}</p>
                   <span className="w-1 h-1 bg-slate-200 rounded-full" />
                   <p className="text-[8px] font-medium text-slate-400 group-hover:text-primary-blue transition-colors">{card.sub}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="px-4 space-y-4 pt-4">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Efficiency Tracking</h3>
         <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">
            <div className="p-6 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Order Fulfillment</h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Time to process order</p>
                  </div>
               </div>
               <div className="text-sm font-black text-slate-800 dark:text-white">12m <span className="text-[9px] text-green-500 font-black">FAST</span></div>
            </div>

            <div className="p-6 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-blue/10 text-primary-blue rounded-xl flex items-center justify-center">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Return Rate</h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Items returned by users</p>
                  </div>
               </div>
               <div className="text-sm font-black text-slate-800 dark:text-white">0.4% <span className="text-[9px] text-primary-blue font-black">EXCELLENT</span></div>
            </div>

            <div className="p-6 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-action-orange/10 text-action-orange rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Avg Delivery Time</h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Courier delivery estimate</p>
                  </div>
               </div>
               <div className="text-sm font-black text-slate-800 dark:text-white">45m <span className="text-[9px] text-action-orange font-black">GOOD</span></div>
            </div>
         </div>
      </div>

       {/* Sales Target Placeholder */}
       <div className="px-4 pt-6">
          <div className="bg-slate-100 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-8 space-y-6">
             <div className="flex justify-between items-center">
                <div className="space-y-1">
                   <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Monthly Sales Goal</h4>
                   <p className="text-[10px] font-medium text-slate-500">Reach target to unlock Premium shop badge</p>
                </div>
                <div className="text-right">
                   <div className="text-sm font-black text-primary-blue leading-none">62%</div>
                </div>
             </div>
             <div className="h-3 bg-white dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-slate-700 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '62%' }}
                  className="h-full bg-gradient-to-r from-primary-blue to-purple-500 shadow-lg shadow-primary-blue/30"
                />
             </div>
             <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                <span>৳0 Sold</span>
                <span>৳10k Target</span>
             </div>
          </div>
       </div>
    </div>
  );
};

const AlertCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
