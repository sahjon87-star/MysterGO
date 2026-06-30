import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, Wallet, User, Bell, LogOut, Store, Menu, X, Settings, Gift, Calculator, CreditCard, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn, formatCurrency } from '../../lib/utils';
import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../shared/Logo';
import { useState } from 'react';
import toast from 'react-hot-toast';

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
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);

  React.useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', profile.uid),
      where('status', 'in', ['pending', 'accepted', 'ongoing'])
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setActiveBookingsCount(snap.size);
    }, (error) => {
      console.warn('Error listening to active bookings:', error);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  const [unreleasedBookings, setUnreleasedBookings] = useState<any[]>([]);
  const [releasingIds, setReleasingIds] = useState<Record<string, boolean>>({});
  const [isSnoozed, setIsSnoozed] = useState(false);
  const snoozeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleSnooze = () => {
    setIsSnoozed(true);
    if (snoozeTimeoutRef.current) {
      clearTimeout(snoozeTimeoutRef.current);
    }
    snoozeTimeoutRef.current = setTimeout(() => {
      setIsSnoozed(false);
    }, 90000); // Exactly 1.5 minutes (90 seconds)
  };

  React.useEffect(() => {
    return () => {
      if (snoozeTimeoutRef.current) {
        clearTimeout(snoozeTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!profile?.uid || profile?.role === 'provider' || profile?.role === 'shop') return;
    
    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', profile.uid),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const bookingsData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((b: any) => b.paymentMethod !== 'cash' && b.paymentReleased !== true && b.paymentReleased !== 'pending_approval');
      
      setUnreleasedBookings(bookingsData);
    }, (error) => {
      console.warn('Error listening to unreleased bookings:', error);
    });

    return () => unsubscribe();
  }, [profile?.uid, profile?.role]);

  const handleRelease = async (booking: any) => {
    setReleasingIds(prev => ({ ...prev, [booking.id]: true }));
    try {
      await runTransaction(db, async (transaction) => {
        const bookingRef = doc(db, 'bookings', booking.id);
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists()) {
          throw new Error("Booking not found");
        }
        const data = bookingSnap.data();
        if (data.paymentReleased) return;

        transaction.update(bookingRef, {
          paymentReleased: 'pending_approval',
          paymentStatus: 'pending_approval',
          updatedAt: serverTimestamp()
        });

        const earning = data.providerEarning || data.totalAmount || 0;
        const collectionName = data.providerCollection || 'providers';

        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          userId: data.providerId,
          userName: data.providerName || 'Provider',
          amount: earning,
          type: 'credit',
          description: `Escrow payment release request for booking #${booking.id.slice(-6).toUpperCase()}`,
          status: 'pending_approval',
          bookingId: booking.id,
          userCollection: collectionName,
          createdAt: serverTimestamp()
        });
        
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: data.providerId,
          title: 'Release Requested',
          message: `Customer requested release of payment ${formatCurrency(earning)} for booking #${booking.id.slice(-6).toUpperCase()}. Awaiting Admin approval.`,
          type: 'payment',
          createdAt: serverTimestamp()
        });
      });
      toast.success("Payment release requested! Awaiting Admin approval.");
    } catch (err: any) {
      console.error("Error releasing payment:", err);
      toast.error(err.message || "Failed to request payment release");
    } finally {
      setReleasingIds(prev => ({ ...prev, [booking.id]: false }));
    }
  };

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
            const isBookings = item.path === '/bookings';
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "bg-brand-amber text-brand-dark shadow-xl shadow-brand-amber/20" 
                    : "text-gray-teal hover:bg-brand-surface"
                )}
              >
                <div className="flex items-center gap-4">
                  <item.icon className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-widest">{t(item.label)}</span>
                </div>
                {isBookings && activeBookingsCount > 0 && (
                  <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white shadow-lg animate-pulse shrink-0">
                    {activeBookingsCount}
                  </span>
                )}
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
                  const isBookings = item.path === '/bookings';
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setShowSidebar(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300",
                        isActive 
                          ? "bg-brand-amber text-brand-dark shadow-xl shadow-brand-amber/20" 
                          : "text-gray-teal hover:bg-brand-surface"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <item.icon className="w-5 h-5" />
                        <span className="font-bold text-sm uppercase tracking-widest">{t(item.label)}</span>
                      </div>
                      {isBookings && activeBookingsCount > 0 && (
                        <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white shadow-lg animate-pulse shrink-0">
                          {activeBookingsCount}
                        </span>
                      )}
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
      
      {/* Real-time Payment Release Prompts */}
      <AnimatePresence>
        {(() => {
          const anyUnpaid = unreleasedBookings.some((b) => {
            const transactionId = b.trxId;
            const screenshotUrl = b.paymentScreenshotUrl;
            return b.paymentMethod !== 'wallet' && !(transactionId && transactionId.trim() !== "" && transactionId.toUpperCase() !== "N/A" && screenshotUrl);
          });

          if (unreleasedBookings.length === 0 || (isSnoozed && !anyUnpaid)) return null;

          return (
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={anyUnpaid ? { 
                opacity: 1, 
                y: 0, 
                scale: [1, 1.01, 1],
                transition: {
                  scale: {
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut"
                  }
                }
              } : { opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className={`fixed bottom-28 md:bottom-8 right-4 left-4 md:left-auto md:w-[450px] bg-brand-slate/95 backdrop-blur-2xl border-2 rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] space-y-4 relative transition-colors ${anyUnpaid ? 'border-brand-amber/60 bg-brand-slate/98' : 'border-brand-amber/30'}`}
            >
              {/* Close/Snooze Button */}
              {!anyUnpaid && (
                <button
                  onClick={handleSnooze}
                  className="text-slate-400 hover:text-slate-200 absolute top-3.5 right-3.5 p-1 cursor-pointer rounded-full hover:bg-white/10 transition-colors z-50"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {unreleasedBookings.map((booking) => {
                const isReleasing = releasingIds[booking.id] || false;
                const transactionId = booking.trxId;
                const screenshotUrl = booking.paymentScreenshotUrl;
                const isPaymentDetailsSubmitted = booking.paymentMethod === 'wallet' || !!(transactionId && transactionId.trim() !== "" && transactionId.toUpperCase() !== "N/A" && screenshotUrl);

                return (
                  <div key={booking.id} className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-brand-amber/10 rounded-2xl flex items-center justify-center border border-brand-amber/20 shrink-0">
                        <CreditCard className="w-6 h-6 text-brand-amber animate-bounce" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-cream uppercase tracking-tight">Release Payment Required</h4>
                        <p className="text-xs text-gray-teal font-medium leading-relaxed">
                          Your provider <span className="text-brand-amber font-bold">{booking.providerName}</span> has completed the work. Please review and Release Payment.
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">
                          Job ID: #{booking.id.slice(-6).toUpperCase()} • Amount: {formatCurrency(booking.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {!isPaymentDetailsSubmitted && (
                      <div className="text-[9px] text-brand-amber/95 font-black uppercase tracking-widest bg-brand-amber/5 border border-brand-amber/10 rounded-2xl p-3.5 text-center leading-relaxed">
                        ⚠️ Please submit your Transaction ID and Gateway Screenshot above to unlock this button.
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/booking-status/${booking.id}`)}
                        className="flex-1 bg-brand-surface hover:bg-brand-surface/80 text-cream font-bold py-3 px-4 rounded-2xl border border-white/5 text-xs uppercase tracking-wider text-center transition-all"
                      >
                        Review Job
                      </button>
                      <button
                        onClick={() => handleRelease(booking)}
                        disabled={!isPaymentDetailsSubmitted || isReleasing}
                        title={!isPaymentDetailsSubmitted ? "Please submit your Transaction ID and Gateway Screenshot above to unlock this button." : undefined}
                        className={cn(
                          "flex-1 font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
                          isPaymentDetailsSubmitted 
                            ? "bg-brand-amber hover:bg-brand-amber/90 text-brand-dark shadow-xl shadow-brand-amber/20 active:scale-[0.98]" 
                            : "bg-slate-700/50 text-slate-400 opacity-40 cursor-not-allowed"
                        )}
                      >
                        {isReleasing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Release Payment"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          );
        })()}
      </AnimatePresence>
      </div>
    </div>
  );
};
