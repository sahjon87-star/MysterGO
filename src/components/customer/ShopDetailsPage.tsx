import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShopProfile, ProviderProfile } from '../../types';
import { 
  ArrowLeft, MapPin, ShieldCheck, Clock, 
  MessageSquare, Share2, Info, ChevronRight, 
  Store, Instagram, Globe, Phone, Star
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { WorkerCard } from './WorkerCard';

export const ShopDetailsPage: React.FC = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [workers, setWorkers] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShop = async () => {
      if (!uid) return;
      try {
        const snap = await getDoc(doc(db, 'shops', uid));
        if (snap.exists()) {
          setShop({ uid: snap.id, ...snap.data() } as ShopProfile);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();

    // Fetch workers associated with this shop
    const q = query(collection(db, 'providers'), where('shopId', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      setWorkers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ProviderProfile)));
    }, (error) => {
      console.warn('ShopDetailsPage/providers listener error:', error);
    });

    return () => unsub();
  }, [uid]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-blue rounded-full animate-spin" />
    </div>
  );

  if (!shop) return null;

  return (
    <div className="min-h-screen bg-brand-dark pb-20 transition-colors duration-500">
      {/* Visual Header */}
      <div className="relative h-[35vh] bg-brand-dark overflow-hidden">
        {shop.images?.[0] ? (
          <img src={shop.images[0]} className="w-full h-full object-cover opacity-60" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-amber/10">
            <Store size={80} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent" />
        
        <div className="absolute top-6 left-4 right-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 transition-all">
            <ArrowLeft size={24} className="text-cream" />
          </button>
          <button className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 transition-all">
            <Share2 size={24} className="text-cream" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-24 relative z-10 space-y-6">
        {/* Core Profile Card */}
        <div className="bg-brand-slate rounded-[48px] p-8 shadow-2xl border border-white/5 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-amber/20 border border-brand-amber/30 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-amber" />
              <span className="text-[10px] font-black text-brand-amber uppercase tracking-widest">Certified Node</span>
            </div>
            <h1 className="text-3xl font-black text-cream uppercase tracking-tight">{shop.name}</h1>
            <div className="flex items-center justify-center gap-2 text-gray-teal">
              <MapPin size={14} className="text-brand-amber" />
              <span className="text-[10px] font-black uppercase tracking-widest">{shop.address}</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-4 border-t border-white/5">
            {[
              { icon: Instagram },
              { icon: Globe },
              { icon: Phone },
            ].map((btn, i) => (
              <button key={i} className="flex-1 h-14 bg-brand-surface border border-white/5 rounded-2xl flex items-center justify-center gap-2 text-gray-teal hover:text-brand-amber hover:bg-brand-amber/5 transition-all">
                <btn.icon size={20} />
              </button>
            ))}
          </div>
        </div>

        {/* Operational Statistics */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: workers.length, label: 'Agents' },
            { value: '4.7', label: 'Rating' },
            { value: '9:00', label: 'Opens' },
          ].map((stat, i) => (
            <div key={i} className="bg-brand-slate p-4 rounded-3xl border border-white/5 text-center shadow-xl">
              <h4 className="text-lg font-black text-cream uppercase leading-none mb-1">{stat.value}</h4>
              <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest leading-none">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Description Section */}
        <section className="space-y-4">
          <h3 className="px-2 text-xs font-black text-cream uppercase tracking-widest flex items-center gap-2">
            <Info size={16} className="text-brand-amber" />
            About Our Shop
          </h3>
          <div className="bg-brand-slate p-6 rounded-[32px] border border-white/5 shadow-2xl">
            <p className="text-sm text-gray-teal font-medium leading-relaxed">
              Established professional service shop offering reliable solutions for your home and commercial needs. We provide quality repairs, maintenance, and expert support.
            </p>
          </div>
        </section>

        {/* Active Agents (Workers) */}
        <section className="space-y-4 pb-10">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-cream uppercase tracking-widest flex items-center gap-2">
              <Store size={16} className="text-brand-amber" />
              Available Technicians
            </h3>
            <span className="text-[9px] font-black text-gray-teal uppercase tracking-widest bg-brand-slate px-2 py-1 rounded-full border border-white/5">
              {workers.length} Members
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
            {workers.length === 0 ? (
              <div className="w-full py-10 flex flex-col items-center justify-center opacity-30 grayscale">
                <p className="text-xs font-black text-cream uppercase tracking-widest">No active agents</p>
              </div>
            ) : (
              workers.map(worker => (
                <div key={worker.uid} className="min-w-[280px]">
                  <WorkerCard 
                    worker={worker}
                    onClick={() => navigate(`/worker/${worker.uid}`)}
                  />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
