import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { 
  User, Wallet, Gift, Settings, LogOut, 
  ChevronRight, Shield, Bell, HelpCircle, 
  MapPin, Camera, Star, Zap, CreditCard,
  MessageCircle, BarChart3, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'motion/react';

export const ProfilePage: React.FC = () => {
  const { profile: authProfile, logout } = useAuth();
  const profile = authProfile as any;
  const navigate = useNavigate();

  const [adminSettings, setAdminSettings] = useState({
    referralRewardAmount: 20
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'system_config'));
        if (snap.exists()) {
          setAdminSettings({
            referralRewardAmount: snap.data().referralRewardAmount ?? 20
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const menuGroups = [
    {
      title: "Finances & Assets",
      items: [
        { icon: Wallet, label: "Wallet & Payouts", sub: "৳" + (profile?.walletBalance || 0), path: "/wallet", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { icon: Gift, label: "Refer & Earn Credits", sub: `Earn ৳${adminSettings.referralRewardAmount} per friend`, path: "/referral", color: "text-orange-500", bg: "bg-orange-500/10" },
      ]
    },
    {
      title: "Activity & History",
      items: [
        { icon: Clock, label: "Booking History", sub: "All past bookings", path: "/bookings", color: "text-primary-blue", bg: "bg-primary-blue/10" },
        { icon: MessageCircle, label: "Help & Support", sub: "24/7 Customer Support", path: "/support", color: "text-indigo-500", bg: "bg-indigo-500/10" },
      ]
    },
    {
      title: "Identity & Trust",
      items: [
        { icon: Settings, label: "App Settings", sub: "Privacy, Theme, Lang", path: "/settings", color: "text-slate-500", bg: "bg-slate-500/10" },
        { icon: Shield, label: "Security Settings", sub: "Password, Verification", path: "/security", color: "text-rose-500", bg: "bg-rose-500/10" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Dynamic Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-8 pt-12 rounded-b-[48px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/20 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="w-24 h-24 rounded-[32px] bg-slate-800 border-4 border-slate-700 overflow-hidden group-hover:scale-105 transition-transform duration-500">
              {profile?.photoURL ? (
                <img src={profile.photoURL} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-white font-black">
                  {profile?.name?.charAt(0)}
                </div>
              )}
            </div>
            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary-blue text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all border-4 border-slate-900">
              <Camera size={18} />
            </button>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">{profile?.name}</h1>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <Star className="w-3 h-3 text-orange-400 fill-current" />
                <span className="text-[10px] font-black text-white/80 uppercase">Elite Tier</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-blue/20 rounded-full border border-primary-blue/30">
                <Zap className="w-3 h-3 text-primary-blue fill-current" />
                <span className="text-[10px] font-black text-primary-blue uppercase tracking-widest">Active Pulse</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-8 relative z-10">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => navigate('/wallet')}
            className="bg-emerald-500 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-500/20 group cursor-pointer"
          >
            <BarChart3 className="w-6 h-6 mb-3 opacity-60 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mb-1">Liquid Balance</p>
            <h4 className="text-xl font-black">{formatCurrency(profile?.walletBalance || 0)}</h4>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-primary-blue p-6 rounded-[32px] text-white shadow-xl shadow-primary-blue/20 group cursor-pointer"
          >
            <Zap className="w-6 h-6 mb-3 opacity-60 group-hover:scale-110 transition-transform" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mb-1">Total Impact</p>
            <h4 className="text-xl font-black">12 Jobs</h4>
          </motion.div>
        </div>

        {/* Menu Sections */}
        {menuGroups.map((group, gIdx) => (
          <div key={group.title} className="space-y-3">
            <h3 className="px-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">{group.title}</h3>
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-2 border border-slate-100 dark:border-slate-800 shadow-sm">
              {group.items.map((item, iIdx) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-[32px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group",
                    iIdx !== group.items.length - 1 && "mb-1"
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", item.bg, item.color)}>
                    <item.icon size={22} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{item.label}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Action Protocol */}
        <div className="pt-4 px-2 space-y-4">
          <button 
            onClick={logout}
            className="w-full h-16 rounded-[24px] bg-red-50 dark:bg-red-500/10 text-red-500 font-black text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-3 border border-red-100 dark:border-red-500/20 active:scale-95 transition-all"
          >
            <LogOut size={18} />
            Terminate Session
          </button>
          
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.5em]">v2.4.0 Codename: Antigravity</p>
          </div>
        </div>
      </div>
    </div>
  );
};
