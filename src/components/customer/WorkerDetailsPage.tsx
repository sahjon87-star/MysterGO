import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ProviderProfile } from '../../types';
import { 
  ArrowLeft, Star, MapPin, ShieldCheck, Clock, 
  MessageSquare, Share2, Info, ChevronRight, 
  StarHalf, CheckCircle, User
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export const WorkerDetailsPage: React.FC = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [worker, setWorker] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
    });
    return () => unsub();
  }, []);

  const calculateMarkupPrice = (basePrice: number) => {
    const markup = basePrice * (1 + (settings.applicationFeeRate + settings.paymentChargeRate) / 100);
    return Math.round(markup);
  };

  useEffect(() => {
    const fetchWorker = async () => {
      if (!uid) return;
      try {
        const snap = await getDoc(doc(db, 'providers', uid));
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
  }, [uid]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-blue rounded-full animate-spin" />
    </div>
  );

  if (!worker) return null;

  return (
    <div className="min-h-screen bg-brand-dark pb-32 transition-colors duration-500">
      {/* Visual Header - Asset Backdrop */}
      <div className="relative h-[45vh] bg-brand-dark overflow-hidden">
        {/* Animated Background Matrix */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-amber/10 rounded-full -mr-32 -mt-32 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full -ml-32 -mb-32 blur-[100px]" />
        
        {worker.photoURL ? (
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            src={worker.photoURL} 
            className="w-full h-full object-cover" 
            alt={worker.name} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-teal/10">
            <User size={180} className="translate-y-12" />
          </div>
        )}
        
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent" />
        
        <div className="absolute top-8 left-6 right-6 flex items-center justify-between">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)} 
            className="w-14 h-14 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[22px] flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all"
          >
            <ArrowLeft size={24} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[22px] flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all"
          >
            <Share2 size={24} />
          </motion.button>
        </div>
      </div>

      <div className="px-6 -mt-32 relative z-10 space-y-8">
        {/* Core Profile HUD */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-brand-slate rounded-[48px] p-10 shadow-2xl border border-white/5 text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-amber shadow-lg shadow-brand-amber/20 rounded-full border border-white/10">
            <ShieldCheck className="w-4 h-4 text-brand-dark" />
            <span className="text-[9px] font-black text-brand-dark uppercase tracking-[0.3em]">Verified Asset Tier</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white leading-[0.8] tracking-tighter uppercase">{worker.name}</h1>
            <p className="text-[10px] font-black text-brand-amber uppercase tracking-[0.4em]">{worker.skill || worker.providerType}</p>
          </div>

          <div className="flex items-center justify-center gap-8 py-5 border-y border-white/5">
            <div className="text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-brand-amber">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-lg font-black text-white">{(worker.rating || 0).toFixed(1)}</span>
              </div>
              <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Efficiency</p>
            </div>
            <div className="w-[1px] h-10 bg-white/5" />
            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-black text-white">240+</h4>
              <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Deployments</p>
            </div>
            <div className="w-[1px] h-10 bg-white/5" />
            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-black text-emerald-400">98%</h4>
              <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">Success</p>
            </div>
          </div>
        </motion.div>

        {/* Operational Grid */}
        <div className="grid grid-cols-2 gap-5">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-brand-slate p-8 rounded-[36px] border border-white/5 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-amber/10 border border-brand-amber/20 flex items-center justify-center text-brand-amber mb-4 shadow-inner">
              <Clock size={22} />
            </div>
            <p className="text-[8px] font-black text-gray-teal uppercase tracking-[0.2em] mb-1">Latency Profile</p>
            <h5 className="text-[11px] font-black text-white uppercase tracking-widest">{"<"} 15m Response</h5>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-brand-slate p-8 rounded-[36px] border border-white/5 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
              <CheckCircle size={22} />
            </div>
            <p className="text-[8px] font-black text-gray-teal uppercase tracking-[0.2em] mb-1">Status</p>
            <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Active</h5>
          </motion.div>
        </div>

        {/* Profile Narrative */}
        <div className="space-y-4">
          <h3 className="px-3 text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] flex items-center gap-3">
            <div className="w-6 h-[1px] bg-brand-amber" />
            Operational Directives
          </h3>
          <div className="bg-brand-slate p-8 rounded-[40px] border border-white/5 shadow-2xl">
            <p className="text-sm text-gray-teal font-bold leading-[1.8] tracking-wide">
              {worker.skill || 'Skilled professional'} identified as a high-authority asset with extensive deployment history in critical infrastructure. Specializes in advanced {worker.skill} diagnostics, structural architecture, and precision implementation. Consistent records of delivering 100% operational success for all project nodes.
            </p>
          </div>
        </div>

        {/* Financial Protocol Wrapper */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-brand-amber rounded-[48px] p-10 text-brand-dark space-y-6 shadow-2xl shadow-brand-amber/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -mr-40 -mt-40 transition-all group-hover:bg-white/20" />
          
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-dark/60">Resource Credit</p>
            <span className="px-3 py-1 bg-brand-dark/10 border border-brand-dark/10 rounded-full text-[8px] font-black uppercase tracking-widest text-brand-dark">Institutional</span>
          </div>
          
          <div className="flex items-end gap-2 relative z-10">
            <h2 className="text-5xl font-black tracking-tighter text-brand-dark">
              {formatCurrency(calculateMarkupPrice(worker.hourlyRate))}
            </h2>
            <p className="text-xs font-black text-brand-dark/60 uppercase mb-2 tracking-widest">/ Node Cycle</p>
          </div>
          
          <div className="bg-brand-dark/5 backdrop-blur-md rounded-2xl p-5 border border-brand-dark/10 relative z-10">
            <p className="text-[8px] font-black text-brand-dark/80 uppercase tracking-[0.3em] leading-relaxed">
              *Final allocation may deviate based on structural complexity and specialized component requirements.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Control Matrix */}
      <div className="fixed bottom-0 left-0 right-0 w-full p-8 bg-brand-dark/80 backdrop-blur-3xl border-t border-white/5 flex gap-5 z-50">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-20 h-20 bg-brand-slate rounded-[32px] flex items-center justify-center text-gray-teal hover:text-brand-amber transition-all border border-white/5 shadow-2xl"
        >
          <MessageSquare size={26} />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/booking/${worker.uid}`)}
          className="flex-1 h-20 bg-brand-amber text-brand-dark rounded-[32px] font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-brand-amber/20 flex items-center justify-center gap-4 group transition-all"
        >
          Initialize Matrix
          <ChevronRight size={22} className="group-hover:translate-x-2 transition-transform" />
        </motion.button>
      </div>
    </div>
  );
};
