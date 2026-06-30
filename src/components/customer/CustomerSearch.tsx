import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Search as SearchIcon, Filter, ArrowLeft, Star, MapPin, Map as MapIcon, List as ListIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProviderProfile, ShopProfile } from '../../types';
import { formatCurrency, getInitials, calculateDistance } from '../../lib/utils';
import { LiveMap } from './LiveMap';
import { ShopCard } from './ShopCard';
import { useAuth } from '../../contexts/AuthContext';

export const CustomerSearch: React.FC = () => {
  const { t } = useLanguage();
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [workers, setWorkers] = useState<ProviderProfile[]>([]);
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<ProviderProfile[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchType, setSearchType] = useState<'workers' | 'shops'>('workers');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Workers
        const q = query(
          collection(db, 'providers'),
          where('kycStatus', '==', 'verified')
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as ProviderProfile))
          .filter(w => w.isBlocked === false);
        setWorkers(data);
        setFilteredWorkers(data);

        // Fetch Shops
        const shopSnap = await getDocs(collection(db, 'shops'));
        const shopData = shopSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopProfile));
        setShops(shopData);
        setFilteredShops(shopData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Filter Workers
    let workerResults = (workers || []).filter(w => 
      (w.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (w.skill || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (w.providerType || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    if (activeFilter === 'online') {
      workerResults = workerResults.filter(w => w.isOnline);
    } else if (activeFilter === 'top_rated') {
      workerResults = [...workerResults].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (activeFilter === 'price_low') {
      workerResults = [...workerResults].sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    }

    // Radius filter
    if (profile?.location?.lat && profile?.location?.lng) {
      workerResults = workerResults.filter(w => {
        if (!w.location?.lat || !w.location?.lng) return false;
        const dist = calculateDistance(profile.location.lat, profile.location.lng, w.location.lat, w.location.lng);
        return dist <= 5;
      });
    }
    setFilteredWorkers(workerResults);

    // Filter Shops
    let shopResults = (shops || []).filter(s => 
      (s.shopName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (s.shopCategory || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );
    if (activeFilter === 'top_rated') {
      shopResults = [...shopResults].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // Radius filter
    if (profile?.location?.lat && profile?.location?.lng) {
      shopResults = shopResults.filter(s => {
        if (!s.location?.lat || !s.location?.lng) return false;
        const dist = calculateDistance(profile.location.lat, profile.location.lng, s.location.lat, s.location.lng);
        return dist <= 5;
      });
    }
    setFilteredShops(shopResults);
  }, [searchTerm, activeFilter, workers, shops]);

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate dark:bg-slate-950 transition-colors">
      {/* Search Header */}
      <div className="sticky top-0 z-30 bg-brand-slate dark:bg-brand-dark border-b border-slate-100 dark:border-slate-800 p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 dark:hover:bg-brand-surface rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-gray-teal" />
          </button>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-teal w-4 h-4" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-brand-surface border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-blue outline-none text-sm font-medium dark:text-cream"
              placeholder="Search for workers or services..."
              autoFocus
            />
          </div>
          <button className="p-2 bg-primary-blue/10 text-primary-blue rounded-xl">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex bg-slate-100 dark:bg-brand-surface p-1 rounded-full mr-2">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-brand-slate dark:bg-slate-700 text-cream dark:text-cream shadow-sm' : 'text-gray-teal dark:text-gray-teal'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-full transition-all ${viewMode === 'map' ? 'bg-brand-slate dark:bg-slate-700 text-cream dark:text-cream shadow-sm' : 'text-gray-teal dark:text-gray-teal'}`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-slate-100 dark:bg-brand-surface p-1 rounded-full mr-2">
            <button 
              onClick={() => setSearchType('workers')}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${searchType === 'workers' ? 'bg-primary-blue text-cream shadow-sm' : 'text-gray-teal dark:text-gray-teal'}`}
            >
              Workers
            </button>
            <button 
              onClick={() => setSearchType('shops')}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${searchType === 'shops' ? 'bg-action-orange text-cream shadow-sm' : 'text-gray-teal dark:text-gray-teal'}`}
            >
              Shops
            </button>
          </div>

          {[
            { id: 'all', label: 'All' },
            { id: 'online', label: 'Online' },
            { id: 'top_rated', label: 'Top Rated' },
            { id: 'price_low', label: 'Price: Low to High' },
          ].map((f) => (
            <button 
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeFilter === f.id ? 'bg-primary-blue text-cream shadow-md shadow-primary-blue/20 dark:shadow-none' : 'bg-slate-50 dark:bg-brand-surface text-gray-teal dark:text-gray-teal border border-slate-100 dark:border-slate-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-4 py-6">
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {loading ? (
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4 p-4 bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-3xl animate-pulse">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-brand-surface rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 dark:bg-brand-surface rounded-full w-1/2" />
                        <div className="h-3 bg-slate-100 dark:bg-brand-surface rounded-full w-1/3" />
                        <div className="h-3 bg-slate-100 dark:bg-brand-surface rounded-full w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchType === 'workers' ? (
                filteredWorkers.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <div className="text-6xl">🔍</div>
                    <h3 className="text-lg font-bold text-cream dark:text-cream">No workers found</h3>
                    <p className="text-gray-teal dark:text-gray-teal text-sm">Try searching for something else</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredWorkers.map((worker) => (
                      <motion.div 
                        key={worker.uid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/worker/${worker.uid}`)}
                        className="flex items-center gap-4 p-4 bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-primary-blue/30 dark:hover:border-primary-blue/30 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-primary-blue/10 dark:bg-primary-blue/20 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
                            {worker.photoURL ? (
                              <img 
                                src={worker.photoURL} 
                                className="w-full h-full object-cover" 
                                alt={worker.name} 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-primary-blue dark:text-primary-blue font-bold text-xl">{getInitials(worker.name)}</span>
                            )}
                          </div>
                          {worker.isOnline && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-blue border-4 border-white dark:border-brand-dark rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-cream dark:text-cream group-hover:text-primary-blue dark:group-hover:text-primary-blue transition-colors truncate">{worker.name || 'Anonymous Worker'}</h3>
                          <p className="text-gray-teal dark:text-gray-teal text-[10px] font-bold uppercase tracking-wider mb-1">{worker.skill || worker.providerType || 'Service Provider'}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-action-orange text-action-orange" />
                              <span className="text-xs font-bold text-slate-600 dark:text-cream">{(worker.rating || 0).toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-teal dark:text-gray-teal">
                              <MapPin className="w-3 h-3" />
                              <span className="text-[10px] font-medium">
                                {profile?.location && worker.location 
                                  ? `${calculateDistance(profile.location.lat, profile.location.lng, worker.location.lat, worker.location.lng).toFixed(1)} km`
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-primary-blue dark:text-primary-blue font-black text-lg">{formatCurrency(worker.hourlyRate || 0)}</div>
                          <div className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-tighter">per hour</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              ) : (
                filteredShops.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <div className="text-6xl">🏪</div>
                    <h3 className="text-lg font-bold text-cream dark:text-cream">No shops found</h3>
                    <p className="text-gray-teal dark:text-gray-teal text-sm">Try searching for something else</p>
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
                )
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="map"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-[calc(100vh-240px)]"
            >
              <LiveMap height="100%" filterType={searchType} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
