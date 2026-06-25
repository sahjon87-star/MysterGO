import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ProviderProfile, Category } from '../../types';
import { Search, MapPin, Filter, Star, ChevronLeft, LayoutGrid, X } from 'lucide-react';
import { WorkerCard } from './WorkerCard';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

export const SearchPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ applicationFeeRate: 5, paymentChargeRate: 2 });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          applicationFeeRate: data.applicationFeeRate || 5,
          paymentChargeRate: data.paymentChargeRate || 2
        });
      }
    }, (error) => {
      console.warn('SearchPage system_config settings listener error:', error);
    });
    return () => unsub();
  }, []);

  const calculateMarkupPrice = (basePrice: number) => {
    const markup = basePrice * (1 + (settings.applicationFeeRate + settings.paymentChargeRate) / 100);
    return Math.round(markup);
  };

  useEffect(() => {
    const fetchCats = async () => {
      const snap = await getDocs(collection(db, 'categories'));
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    };
    fetchCats();
  }, []);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'providers'), where('isVerified', '==', true));
        
        const snap = await getDocs(q);
        let data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ProviderProfile));
        
        if (activeCat !== 'all') {
          data = data.filter(w => w.category === activeCat);
        }
        
        if (searchTerm) {
          const lower = (searchTerm || '').toLowerCase();
          data = (data || []).filter(w => 
            (w.name || '').toLowerCase().includes(lower) || 
            (w.skill || '').toLowerCase().includes(lower)
          );
        }
        
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeCat]);

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-3xl border-b border-white/5 p-4 space-y-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-brand-surface border border-white/5 rounded-xl transition-all">
            <ChevronLeft size={24} className="text-white" />
          </button>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Search Deck</h1>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-teal group-focus-within:text-brand-amber transition-colors" size={20} />
          <input 
            autoFocus
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for service, worker name..."
            className="w-full bg-brand-surface border border-white/5 focus:border-brand-amber py-4 pl-12 pr-12 rounded-2xl outline-none text-sm font-bold text-white transition-all shadow-inner placeholder:text-gray-teal/50"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-teal hover:text-red-500"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Category Filters */}
        <div className="space-y-3">
          <h3 className="px-2 text-[10px] font-black text-gray-teal uppercase tracking-widest">Protocol Filters</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setActiveCat('all')}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-[32px] border-2 transition-all min-w-[90px]",
                activeCat === 'all' 
                  ? 'border-brand-amber bg-brand-amber/10 shadow-lg shadow-brand-amber/20' 
                  : 'border-white/5 bg-brand-surface shadow-sm'
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/5",
                activeCat === 'all' ? "bg-brand-amber text-brand-dark" : "bg-brand-dark text-gray-teal"
              )}>
                <LayoutGrid size={20} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                activeCat === 'all' ? "text-brand-amber" : "text-gray-teal"
              )}>{t('cat.all')}</span>
            </button>

            {categories.map((cat) => (
              <button 
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-[32px] border-2 transition-all min-w-[90px]",
                  activeCat === cat.id 
                    ? 'border-brand-amber bg-brand-amber/10 shadow-lg shadow-brand-amber/20' 
                    : 'border-white/5 bg-brand-surface shadow-sm'
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/5",
                  activeCat === cat.id ? "bg-brand-amber text-brand-dark" : "bg-brand-dark text-gray-teal"
                )}>
                  {cat.icon}
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest text-center leading-tight truncate w-full px-1",
                  activeCat === cat.id ? "text-brand-amber" : "text-gray-teal"
                )}>{lang === 'bn' ? cat.name_bn : cat.name_en}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-widest">Active Signals ({results.length})</h3>
            <button className="text-[9px] font-black text-brand-amber uppercase tracking-[0.2em] flex items-center gap-1.5 px-3 py-1 bg-brand-amber/5 rounded-full border border-brand-amber/10">
              Refine Logic <Filter size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-24">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[3/4] bg-brand-surface rounded-[32px] animate-pulse border border-white/5" />
              ))
            ) : results.length === 0 ? (
              <div className="col-span-2 py-20 flex flex-col items-center justify-center text-gray-teal/30">
                <Search size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.3em]">No signals detected</p>
              </div>
            ) : (
              results.map((worker, index) => (
                <motion.div
                  key={worker.uid}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: "easeOut" }}
                  className="w-full"
                >
                  <WorkerCard 
                    worker={worker} 
                    displayPrice={calculateMarkupPrice(worker.hourlyRate)}
                    onClick={() => navigate(`/worker/${worker.uid}`)} 
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
