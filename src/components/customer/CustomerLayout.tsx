import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, Wallet, User, Bell, LogOut, Store, Menu, X, Settings, Gift, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../shared/Logo';
import { useState } from 'react';

import { CustomerHome } from './CustomerHome';
import { CustomerSearch } from './CustomerSearch';
import { WorkerProfilePage } from './WorkerProfilePage';
import { NewBookingPage } from './NewBookingPage';
import { BookingStatusPage } from './BookingStatusPage';
import { CustomerBookings } from './CustomerBookings';
import { CustomerWallet } from './CustomerWallet';
import { CustomerProfile } from './CustomerProfile';
import { CustomerNotifications } from './CustomerNotifications';
import { CustomerSettings } from './CustomerSettings';
import { ShopProfilePage } from './ShopProfilePage';
import { CustomerShops } from './CustomerShops';
import { ReferralPage } from '../shared/ReferralPage';
import { MaterialCalculator } from './MaterialCalculator';
import { SupportChat } from '../shared/SupportChat';

import { SupportFAB } from '../shared/SupportFAB';

export const CustomerLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const [showSidebar, setShowSidebar] = useState(false);

  const allNavItems = [
    { icon: Home, label: 'nav.home', path: '/' },
    { icon: Search, label: 'nav.search', path: '/search' },
    { icon: Store, label: 'Shops', path: '/shops' },
    { icon: Calendar, label: 'nav.bookings', path: '/bookings' },
    { icon: Wallet, label: 'nav.wallet', path: '/wallet' },
    { icon: Calculator, label: 'Material Calculator', path: '/calculator' },
    { icon: Gift, label: 'Refer & Earn', path: '/referral' },
    { icon: User, label: 'nav.profile', path: '/profile' },
    { icon: Settings, label: 'menu.settings', path: '/settings' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
  ];

  const bottomNavItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Store, label: 'Shops', path: '/shops' },
    { icon: Menu, label: 'More', onClick: () => setShowSidebar(true) },
  ];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row w-full shadow-2xl relative overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-slate min-h-screen border-r border-brand-surface z-[70] shadow-2xl relative p-6">
        <div className="flex items-center justify-between mb-8">
          <Logo />
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-2 no-scrollbar">
          {allNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "bg-brand-amber text-brand-dark shadow-xl shadow-brand-amber/20" 
                    : "text-gray-teal hover:bg-brand-surface"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-bold text-sm uppercase tracking-widest">{t(item.label)}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-6 border-t border-brand-surface mt-auto space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-gray-teal uppercase tracking-widest">Theme</span>
            <ThemeToggle />
          </div>
          <button 
            onClick={async () => {
              await signOut(auth);
              navigate('/login');
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-widest"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] md:hidden w-full"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-3/4 bg-brand-slate z-[90] shadow-2xl p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <Logo />
                <button onClick={() => setShowSidebar(false)} className="p-2 bg-brand-surface rounded-xl">
                  <X className="w-5 h-5 text-gray-teal" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-2 no-scrollbar">
                {allNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setShowSidebar(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
                        isActive 
                          ? "bg-brand-amber text-brand-dark shadow-xl shadow-brand-amber/20" 
                          : "text-gray-teal hover:bg-brand-surface"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-widest">{t(item.label)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-brand-surface mt-auto space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-gray-teal uppercase tracking-widest">Theme</span>
                  <ThemeToggle />
                </div>
                <button 
                  onClick={async () => {
                    await signOut(auth);
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-widest"
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
        {/* Top Nav - High Contrast Glassmorphic Header */}
        <header className="glass-header sticky top-0 z-[55] h-20 flex items-center justify-between px-6 shadow-md relative md:hidden">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSidebar(true)}
            className="p-3 -ml-2 text-cream hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl transition-all"
          >
            <Menu className="w-6 h-6" />
          </motion.button>
          <Logo />
        </div>
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/notifications')} 
            className="relative p-3 text-cream hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl transition-all"
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 border-2 border-brand-dark rounded-full shadow-lg animate-pulse" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')} 
            className="w-11 h-11 rounded-2xl bg-brand-blue border border-brand-surface/50 shadow-2xl overflow-hidden ring-2 ring-brand-blue/30"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-amber font-black text-xs uppercase">
                {profile?.name.slice(0, 2)}
              </div>
            )}
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
              <Route path="/" element={<CustomerHome />} />
              <Route path="/search" element={<CustomerSearch />} />
              <Route path="/shops" element={<CustomerShops />} />
              <Route path="/worker/:workerId" element={<WorkerProfilePage />} />
              <Route path="/shop/:shopId" element={<ShopProfilePage />} />
              <Route path="/new-booking/:workerId" element={<NewBookingPage />} />
              <Route path="/booking-status/:bookingId" element={<BookingStatusPage />} />
              <Route path="/bookings" element={<CustomerBookings />} />
               <Route path="/wallet" element={<CustomerWallet />} />
              <Route path="/profile" element={<CustomerProfile />} />
              <Route path="/referral" element={<ReferralPage />} />
              <Route path="/settings" element={<CustomerSettings />} />
              <Route path="/notifications" element={<CustomerNotifications />} />
              <Route path="/calculator" element={<MaterialCalculator />} />
              <Route path="/support" element={<SupportChat />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Control Matrix - Bottom Nav Glass */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-brand-slate/90 backdrop-blur-3xl border-t border-white/10 h-24 flex items-center justify-around px-6 z-[45] shadow-[0_-8px_32px_rgba(0,0,0,0.3)] transition-all duration-500 rounded-t-[40px]">
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
              <item.icon className={cn("w-7 h-7", isActive && "stroke-[2.5px] drop-shadow-[0_0_8px_rgba(255,179,0,0.4)]")} />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">{item.label.includes('.') ? t(item.label) : item.label}</span>
            </motion.button>
          );
        })}
      </nav>
      <SupportFAB />
      </div>
    </div>
  );
};
