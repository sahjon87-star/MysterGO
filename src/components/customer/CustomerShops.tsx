import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShopProfile } from '../../types';
import { Search, Store, MapPin, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { ShopCard } from './ShopCard';

export const CustomerShops: React.FC = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Shops', icon: '🏪' },
    { id: 'construction_material', label: 'Construction', icon: '🏗️' },
    { id: 'electrical_shops', label: 'Electrical', icon: '⚡' },
    { id: 'plumbing_shops', label: 'Plumbing', icon: '🚰' },
    { id: 'paint_shops', label: 'Paint', icon: '🎨' },
    { id: 'hardware_shops', label: 'Hardware', icon: '🛠️' },
  ];

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'shops'));
        const data = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopProfile));
        setShops(data);
        setFilteredShops(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, []);

  useEffect(() => {
    let results = (shops || []).filter(s => 
      (s.shopName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (s.shopAddress || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    if (activeCategory !== 'all') {
      results = results.filter(s => s.shopCategory === activeCategory);
    }

    setFilteredShops(results);
  }, [searchTerm, activeCategory, shops]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-6 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white leading-tight">Nearby Hardware<br />& Material Shops</h2>
            <p className="text-slate-400 text-sm">Get materials delivered to your site</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-black/20 dark:shadow-none outline-none text-slate-800 dark:text-white font-medium border border-transparent dark:border-slate-700 focus:border-blue-500 transition-all"
              placeholder="Search for shops..."
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 whitespace-nowrap transition-all ${activeCategory === cat.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}
          >
            <span className="text-sm">{cat.icon}</span>
            <span className="text-xs font-bold uppercase tracking-wider">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl opacity-20">🏪</div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">No shops found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Try a different category or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredShops.map((shop) => (
              <ShopCard 
                key={shop.uid} 
                shop={shop} 
                onClick={() => navigate(`/shop/${shop.uid}`)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
