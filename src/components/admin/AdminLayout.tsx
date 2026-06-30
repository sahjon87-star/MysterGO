import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  ShieldCheck, 
  Settings, 
  Bell, 
  LogOut,
  CreditCard,
  Map as MapIcon,
  Store,
  LayoutGrid, 
  Banknote, 
  Menu, 
  X, 
  Megaphone,
  Bug 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

import { AdminDashboard } from './AdminDashboard';
import { AdminUsers } from './AdminUsers';
import { AdminProviders } from './AdminProviders';
import { AdminBookings } from './AdminBookings';
import { AdminTransactions } from './AdminTransactions';
import { AdminCategories } from './AdminCategories';
import { AdminMap } from './AdminMap';
import { AdminWithdrawals } from './AdminWithdrawals';
import { AdminNotifications } from './AdminNotifications';
import { AdminSettings } from './AdminSettings';
import { AdminOffers } from './AdminOffers';
import { AdminShops } from './AdminShops';
import { AdminSupport } from './AdminSupport';
import { AdminAgents } from './AdminAgents';
import { AdminErrorMonitor } from './AdminErrorMonitor';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../shared/Logo';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSuperAdmin, profile } = useAuth();
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const permissions = (profile as any)?.permissions || {
    canManageUsers: true,
    canManageWorkers: true,
    canViewEarnings: true,
    canManageSupport: true,
    canDeleteData: true,
  };

  const allNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  ];

  if (isSuperAdmin) {
    allNavItems.push({ icon: Users, label: 'Agents (RBAC)', path: '/admin/agents' });
    allNavItems.push({ icon: Bug, label: 'Error Monitor', path: '/admin/errors' });
  }

  if (isSuperAdmin || permissions.canManageSupport) {
    allNavItems.push({ icon: Bell, label: 'Live Support', path: '/admin/support' });
  }

  if (isSuperAdmin || permissions.canManageUsers) {
    allNavItems.push({ icon: Users, label: 'Users', path: '/admin/users' });
  }

  if (isSuperAdmin || permissions.canManageWorkers) {
    allNavItems.push({ icon: ShieldCheck, label: 'Provider KYC', path: '/admin/providers' });
    allNavItems.push({ icon: Store, label: 'Market KYC', path: '/admin/shops' });
    allNavItems.push({ icon: LayoutGrid, label: 'Categories', path: '/admin/categories' });
    allNavItems.push({ icon: Briefcase, label: 'Bookings', path: '/admin/bookings' });
  }

  if (isSuperAdmin || permissions.canViewEarnings) {
    allNavItems.push({ icon: Banknote, label: 'Payouts', path: '/admin/withdrawals' });
    allNavItems.push({ icon: CreditCard, label: 'Finance', path: '/admin/transactions' });
  }

  allNavItems.push({ icon: MapIcon, label: 'Live Map', path: '/admin/map' });
  allNavItems.push({ icon: Megaphone, label: 'Offers', path: '/admin/offers' });
  allNavItems.push({ icon: Settings, label: 'Settings', path: '/admin/settings' });

  const bottomNavItems: any[] = [
    { icon: LayoutDashboard, label: 'Home', path: '/admin' },
  ];
  if (isSuperAdmin || permissions.canManageSupport) {
    bottomNavItems.push({ icon: Bell, label: 'Support', path: '/admin/support' });
  } else if (isSuperAdmin || permissions.canManageUsers) {
    bottomNavItems.push({ icon: Users, label: 'Users', path: '/admin/users' });
  }
  if (isSuperAdmin) {
    bottomNavItems.push({ icon: Bug, label: 'Errors', path: '/admin/errors' });
  } else {
    bottomNavItems.push({ icon: MapIcon, label: 'Map', path: '/admin/map' });
  }
  bottomNavItems.push({ icon: Menu, label: 'More', onClick: () => setShowSidebar(true) });

  return (

    <div className="min-h-screen bg-brand-dark flex flex-col md:flex-row w-full shadow-2xl relative overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-slate min-h-screen border-r border-brand-surface z-[70] shadow-2xl relative p-6">
        <div className="flex items-center justify-between mb-8">
          <Logo variant="admin" />
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-2 no-scrollbar">
          {allNavItems.map((item) => {
            const isActive = item.path === '/admin' 
              ? (location.pathname === '/admin' || location.pathname === '/admin/')
              : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
                  isActive 
                    ? "bg-brand-amber text-brand-dark shadow-lg shadow-brand-amber/20" 
                    : "text-gray-teal hover:bg-brand-surface"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-bold text-sm uppercase tracking-widest">{item.label}</span>
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
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-brand-surface/10 transition-all font-bold text-sm uppercase tracking-widest"
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
              className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-[60] w-full md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-3/4 bg-brand-slate z-[70] shadow-2xl p-6 flex flex-col md:hidden max-w-[300px] border-r border-brand-surface/20"
            >
              <div className="flex items-center justify-between mb-8">
                <Logo variant="admin" />
                <button onClick={() => setShowSidebar(false)} className="p-2 bg-brand-surface rounded-xl border border-brand-surface/10">
                  <X className="w-5 h-5 text-gray-teal" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-2 no-scrollbar">
                {allNavItems.map((item) => {
                  const isActive = item.path === '/admin' 
                    ? (location.pathname === '/admin' || location.pathname === '/admin/')
                    : location.pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setShowSidebar(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
                        isActive 
                          ? "bg-brand-amber text-brand-dark shadow-lg shadow-brand-amber/20" 
                          : "text-gray-teal hover:bg-brand-surface"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-widest">{item.label}</span>
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
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-brand-surface/10 transition-all font-bold text-sm uppercase tracking-widest"
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
        {/* Top Nav - High Contrast Glass Header */}
        <header className="glass-header sticky top-0 z-40 h-20 flex items-center justify-between px-6 shadow-md md:hidden">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSidebar(true)}
            className="p-3 -ml-2 text-cream hover:text-brand-amber hover:bg-brand-surface rounded-2xl transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Logo variant="admin" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button 
            onClick={() => setShowNotifications(true)}
            className="relative p-3 text-cream hover:text-brand-amber hover:bg-brand-surface rounded-2xl transition-all"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-brand-amber border-2 border-brand-dark rounded-full flex items-center justify-center text-[8px] font-black text-brand-dark">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <AdminNotifications 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        adminId={user?.uid || ''} 
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32 flex flex-col no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="flex-1 flex flex-col"
          >
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/providers" element={<AdminProviders />} />
              <Route path="/shops" element={<AdminShops />} />
              <Route path="/categories" element={<AdminCategories />} />
              <Route path="/bookings" element={<AdminBookings />} />
              <Route path="/transactions" element={<AdminTransactions />} />
              <Route path="/withdrawals" element={<AdminWithdrawals />} />
              <Route path="/offers" element={<AdminOffers />} />
              <Route path="/map" element={<AdminMap />} />
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="/support" element={<AdminSupport />} />
              <Route path="/agents" element={<AdminAgents />} />
              <Route path="/errors" element={<AdminErrorMonitor />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Control Matrix - Bottom Nav Glass */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-brand-slate/90 backdrop-blur-3xl border-t border-brand-surface h-24 flex items-center justify-around px-6 z-[45] shadow-[0_-8px_32px_rgba(0,0,0,0.15)] transition-all duration-500 rounded-t-[40px]">
        {bottomNavItems.map((item, idx) => {
          const isActive = item.path && (item.path === '/admin' 
            ? (location.pathname === '/admin' || location.pathname === '/admin/')
            : location.pathname.startsWith(item.path));
          
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
      </div>
    </div>
  );
};
