import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { MapPin, Search, ChevronRight, Zap, Wrench, LayoutGrid, Gift, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { ProviderProfile, Category, ShopProfile } from '../../types';
import { WorkerCard } from './WorkerCard';
import { ShopCard } from './ShopCard';
import { calculateDistance } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { ReferralBanner } from '../shared/ReferralBanner';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

import { useLocation } from '../../contexts/LocationContext';

export const CustomerHome: React.FC = () => {
  const { t, lang } = useLanguage();
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { location: liveLocation, status: locationStatus } = useLocation();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<ProviderProfile[]>([]);
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');
  const [promoOffer, setPromoOffer] = useState({
    text: '৳100 off your first booking! Special offer for new users. Limited time only.',
    isActive: true,
    backgroundColor: 'var(--brand-blue)',
    textColor: '#FFFFFF'
  });
  const [settings, setSettings] = useState({
    applicationFeeRate: 5,
    paymentChargeRate: 2
  });
  const [banners, setBanners] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play interval for banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    // Listen for promo settings
    const unsubPromo = onSnapshot(doc(db, 'settings', 'promotions'), (snap) => {
      if (snap.exists()) {
        setPromoOffer(snap.data() as typeof promoOffer);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/promotions');
    });

    // Listen for global settings
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
      if (!snap.empty) {
        const mainSettings = snap.docs.find(d => d.data().applicationFeeRate !== undefined || d.data().commissionRate !== undefined);
        if (mainSettings) {
          const data = mainSettings.data();
          setSettings({
            applicationFeeRate: data.applicationFeeRate || data.commissionRate || 5,
            paymentChargeRate: data.paymentChargeRate || 2
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'settings');
    });

    // Listen for workers
    const qWorkers = query(
      collection(db, 'providers'),
      where('kycStatus', '==', 'verified'),
      where('isOnline', '==', true)
    );
    const unsubWorkers = onSnapshot(qWorkers, (snap) => {
      const workerData = snap.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as ProviderProfile))
        .filter(w => w.isBlocked === false);
      setWorkers(workerData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'providers');
    });

    // Listen for shops
    const unsubShops = onSnapshot(collection(db, 'shops'), (snap) => {
      const shopData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopProfile));
      setShops(shopData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'shops');
    });

    const fetchData = async () => {
      setLoading(true);
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        const catData = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(catData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const unsubBanners = onSnapshot(doc(db, 'settings', 'home_banners'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.urls)) {
          setBanners(data.urls.filter((url: any) => typeof url === 'string' && url.trim() !== ''));
        }
      }
    }, (error) => {
      console.warn("Home banners subscription error:", error);
    });

    return () => {
      unsubPromo();
      unsubSettings();
      unsubWorkers();
      unsubShops();
      unsubBanners();
    };
  }, []);

  const calculateMarkupPrice = (basePrice: number) => {
    const markup = basePrice * (1 + (settings.applicationFeeRate + settings.paymentChargeRate) / 100);
    return Math.round(markup);
  };

  const userLocation = liveLocation || profile?.location;

  const filteredWorkers = React.useMemo(() => {
    let workerData = activeCat === 'all' 
      ? workers 
      : workers.filter(w => w.category === activeCat);

    if (userLocation?.lat && userLocation?.lng) {
      workerData = workerData.filter(w => {
        if (!w.location?.lat || !w.location?.lng) return false;
        const dist = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          w.location.lat, 
          w.location.lng
        );
        return dist <= 10; // Increased to 10km
      });
    }
    return workerData.slice(0, 10);
  }, [workers, activeCat, userLocation?.lat, userLocation?.lng]);

  const filteredShops = React.useMemo(() => {
    let shopData = shops;

    if (userLocation?.lat && userLocation?.lng) {
      shopData = shopData.filter(s => {
        if (!s.location?.lat || !s.location?.lng) return false;
        const dist = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          s.location.lat, 
          s.location.lng
        );
        return dist <= 10; // Increased to 10km
      });
    }
    return shopData.slice(0, 10);
  }, [shops, userLocation?.lat, userLocation?.lng]);

  return (
    <div className="space-y-6 pb-20">
      {/* Scrolling Offer Banner */}
      {promoOffer.isActive && (
        <div 
          className="py-2 overflow-hidden whitespace-nowrap sticky top-0 z-50 shadow-md"
          style={{ backgroundColor: promoOffer.backgroundColor, color: promoOffer.textColor }}
        >
          <motion.div 
            animate={{ x: [0, -1000] }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="inline-block"
          >
              {promoOffer?.text && (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] px-4">
                  {promoOffer.text} &nbsp;&nbsp;&nbsp; {promoOffer.text} &nbsp;&nbsp;&nbsp; {promoOffer.text} &nbsp;&nbsp;&nbsp; {promoOffer.text}
                </span>
              )}
          </motion.div>
        </div>
      )}

      {/* Hero Service Matrix & Banner Integration */}
      {banners.length > 0 ? (
        // Premium Layout with Separate dedicated clear banner display
        <div className="space-y-6">
          {/* Header Area */}
          <div className="px-6 pt-4 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-2xl font-black text-cream leading-none tracking-tighter"
                >
                  Welcome to <span className="text-brand-blue dark:text-brand-amber text-nowrap">MistriGO</span>
                </motion.h2>
                <p className="text-[9px] font-extrabold text-gray-teal uppercase tracking-widest mt-1">
                  Your Premium Service Matrix
                </p>
              </div>

              {/* Location Badge */}
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 bg-brand-surface/85 dark:bg-brand-dark border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-2xl"
              >
                <MapPin className="w-4 h-4 text-brand-blue animate-pulse" />
                <span className="text-[9px] font-black tracking-wider text-gray-teal uppercase">
                  {locationStatus === 'granted' ? t('loc.tracking_active') : 'DHAKA'}
                </span>
              </motion.div>
            </div>

            {/* Input Search */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-teal w-5 h-5 z-10" />
              <input 
                type="text" 
                className="relative w-full pl-15 pr-6 py-4.5 rounded-[22px] border border-slate-100 dark:border-slate-850 outline-none bg-brand-slate dark:bg-brand-dark text-cream dark:text-cream font-black tracking-widest text-xs transition-all shadow-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue placeholder:text-gray-teal"
                placeholder="Query Service Database..."
                onFocus={() => navigate('/search')}
              />
            </motion.div>
          </div>

          {/* Premium Image Carousel Banner - 100% visible, clean, no clashing texts */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-6"
          >
            <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] rounded-[32px] overflow-hidden shadow-lg bg-brand-surface dark:bg-slate-950">
              {banners.map((url, idx) => (
                <motion.div
                  key={url + idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: idx === currentSlide ? 1 : 0 }}
                  transition={{ duration: 1.0, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <img 
                    src={url} 
                    alt={`Slide ${idx + 1}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              ))}

              {/* Subtle transparent shading under slides */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

              {/* Slider Dots */}
              {banners.length > 1 && (
                <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-brand-dark/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-brand-amber w-4' : 'bg-white/40 hover:bg-white/70'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        // Standard Fallback when NO banners exist
        <div className="bg-brand-amber px-4 pt-10 pb-16 relative overflow-hidden">
          {/* Design Accents */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -mr-64 -mt-64 blur-[120px] animate-pulse pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-blue/10 rounded-full -ml-32 -mb-32 blur-[100px] pointer-events-none" />
          
          <div className="relative z-20 space-y-8">
            <div className="flex items-center justify-between">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-brand-blue/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20"
              >
                <div className="relative">
                  <MapPin className={`w-5 h-5 ${locationStatus === 'granted' ? 'text-brand-blue' : 'text-cream/50'} animate-pulse`} />
                  <div className="absolute inset-0 bg-brand-blue/40 rounded-full blur-md animate-ping" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-brand-blue/60 uppercase tracking-widest leading-none mb-1">Service Location</span>
                  <span className="text-xs font-black text-brand-blue tracking-widest leading-none">
                    {locationStatus === 'granted' ? t('loc.tracking_active') : 'DHAKA, CENTRAL'}
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="space-y-2">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-black text-brand-blue leading-[0.9] tracking-tighter"
              >
                Welcome to<br /><span className="text-cream drop-shadow-sm">MistriGO</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-brand-blue/70 text-[10px] font-black uppercase tracking-[0.3em] pl-1"
              >
                Your Premium Service Matrix
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="relative group"
            >
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-blue/50 w-6 h-6 z-10" />
              <input 
                type="text" 
                className="relative w-full pl-16 pr-6 py-6 bg-brand-slate rounded-[28px] border-none outline-none text-brand-blue font-black tracking-widest text-sm transition-all shadow-2xl focus:ring-2 focus:ring-brand-blue"
                placeholder="Query Service Database..."
                onFocus={() => navigate('/search')}
              />
            </motion.div>
          </div>
        </div>
      )}


      {/* Category Matrix */}
      <section className="space-y-6 pt-2">
        <div className="px-6 flex items-center justify-between">
          <h3 className="font-black text-gray-teal uppercase tracking-widest text-[10px]">Matrix Quadrants</h3>
          <div className="w-1.5 h-1.5 bg-brand-amber rounded-full animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide">
          <motion.button 
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveCat('all')}
            className={`flex flex-col items-center gap-4 p-5 rounded-[32px] border transition-all min-w-[100px] ${activeCat === 'all' ? 'border-brand-amber bg-brand-amber text-brand-dark shadow-xl' : 'border-white/5 bg-brand-surface text-gray-teal'}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${activeCat === 'all' ? 'bg-brand-blue text-white' : 'bg-brand-slate text-gray-teal'}`}>
              <LayoutGrid className="w-7 h-7" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-none ${activeCat === 'all' ? 'text-brand-dark' : 'text-gray-teal'}`}>
              {t('cat.all')}
            </span>
          </motion.button>
          {categories.map((cat, index) => (
            <motion.button 
              key={cat.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCat(cat.id)}
              className={`flex flex-col items-center gap-4 p-5 rounded-[32px] border transition-all min-w-[100px] ${activeCat === cat.id ? 'border-brand-amber bg-brand-amber text-brand-dark shadow-xl' : 'border-white/5 bg-brand-surface text-gray-teal'}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${activeCat === cat.id ? 'bg-brand-blue text-white' : 'bg-brand-slate text-gray-teal'}`}>
                {cat.icon}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-none ${activeCat === cat.id ? 'text-brand-dark' : 'text-gray-teal'}`}>
                {lang === 'bn' ? cat.name_bn : cat.name_en}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Utility Terminals (Material Calculator) */}
      <section className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-gray-teal uppercase tracking-widest text-[10px]">Utility Terminals</h3>
          <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce" />
        </div>
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/calculator')}
          className="cursor-pointer rounded-[32px] bg-brand-surface border border-white/5 p-6 flex items-center justify-between relative overflow-hidden group shadow-lg"
        >
          {/* Subtle decorative grid/glow behind */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-amber/10 rounded-full blur-[40px] group-hover:bg-brand-amber/20 transition-all pointer-events-none" />
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-amber/10 text-brand-amber rounded-2xl flex items-center justify-center text-3xl shadow-inner">
              🧮
            </div>
            <div>
              <h4 className="font-black text-cream text-sm uppercase tracking-wider mb-1">
                {lang === 'bn' ? 'ম্যাটেরিয়াল ক্যালকুলেটর' : 'Material Calculator'}
              </h4>
              <p className="text-[9px] font-black tracking-widest text-gray-teal uppercase leading-none mt-1.5">
                {lang === 'bn' ? 'ইট, সিমেন্ট, বালু ও রডের নিখুঁত হিসাব' : 'Estimate Bricks, Cement, Sand, Rod'}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 bg-brand-slate text-brand-amber rounded-xl flex items-center justify-center font-black">
            →
          </div>
        </motion.div>
      </section>

      {/* Transmission Terminal (Offer) */}
      {promoOffer.isActive && (
        <section className="px-6">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="rounded-[40px] p-8 text-cream relative overflow-hidden shadow-2xl"
            style={{ backgroundColor: promoOffer.backgroundColor }}
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-brand-dark/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-[0.2em] border border-white/20">
                  Matrix Pulse
                </div>
              </div>
              <h3 className="text-3xl font-black leading-none tracking-tighter" style={{ color: promoOffer.textColor }}>
                {promoOffer.text?.split('!')[0] || 'Special Reward'}!
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80" style={{ color: promoOffer.textColor }}>
                {promoOffer.text?.split('!')[1] || 'Special offer for new users.'}
              </p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/search')}
                className="bg-brand-slate px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all"
                style={{ color: promoOffer.backgroundColor }}
              >
                Access Quadrant
              </motion.button>
            </div>
          </motion.div>
        </section>
      )}

      <div className="px-2">
        <ReferralBanner />
      </div>

      {/* Service Nodes Matrix */}
      <section className="space-y-6">
        <div className="px-6 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-black text-gray-teal uppercase tracking-widest text-[10px]">Verified Partners</h3>
            <p className="text-gray-teal/50 text-[8px] font-black uppercase tracking-widest">Nearby Service Providers</p>
          </div>
          <motion.button 
            whileHover={{ x: 5 }}
            onClick={() => navigate('/search')} 
            className="px-4 py-2 bg-brand-surface rounded-xl text-[9px] font-black text-brand-amber uppercase tracking-widest flex items-center gap-2 border border-white/5"
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        <div className="flex gap-5 overflow-x-auto px-6 pb-6 scrollbar-hide">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-48 h-60 glass-card animate-pulse shadow-sm" />
            ))
          ) : filteredWorkers.length === 0 ? (
            <div className="flex-shrink-0 w-full py-16 text-center space-y-4 glass-card border-none mx-2">
              <div className="text-5xl opacity-20">🦾</div>
              <p className="text-gray-teal dark:text-gray-teal font-black text-[10px] uppercase tracking-widest">No Service Providers Found</p>
            </div>
          ) : (
            filteredWorkers.map((worker, index) => (
              <motion.div
                key={worker.uid}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
                className="flex-shrink-0"
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
      </section>

      {/* Industrial Depot Matrix */}
      <section className="space-y-6 pb-10">
        <div className="px-6 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-black text-gray-teal uppercase tracking-widest text-[10px]">Supply Chain Depots</h3>
            <p className="text-gray-teal/50 text-[8px] font-black uppercase tracking-widest">Local Merchant Infrastructure</p>
          </div>
          <motion.button 
            whileHover={{ x: 5 }}
            onClick={() => navigate('/search')} 
            className="px-4 py-2 bg-brand-surface rounded-xl text-[9px] font-black text-brand-amber uppercase tracking-widest flex items-center gap-2 border border-white/5"
          >
            Access All <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        <div className="flex gap-5 overflow-x-auto px-6 pb-6 scrollbar-hide">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-52 h-52 glass-card animate-pulse shadow-sm" />
            ))
          ) : filteredShops.length === 0 ? (
            <div className="flex-shrink-0 w-full py-16 text-center space-y-4 glass-card border-none mx-2">
              <div className="text-5xl opacity-20">🏬</div>
              <p className="text-gray-teal dark:text-gray-teal font-black text-[10px] uppercase tracking-widest">No Active Depots Detected</p>
            </div>
          ) : (
            filteredShops.map((shop, index) => (
              <motion.div
                key={shop.uid}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
                className="flex-shrink-0"
              >
                <ShopCard 
                  shop={shop} 
                  onClick={() => navigate(`/shop/${shop.uid}`)} 
                />
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
