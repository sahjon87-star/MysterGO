import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, Store, Briefcase, Wrench, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { ProviderProfile, JobType, ShopProfile } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { notificationService } from '../../services/notificationService';

// Helper for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Category mapping for shops
const getShopCategoryForWorker = (workerCategory: string) => {
  const mapping: Record<string, string> = {
    'raj_mistri': 'construction_material',
    'electrician': 'electrical_shops',
    'plumber': 'plumbing_shops',
    'painter': 'paint_shops',
    'carpenter': 'hardware_shops',
  };
  return mapping[workerCategory] || 'general_hardware';
};

export const NewBookingPage: React.FC = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const [worker, setWorker] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState({
    applicationFeeRate: 5,
    paymentChargeRate: 2
  });

  // Form state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [hours, setHours] = useState(1);
  const [days, setDays] = useState(1);
  const [address, setAddress] = useState(profile?.address || '');
  const [description, setDescription] = useState('');
  const [jobType, setJobType] = useState<JobType>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'cash' | 'wallet'>('bkash');
  const [nearbyShops, setNearbyShops] = useState<ShopProfile[]>([]);

  useEffect(() => {
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
      console.warn('NewBookingPage settings listener error:', error);
    });

    const fetchWorker = async () => {
      if (!workerId) return;
      try {
        const snap = await getDoc(doc(db, 'providers', workerId));
        if (snap.exists()) {
          setWorker({ uid: snap.id, ...snap.data() } as ProviderProfile);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();

    return () => unsubSettings();
  }, [workerId]);

  useEffect(() => {
    const fetchNearbyShops = async () => {
      if (!worker || !profile?.location) return;
      try {
        const shopCat = getShopCategoryForWorker(worker.category);
        const q = query(collection(db, 'shops'), where('shopCategory', '==', shopCat));
        const snap = await getDocs(q);
        const shops = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ShopProfile));
        
        // Filter by 5km radius
        const filtered = (shops || []).filter(shop => {
          if (!shop.location?.lat || !shop.location?.lng) return false;
          if (!profile.location?.lat || !profile.location?.lng) return false;
          const dist = calculateDistance(
            profile.location.lat, profile.location.lng,
            shop.location.lat, shop.location.lng
          );
          return dist <= 5;
        });
        setNearbyShops(filtered);
      } catch (err) {
        console.error('Error fetching nearby shops:', err);
      }
    };
    fetchNearbyShops();
  }, [worker, profile]);

  const calculateMarkup = (basePrice: number) => {
    const applicationFee = Math.round(basePrice * (settings.applicationFeeRate / 100));
    const paymentCharges = Math.round(basePrice * (settings.paymentChargeRate / 100));
    const markupPrice = basePrice + applicationFee + paymentCharges;

    return {
      basePrice,
      applicationFee,
      paymentCharges,
      markupPrice
    };
  };

  const handleSubmit = async () => {
    if (!worker || !profile) return;
    if (!date || !address || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const basePrice = jobType === 'daily' 
      ? (worker.dailyRate || (worker.hourlyRate || 0) * 8) * days
      : jobType === 'contract'
        ? (worker.contractRate || 0)
        : (worker.hourlyRate || 0) * hours;

    const { markupPrice, applicationFee, paymentCharges } = calculateMarkup(basePrice);

    // Check wallet balance if payment method is wallet
    if (paymentMethod === 'wallet' && (profile.walletBalance || 0) < markupPrice) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setSubmitting(true);
    try {
      const bookingData: any = {
        customerId: profile.uid,
        customerName: profile.name,
        customerPhone: profile.phone,
        providerId: worker.uid,
        providerName: worker.name,
        providerCollection: 'providers', // Hardcoded as providers for now as this page currently only supports worker booking
        service: worker.skill || worker.providerType,
        description,
        address,
        date,
        time,
        hours: jobType === 'daily' ? days * 8 : hours,
        basePrice,
        markupPrice,
        applicationFee,
        paymentCharges,
        totalAmount: markupPrice,
        commission: applicationFee + paymentCharges,
        providerEarning: basePrice,
        paymentMethod,
        paymentStatus: paymentMethod === 'wallet' ? 'paid' : 'pending',
        status: 'pending',
        jobType,
        otp: null,
        completionOTP: null,
        createdAt: serverTimestamp(),
        location: profile.location || null,
      };

      let bookingId = '';

      if (paymentMethod === 'wallet') {
        // Use transaction for wallet payment to prevent race conditions
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', profile.uid);
          const userSnap = await transaction.get(userRef);
          
          if (!userSnap.exists()) {
            throw new Error("User profile not found");
          }

          const currentBalance = userSnap.data().walletBalance || 0;
          if (currentBalance < markupPrice) {
            throw new Error("Insufficient balance in wallet");
          }

          // 1. Deduct from wallet
          transaction.update(userRef, {
            walletBalance: currentBalance - markupPrice,
            updatedAt: serverTimestamp()
          });

          // 2. Create transaction record
          const txRef = doc(collection(db, 'transactions'));
          transaction.set(txRef, {
            userId: profile.uid,
            amount: markupPrice,
            type: 'debit',
            description: `Payment for booking with ${worker.name}`,
            status: 'approved',
            createdAt: serverTimestamp(),
          });

          // 3. Create booking
          const bookingRef = doc(collection(db, 'bookings'));
          transaction.set(bookingRef, bookingData);
          bookingId = bookingRef.id;
        });
            } else {
        const docRef = await addDoc(collection(db, 'bookings'), bookingData);
        bookingId = docRef.id;
      }

      // Notify the Provider about this new job request immediately
      await notificationService.notifyUser(
        worker.uid,
        'New Job Request!',
        `You have received a new booking request for ${worker.skill || worker.providerType} from ${profile.name || 'Customer'}.`,
        'new_booking',
        { bookingId }
      ).catch(error => {
        console.error('Failed to notify provider of new booking:', error);
      });

      toast.success(paymentMethod === 'wallet' ? 'Booking confirmed!' : 'Booking requested!');
      navigate(`/booking-status/${bookingId}`);
    } catch (err: any) {
      console.error('Booking Error:', err);
      toast.error(err.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!worker) return <div className="min-h-screen flex items-center justify-center">Worker not found</div>;

  const currentBasePrice = jobType === 'daily' 
    ? (worker.dailyRate || (worker.hourlyRate || 0) * 8) * days
    : jobType === 'contract'
      ? (worker.contractRate || 0)
      : (worker.hourlyRate || 0) * hours;

  const pricing = calculateMarkup(currentBasePrice);

  return (
    <div className="min-h-screen bg-brand-dark pb-40 transition-colors duration-500">
      <nav className="sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-3xl border-b border-white/5 h-20 flex items-center px-6 gap-5">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)} 
          className="p-3 bg-brand-surface rounded-2xl transition-colors border border-white/5"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>
        <div className="flex flex-col">
          <h1 className="font-black text-white uppercase tracking-tighter text-lg leading-none">Initiate Request</h1>
          <span className="text-[8px] font-black text-brand-amber uppercase tracking-[0.3em] mt-1">Deployment Protocol v4.0</span>
        </div>
      </nav>

      <div className="p-6 space-y-10">
        {/* Asset Header HUB */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-slate rounded-[40px] p-6 border border-white/5 shadow-2xl flex items-center gap-6"
        >
          <div className="w-20 h-20 rounded-[28px] bg-brand-dark flex items-center justify-center overflow-hidden border-2 border-white/10 shadow-2xl">
            {worker.photoURL ? (
              <img src={worker.photoURL} className="w-full h-full object-cover" alt={worker.name} referrerPolicy="no-referrer" />
            ) : (
              <span className="text-brand-amber font-black text-2xl">{getInitials(worker.name)}</span>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-black text-white text-base uppercase tracking-tighter leading-none">{worker.name}</h3>
            <p className="text-brand-amber text-[9px] font-black uppercase tracking-[0.2em]">{worker.skill || worker.providerType}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Active Node</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-brand-amber font-black text-lg tracking-tighter leading-none">
              {jobType === 'daily' 
                ? formatCurrency(calculateMarkup(worker.dailyRate || worker.hourlyRate * 8).markupPrice)
                : jobType === 'contract'
                  ? formatCurrency(calculateMarkup(worker.contractRate || 0).markupPrice)
                  : formatCurrency(calculateMarkup(worker.hourlyRate).markupPrice)
              }
            </div>
            <div className="text-[8px] font-black text-gray-teal uppercase tracking-widest mt-1">
              {jobType === 'daily' ? 'per day' : jobType === 'contract' ? 'fixed' : 'per hour'}
            </div>
          </div>
        </motion.div>

        {/* Matrix Quadrant Selection */}
        <div className="space-y-4">
          <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] px-2 flex items-center gap-3">
             <div className="w-5 h-[1px] bg-brand-amber" />
             Job Category Matrix
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'standard', label: 'Standard', icon: <Wrench className="w-5 h-5" /> },
              { id: 'daily', label: 'Daily Wage', icon: <Clock className="w-5 h-5" /> },
              { id: 'contract', label: 'Contract', icon: <Briefcase className="w-5 h-5" /> },
            ].map((t) => (
              <motion.button 
                key={t.id}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setJobType(t.id as JobType)}
                className={`flex flex-col items-center gap-3 p-5 rounded-[32px] border-2 transition-all ${jobType === t.id ? 'border-brand-amber bg-brand-amber/10 text-brand-amber shadow-2xl' : 'border-white/5 bg-brand-surface text-gray-teal'}`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${jobType === t.id ? 'bg-brand-amber text-brand-dark' : 'bg-brand-dark text-gray-teal'}`}>
                  {t.icon}
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Form Logic HUD */}
        <div className="bg-brand-slate rounded-[48px] p-8 border border-white/5 shadow-2xl space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em] px-2">Deployment Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-6 py-5 bg-brand-dark border border-brand-surface rounded-[28px] focus:ring-2 focus:ring-brand-amber outline-none text-sm font-bold min-h-[120px] resize-none text-cream shadow-inner transition-all placeholder:text-gray-teal/50"
                placeholder="Specify precise operational requirements..."
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em] px-2">Location Coordinates</label>
              <div className="relative group">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-amber w-5 h-5 z-10 transition-transform group-focus-within:scale-110" />
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-brand-dark border border-brand-surface rounded-[28px] focus:ring-2 focus:ring-brand-amber outline-none text-sm font-bold text-cream shadow-inner transition-all placeholder:text-gray-teal/50"
                  placeholder="Street, Sector, District Data..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em] px-2">Deployment Date</label>
                <div className="relative group">
                  <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-amber w-5 h-5 z-10" />
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-16 pr-6 py-5 bg-brand-dark border border-brand-surface rounded-[28px] focus:ring-2 focus:ring-brand-amber outline-none text-sm font-black text-cream shadow-inner transition-all"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em] px-2">
                  {jobType === 'daily' ? 'Quant. Days' : 'Quant. Hours'}
                </label>
                <div className="relative group">
                  {jobType === 'daily' ? <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-amber w-5 h-5 z-10" /> : <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-amber w-5 h-5 z-10" />}
                  <input 
                    type="number" 
                    value={jobType === 'daily' ? days : hours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      if (jobType === 'daily') setDays(val);
                      else setHours(val);
                    }}
                    min="1"
                    max={jobType === 'daily' ? 30 : 12}
                    className="w-full pl-16 pr-6 py-5 bg-brand-dark border border-brand-surface rounded-[28px] focus:ring-2 focus:ring-brand-amber outline-none text-sm font-black text-cream shadow-inner transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Breakdown HUD */}
          <div className="bg-brand-dark rounded-[36px] p-8 space-y-4 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-amber/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-teal group-hover:text-white transition-colors">
              <span>
                Base Resource Credit ({
                  jobType === 'daily' 
                    ? `${formatCurrency(worker.dailyRate || worker.hourlyRate * 8)} × ${days}d`
                    : jobType === 'contract'
                      ? 'Fixed Node Contract'
                      : `${formatCurrency(worker.hourlyRate)} × ${hours}hr`
                })
              </span>
              <span className="text-white">
                {formatCurrency(pricing.basePrice)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-teal group-hover:text-white transition-colors">
              <span>Protocol Fee ({settings.applicationFeeRate}%)</span>
              <span className="text-white">
                {formatCurrency(pricing.applicationFee)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-teal group-hover:text-white transition-colors">
              <span>Ledger Processing ({settings.paymentChargeRate}%)</span>
              <span className="text-white">
                {formatCurrency(pricing.paymentCharges)}
              </span>
            </div>
            <div className="h-px bg-white/5 my-4" />
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-brand-amber uppercase tracking-[0.3em] block">Total Allocation</span>
                <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Calculated Real-Time</span>
              </div>
              <span className="text-4xl font-black text-white tracking-tighter">
                {formatCurrency(pricing.markupPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Local Logistics Depots */}
        {nearbyShops.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] flex items-center gap-3">
                <div className="w-5 h-[1px] bg-brand-amber" />
                Linked Supply Depots
              </h3>
              <span className="text-[8px] font-black text-brand-amber bg-brand-amber/10 border border-brand-amber/20 px-3 py-1 rounded-full uppercase tracking-widest">Active Radius</span>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 px-2 scrollbar-hide">
              {nearbyShops.map((shop) => (
                <motion.div 
                  key={shop.uid}
                  whileHover={{ y: -5 }}
                  className="flex-shrink-0 w-64 bg-brand-slate rounded-[32px] p-5 border border-white/5 shadow-2xl space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-dark flex items-center justify-center text-brand-amber shadow-inner border border-white/5">
                      <Store className="w-6 h-6" />
                    </div>
                    <div className="overflow-hidden space-y-0.5">
                      <h4 className="font-black text-white text-[10px] uppercase tracking-tighter truncate leading-none">{shop.shopName}</h4>
                      <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest truncate">{shop.shopAddress}</p>
                    </div>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/shop/${shop.uid}`)}
                    className="w-full bg-brand-surface text-white text-[9px] font-black py-4 rounded-2xl border border-white/5 uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                  >
                    Sync Depot
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Protocol Selection */}
        <div className="space-y-4">
          <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] px-2 flex items-center gap-3">
             <div className="w-5 h-[1px] bg-brand-amber" />
             Payment Channel Matrix
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {([
              { id: 'wallet', label: 'Matrix Ledger Balance', icon: '💰', color: 'text-brand-amber' },
              { id: 'bkash', label: 'bKash Protocol', icon: '💙', color: 'text-pink-500' },
              { id: 'nagad', label: 'Nagad Protocol', icon: '🧡', color: 'text-orange-500' },
              { id: 'cash', label: 'Direct Site Settlement', icon: '💵', color: 'text-emerald-500' },
            ] as const).map((m) => (
              <motion.button 
                key={m.id}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPaymentMethod(m.id)}
                className={`flex items-center gap-5 p-6 rounded-[32px] border-2 transition-all ${paymentMethod === m.id ? 'border-brand-amber bg-brand-amber/5 text-brand-amber shadow-2xl' : 'border-white/5 bg-brand-surface text-gray-teal'}`}
              >
                <span className="text-2xl">{m.icon}</span>
                <div className="flex flex-col items-start space-y-0.5">
                   <span className="font-black text-xs uppercase tracking-widest leading-none">{m.label}</span>
                   {paymentMethod === m.id && <span className="text-[7px] font-black text-brand-amber uppercase tracking-[0.3em]">Channel Active</span>}
                </div>
                {paymentMethod === m.id && <CheckCircle2 className="ml-auto w-6 h-6 text-brand-amber" />}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Matrix Confirmation */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-brand-dark/80 backdrop-blur-3xl border-t border-white/5 p-8 pb-12 z-50">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-16 bg-brand-amber hover:shadow-brand-amber/20 text-brand-dark font-black text-xs uppercase tracking-[0.4em] rounded-[28px] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Deployment'}
        </motion.button>
      </div>
    </div>
  );
};
