import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  Store, 
  Package, 
  ShoppingBag, 
  Wallet, 
  User, 
  Settings, 
  Bell, 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../shared/Logo';

import { ShopHome } from './ShopHome';
import { ShopInventory } from './ShopInventory';
import { ShopOrders } from './ShopOrders';
import { ShopWallet } from './ShopWallet';
import { ShopProfile } from './ShopProfile';
import { AddProductPage } from './AddProductPage';
import { OrderDetailsPage } from './OrderDetailsPage';
import { ShopKYC } from './ShopKYC';
import { ShopSettings } from './ShopSettings';
import { ShopNotifications } from './ShopNotifications';
import { ShopInsights } from './ShopInsights';
import { SupportChat } from '../shared/SupportChat';
import { SupportFAB } from '../shared/SupportFAB';

export const ShopLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const [showSidebar, setShowSidebar] = useState(false);

  const toggleOpen = async () => {
    if (!user || !profile) return;
    try {
      await updateDoc(doc(db, 'shops', user.uid), {
        isOpen: !profile.isOpen
      });
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { icon: Store, label: 'Shop Home', path: '/merchant' },
    { icon: ShoppingBag, label: 'Incoming Orders', path: '/merchant/orders' },
    { icon: Package, label: 'My Products', path: '/merchant/inventory' },
    { icon: PlusCircle, label: 'Add New Product', path: '/merchant/add-product' },
    { icon: LayoutDashboard, label: 'Shop Insights', path: '/merchant/insights' },
    { icon: Wallet, label: 'Shop Wallet', path: '/merchant/wallet' },
    { icon: User, label: 'Shop Profile', path: '/merchant/profile' },
    { icon: ShieldCheck, label: 'Shop Verification', path: '/merchant/kyc' },
    { icon: Settings, label: 'Shop Settings', path: '/merchant/settings' },
    { icon: Bell, label: 'Notifications', path: '/merchant/notifications' },
    { icon: Share2, label: 'Share Shop', onClick: () => {
       navigator.share({
         title: profile?.shopName || 'MistriGO Shop',
         text: `Check out our shop on MistriGO!`,
         url: window.location.href
       }).catch(console.error);
    } },
  ];

  const bottomNavItems = [
    { icon: Store, label: 'Home', path: '/merchant' },
    { icon: ShoppingBag, label: 'Orders', path: '/merchant/orders' },
    { icon: Package, label: 'Inventory', path: '/merchant/inventory' },
    { icon: Menu, label: 'Menu', onClick: () => setShowSidebar(true) },
  ];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row w-full shadow-2xl relative overflow-hidden transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-slate min-h-screen border-r border-brand-surface z-[70] shadow-2xl relative p-6">
        <div className="flex items-center justify-between mb-8">
          <Logo />
        </div>

        <div className="flex-1 space-y-1 pr-2 overflow-y-auto no-scrollbar">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (item.onClick) item.onClick();
                else if (item.path) navigate(item.path);
              }}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm uppercase tracking-widest",
                item.path && location.pathname === item.path 
                  ? "bg-brand-amber text-brand-dark shadow-lg shadow-brand-amber/20" 
                  : "text-gray-teal hover:bg-brand-surface"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="pt-6 border-t border-brand-surface bg-brand-slate mt-auto space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Theme</span>
            <ThemeToggle />
          </div>
          <button 
            onClick={async () => {
              await signOut(auth);
              navigate('/login');
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-widest"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] w-full md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-3/4 bg-brand-slate z-[70] shadow-2xl p-6 flex flex-col max-w-[300px] border-r border-brand-surface/20 md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <Logo />
                <button onClick={() => setShowSidebar(false)} className="p-2 bg-brand-surface rounded-xl border border-brand-surface/10">
                  <X className="w-5 h-5 text-gray-teal" />
                </button>
              </div>

              <div className="flex-1 space-y-1 pr-2 overflow-y-auto no-scrollbar">
                {menuItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      else if (item.path) navigate(item.path);
                      setShowSidebar(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm uppercase tracking-widest",
                      item.path && location.pathname === item.path 
                        ? "bg-brand-amber text-brand-dark shadow-lg shadow-brand-amber/20" 
                        : "text-gray-teal hover:bg-brand-surface"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t border-brand-surface bg-brand-slate mt-auto space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Theme</span>
                  <ThemeToggle />
                </div>
                <button 
                  onClick={async () => {
                    await signOut(auth);
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-widest"
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
          <Logo variant="merchant" />
        </div>
        <div className="flex items-center gap-3">
          {/* Shop Status Capsule */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-surface rounded-full border border-brand-surface/20 shadow-inner">
            <div className={`w-1.5 h-1.5 rounded-full ${profile?.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className={`text-[8px] font-black uppercase tracking-widest ${profile?.isOpen ? 'text-emerald-500' : 'text-gray-teal'}`}>
              {profile?.isOpen ? 'Open' : 'Closed'}
            </span>
            <button 
              onClick={toggleOpen}
              className={cn(
                "w-8 h-4 rounded-full relative transition-all ml-1",
                profile?.isOpen ? "bg-emerald-500" : "bg-brand-dark"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all",
                profile?.isOpen ? "right-0.5" : "left-0.5"
              )} />
            </button>
          </div>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/merchant/notifications')} 
            className="relative p-3 text-gray-teal hover:bg-brand-surface rounded-2xl transition-all"
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-3 right-3 w-3 h-3 bg-brand-amber border-2 border-brand-dark rounded-full shadow-lg" />
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
              <Route path="/" element={<ShopHome />} />
              <Route path="/orders" element={<ShopOrders />} />
              <Route path="/order/:orderId" element={<OrderDetailsPage />} />
              <Route path="/inventory" element={<ShopInventory />} />
              <Route path="/add-product" element={<AddProductPage />} />
              <Route path="/wallet" element={<ShopWallet />} />
              <Route path="/profile" element={<ShopProfile />} />
              <Route path="/kyc" element={<ShopKYC />} />
              <Route path="/insights" element={<ShopInsights />} />
              <Route path="/settings" element={<ShopSettings />} />
              <Route path="/notifications" element={<ShopNotifications />} />
              <Route path="/support" element={<SupportChat />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Control Matrix - Bottom Nav Glass */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-brand-slate/90 backdrop-blur-3xl border-t border-brand-surface h-24 flex items-center justify-around px-6 z-[45] shadow-[0_-8px_32px_rgba(0,0,0,0.15)] transition-all duration-500 rounded-t-[40px]">
        {bottomNavItems.map((item, idx) => {
          const isActive = item.path && location.pathname === item.path;
          return (
            <motion.button
              key={idx}
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
