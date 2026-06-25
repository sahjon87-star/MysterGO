import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  Star, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  PieChart,
  BarChart,
  Calendar,
  Award,
  Zap,
  Target,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Booking, Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const ProviderInsights: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeRange, setActiveRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchData = async () => {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('providerId', '==', profile.uid),
          where('status', '==', 'completed')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(data);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'insights_data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.uid]);

  const stats = useMemo(() => {
    const totalEarnings = bookings.reduce((acc, curr) => acc + curr.providerEarning, 0);
    const avgEarning = bookings.length > 0 ? totalEarnings / bookings.length : 0;
    
    // Categorize by service to see most profitable
    const serviceProfit: Record<string, number> = {};
    bookings.forEach(b => {
      serviceProfit[b.service] = (serviceProfit[b.service] || 0) + b.providerEarning;
    });

    const bestService = Object.entries(serviceProfit).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalEarnings,
      avgEarning,
      completedJobs: bookings.length,
      bestService,
      acceptanceRate: 98, // Mocked for now
      cancellationRate: 2
    };
  }, [bookings]);

  const cards = [
    { label: 'Completion Rate', value: '96%', icon: PieChart, color: 'text-primary-blue bg-primary-blue/10' },
    { label: 'Avg Rating', value: profile?.rating?.toFixed(1) || '0.0', icon: Star, color: 'text-action-orange bg-action-orange/10' },
    { label: 'Best Service', value: stats.bestService, icon: Zap, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Work Hours', value: '142h', icon: Clock, color: 'text-slate-900 bg-slate-100 dark:bg-slate-800' }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="px-4 pt-6 space-y-1">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Insights</h2>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">Analyze your work performance</p>
      </div>

      {/* Main Earning Chart Placeholder */}
      <div className="px-4">
        <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 p-8 opacity-10">
            <BarChart className="w-32 h-32" />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
                 <h3 className="text-4xl font-black tracking-tight">{formatCurrency(stats.totalEarnings)}</h3>
               </div>
               <div className="flex gap-1">
                  {['W', 'M', 'Y'].map((range) => (
                    <button 
                      key={range}
                      onClick={() => setActiveRange(range === 'W' ? 'weekly' : range === 'M' ? 'monthly' : 'yearly')}
                      className={`w-8 h-8 rounded-full text-[9px] font-black uppercase flex items-center justify-center transition-all ${
                        (range === 'W' && activeRange === 'weekly') || (range === 'M' && activeRange === 'monthly') || (range === 'Y' && activeRange === 'yearly')
                        ? 'bg-primary-blue text-white' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
               </div>
            </div>

            <div className="h-40 flex items-end justify-between gap-2 px-2">
              {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="w-full bg-primary-blue/30 rounded-t-xl relative group"
                  >
                    <div className="absolute inset-0 bg-primary-blue opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" />
                  </motion.div>
                  <span className="text-[8px] font-black text-slate-500 tracking-tighter">Day {i+1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-50 dark:border-slate-800 shadow-sm space-y-3 hover:border-primary-blue/20 transition-all">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
             </div>
             <div className="space-y-0.5">
                <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-none">{card.value}</p>
                <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{card.label}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Performance List */}
      <div className="px-4 space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] px-4">Efficiency Metrics</h3>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">
           <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Acceptance Rate</p>
                    <p className="text-[9px] font-bold text-slate-400">Higher than 85% of peers</p>
                 </div>
              </div>
              <span className="text-sm font-black text-green-500">98%</span>
           </div>

           <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-action-orange/10 text-action-orange rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Cancellation Rate</p>
                    <p className="text-[9px] font-bold text-slate-400">Goal: Below 5%</p>
                 </div>
              </div>
              <span className="text-sm font-black text-action-orange">02%</span>
           </div>

           <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-primary-blue/10 text-primary-blue rounded-xl flex items-center justify-center">
                    <Award className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">Service Quality</p>
                    <p className="text-[9px] font-bold text-slate-400">Based on recent 50 ratings</p>
                 </div>
              </div>
              <span className="text-sm font-black text-primary-blue">Elite</span>
           </div>
        </div>
      </div>

      {/* Monthly Goal Placeholder */}
      <div className="px-4">
        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-8 space-y-4">
          <div className="flex items-center justify-between">
             <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Monthly Target</h4>
             <span className="text-[10px] font-bold text-slate-400">৳10,000 / ৳25,000</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: '40%' }}
               className="h-full bg-gradient-to-r from-primary-blue to-purple-500"
             />
          </div>
          <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">You're 40% towards your goal!</p>
        </div>
      </div>
    </div>
  );
};
