import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Briefcase, Wallet, User, Bell, LogOut, Menu, X, Settings, LayoutDashboard, Share2, ClipboardList, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../shared/Logo';

import { ProviderHome } from './ProviderHome';
import { ProviderJobs } from './ProviderJobs';
import { ProviderWallet } from './ProviderWallet';
import { ProviderProfile } from './ProviderProfile';
import { JobDetailsPage } from './JobDetailsPage';
import { ProviderKYC } from './ProviderKYC';
import { ProviderSettings } from './ProviderSettings';
import { ProviderNotifications } from './ProviderNotifications';
import { ProviderInsights } from './ProviderInsights';
import { SupportChat } from '../shared/SupportChat';
import { SupportFAB } from '../shared/SupportFAB';

export const ProviderLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);

  React.useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'bookings'),
      where('providerId', '==', profile.uid),
      where('status', 'in', ['pending', 'accepted', 'ongoing'])
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setActiveBookingsCount(snap.size);
    }, (error) => {
      console.warn('Error listening to active jobs count:', error);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  const toggleOnline = async () => {
    if (!user || !profile) return;
    try {
      await updateDoc(doc(db, 'providers', user.uid), {
        isOnline: !profile.isOnline
      });
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { icon: Home, label: 'nav.home', path: '/pro' },
    { icon: Briefcase, label: 'nav.jobs', path: '/pro/jobs' },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/pro/insights' },
    { icon: Wallet, label: 'nav.wallet', path: '/pro/wallet' },
    { icon: User, label: 'nav.profile', path: '/pro/profile' },
    { icon: ShieldCheck, label: 'Verification (KYC)', path: '/pro/kyc' },
    { icon: Settings, label: 'menu.settings', path: '/pro/settings' },
    { icon: Bell, label: 'Notifications', path: '/pro/notifications' },
    { icon: Share2, label: 'Refer & Earn', path: '/referral' },
  ];

  const bottomNavItems = [
    { icon: Home, label: 'Home', path: '/pro' },
    { icon: Briefcase, label: 'Jobs', path: '/pro/jobs' },
    { icon: Wallet, label: 'Earnings', path: '/pro/wallet' },
    { icon: Menu, label: 'Menu', onClick: () => setShowSidebar(true) },
  ];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row w-full relative overflow-hidden transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-slate min-h-screen border-r border-white/5 z-[70] shadow-2xl relative p-6">
        <div className="flex items-center justify-between mb-8">
          <Logo />
        </div>

        <div className="flex-1 space-y-1 pr-2 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isJobs = item.path === '/pro/jobs';
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm uppercase tracking-widest",
                  isActive 
                    ? "bg-brand-amber text-brand-dark shadow-xl shadow-brand-amber/20" 
                    : "text-gray-teal hover:bg-brand-surface"
                )}
              >
                <div className="flex items-center gap-4">
                  <item.icon className="w-5 h-5" />
                  <span>{t(item.label)}</span>
                </div>
                {isJobs && activeBookingsCount > 0 && (
                  <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white shadow-lg animate-pulse shrink-0">
                    {activeBookingsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-6 border-t border-white/5 bg-brand-slate mt-auto space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-gray-teal uppercase tracking-widest">Theme</span>
            <ThemeToggle />
          </div>
          <button 
            onClick={async () => {
              await signOut(auth);
              navigate('/login');
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-widest"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] w-full md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-3/4 bg-brand-slate z-[70] shadow-2xl p-6 flex flex-col max-w-[300px] border-r border-white/5 md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <Logo />
                <button onClick={() => setShowSidebar(false)} className="p-2 bg-brand-surface rounded-xl border border-white/5">
                  <X className="w-5 h-5 text-gray-teal" />
                </button>
              </div>

              <div className="flex-1 space-y-1 pr-2 overflow-y-auto no-scrollbar">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const isJobs = item.path === '/pro/jobs';
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setShowSidebar(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm uppercase tracking-widest",
                        isActive 
                          ? "bg-brand-amber text-brand-dark shadow-xl shadow-brand-amber/20" 
                          : "text-gray-teal hover:bg-brand-surface"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <item.icon className="w-5 h-5" />
                        <span>{t(item.label)}</span>
                      </div>
                      {isJobs && activeBookingsCount > 0 && (
                        <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white shadow-lg animate-pulse shrink-0">
                          {activeBookingsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-white/5 bg-brand-slate mt-auto space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-gray-teal uppercase tracking-widest">Theme</span>
                  <ThemeToggle />
                </div>
                <button 
                  onClick={async () => {
                    await signOut(auth);
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-widest"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav - High Contrast Glass */}
        <header className="glass-header sticky top-0 z-[55] h-20 flex items-center justify-between px-6 shadow-md transition-all duration-500 md:hidden">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSidebar(true)}
            className="p-3 -ml-2 text-cream hover:text-brand-amber hover:bg-brand-surface rounded-2xl transition-all"
          >
            <Menu className="w-6 h-6" />
          </motion.button>
          <Logo />
        </div>
        <div className="flex items-center gap-3">
          {/* Status Capsule */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-surface rounded-full border border-white/5 shadow-inner">
            <div className={`w-1.5 h-1.5 rounded-full ${profile?.isOnline ? 'bg-emerald-500 animate-pulse outline outline-emerald-500/30 outline-offset-2' : 'bg-brand-dark'}`} />
            <span className={`text-[8px] font-black uppercase tracking-widest ${profile?.isOnline ? 'text-emerald-500' : 'text-gray-teal'}`}>
              {profile?.isOnline ? 'Online' : 'Offline'}
            </span>
            <button 
              onClick={toggleOnline}
              className={cn(
                "w-8 h-4 rounded-full relative transition-all ml-1",
                profile?.isOnline ? "bg-emerald-500" : "bg-brand-dark"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all",
                profile?.isOnline ? "right-0.5" : "left-0.5"
              )} />
            </button>
          </div>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/pro/notifications')} 
            className="relative p-3 text-gray-teal hover:bg-brand-surface rounded-2xl transition-all"
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 border-2 border-brand-slate rounded-full shadow-lg" />
          </motion.button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="min-h-full"
          >
            <Routes>
              <Route path="/" element={<ProviderHome />} />
              <Route path="/jobs" element={<ProviderJobs />} />
              <Route path="/job/:jobId" element={<JobDetailsPage />} />
              <Route path="/wallet" element={<ProviderWallet />} />
              <Route path="/profile" element={<ProviderProfile />} />
              <Route path="/kyc" element={<ProviderKYC />} />
              <Route path="/insights" element={<ProviderInsights />} />
              <Route path="/settings" element={<ProviderSettings />} />
              <Route path="/notifications" element={<ProviderNotifications />} />
              <Route path="/support" element={<SupportChat />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Control Matrix - Bottom Nav Glass */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-brand-slate/90 backdrop-blur-3xl border-t border-white/5 h-24 flex items-center justify-around px-6 z-[45] shadow-2xl transition-all duration-500 rounded-t-[40px]">
        {bottomNavItems.map((item) => {
          const isActive = item.path && location.pathname === item.path;
          return (
            <motion.button
              key={item.label}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={item.onClick || (() => navigate(item.path!))}
              className={cn(
                "flex flex-col items-center gap-1.5 px-5 py-3 rounded-[24px] transition-all duration-500",
                isActive 
                  ? "text-brand-amber bg-brand-amber/10 shadow-inner" 
                  : "text-gray-teal hover:text-brand-amber"
              )}
            >
              <item.icon className={cn("w-7 h-7", isActive && "stroke-[2.5px] drop-shadow-[0_0_8px_rgba(255,179,0,0.3)]")} />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
      <SupportFAB />
      </div>
    </div>
  );
};
