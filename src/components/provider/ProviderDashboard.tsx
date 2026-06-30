import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ShieldCheck, Clock, MapPin, CheckCircle2, XCircle, Zap, MessageSquare, Phone } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, increment, runTransaction } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Booking } from '../../types';
import toast from 'react-hot-toast';
import { notificationService } from '../../services/notificationService';

export const ProviderDashboard: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      // Sort by status and date
      data.sort((a, b) => {
        const order: any = { 'pending': 0, 'accepted': 1, 'ongoing': 2, 'completed': 3, 'cancelled': 4 };
        return order[a.status] - order[b.status];
      });
      setBookings(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string, customerId: string) => {
    try {
      if (newStatus === 'completed') {
        const token = await auth.currentUser?.getIdToken();
        let success = false;
        try {
          const response = await fetch('/api/jobs/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              bookingId,
              providerId: user!.uid,
            }),
          });
          const data = await response.json();
          if (response.ok) {
            success = true;
          } else if (response.status !== 501) {
            console.warn("Server-side complete-job failed, trying client-side fallback. Error:", data.error);
          }
        } catch (apiErr) {
          console.warn("API call failed, trying client-side fallback:", apiErr);
        }

        if (!success) {
          const bookingRef = doc(db, "bookings", bookingId);
          const providerRef = doc(db, "providers", user!.uid);
          const txRef = doc(collection(db, "transactions"));
          const notifyRef = doc(collection(db, "notifications"));

          const currentBooking = bookings.find(b => b.id === bookingId);
          const earning = (currentBooking as any)?.providerEarning || (currentBooking as any)?.totalAmount || (currentBooking as any)?.price || 0;

          await runTransaction(db, async (transaction) => {
            const bookingSnap = await transaction.get(bookingRef);
            const providerSnap = await transaction.get(providerRef);

            if (!bookingSnap.exists()) {
              throw new Error("Booking not found");
            }
            if (!providerSnap.exists()) {
              throw new Error("Provider not found");
            }

            const bookingData = bookingSnap.data();
            if (bookingData.status === "completed") {
              throw new Error("Booking is already completed");
            }

            transaction.update(bookingRef, {
              status: "completed",
              completedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            transaction.update(providerRef, {
              totalJobs: increment(1)
            });

            transaction.set(txRef, {
              userId: user!.uid,
              userName: providerSnap.data()?.name || "",
              amount: earning,
              type: "credit",
              description: `Job Completed: ${currentBooking?.service || "Mistri Service"}`,
              status: "pending",
              bookingId: bookingId,
              userCollection: "providers",
              createdAt: serverTimestamp()
            });

            if (customerId) {
              transaction.set(notifyRef, {
                userId: customerId,
                title: "কাজ সম্পন্ন হয়েছে! 🎉",
                body: `আপনার ${currentBooking?.service || "মিস্ত্রি"} বুকিং সফলভাবে সম্পন্ন হয়েছে।`,
                read: false,
                type: "job_completed",
                createdAt: serverTimestamp()
              });
            }
          });
        }
      } else {
        await updateDoc(doc(db, 'bookings', bookingId), {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      }

      let title = '';
      let body = '';

      if (newStatus === 'accepted') {
        title = 'Booking Accepted!';
        body = `${profile?.name} has accepted your request.`;
      } else if (newStatus === 'ongoing') {
        title = 'Job Started';
        body = `Your ${bookings.find(b => b.id === bookingId)?.service} work has begun.`;
      } else if (newStatus === 'completed') {
        title = 'Job Completed';
        body = `Success! Your work is done. Please review ${profile?.name}.`;
      }

      notificationService.notifyUser(customerId, title, body, 'booking_update', { bookingId });
      toast.success(`Protocol updated to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-amber rounded-[24px] flex items-center justify-center text-brand-dark text-2xl font-black relative group overflow-hidden shadow-2xl">
             {profile?.photoURL ? (
               <img src={profile.photoURL} className="w-full h-full object-cover" alt="" />
             ) : profile?.name?.[0]}
             <div className="absolute inset-0 bg-brand-dark/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-cream uppercase leading-none">Salam, {profile?.name}</h2>
            <div className="flex items-center gap-2 text-gray-teal text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 px-1">
              <Star size={12} className="text-brand-amber fill-current" /> {profile?.rating || 4.9} Efficiency • {profile?.totalJobs || 0} Cycles
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-black text-gray-teal uppercase tracking-widest mb-1.5 opacity-50">Pulse Status</span>
           <div className={cn(
             "px-4 py-1.5 rounded-[14px] text-[9px] font-black uppercase tracking-widest border-2 flex items-center gap-2 transition-all",
             profile?.isOnline ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-brand-surface text-gray-teal border-white/5"
           )}>
             <div className={cn("w-2 h-2 rounded-full", profile?.isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-gray-teal/30")} />
             {profile?.isOnline ? 'Active Node' : 'Stasis'}
           </div>
        </div>
      </div>

      <div className="bg-brand-slate rounded-[40px] p-8 text-cream relative overflow-hidden shadow-2xl border border-white/5 group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-brand-amber/10 blur-[100px] rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-1000" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-amber mb-2">My Wallet Balance</p>
          <div className="flex items-baseline gap-2 mb-8">
            <h3 className="text-5xl font-black tracking-tighter">{formatCurrency(profile?.walletBalance || 0)}</h3>
            <span className="text-[10px] font-black text-gray-teal uppercase tracking-widest">Available</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-brand-amber text-brand-dark px-6 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl hover:shadow-brand-amber/20">
              Withdraw
            </button>
            <button className="bg-brand-surface text-cream px-6 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all border border-white/5 hover:bg-white/10">
              Transactions
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] flex items-center gap-3">
             <div className="w-5 h-[1px] bg-brand-amber" />
             My Jobs
          </h3>
          <div className="w-8 h-8 rounded-xl bg-brand-surface flex items-center justify-center text-[10px] font-black text-brand-amber border border-white/5">
            {bookings.length}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-brand-surface rounded-[32px] animate-pulse border border-white/5" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-16 rounded-[40px] border-2 border-dashed border-white/5 text-center space-y-4 transition-colors hover:border-brand-amber/20 group">
            <Zap className="mx-auto text-gray-teal/20 group-hover:text-brand-amber/40 transition-colors" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-teal/40">Searching for operational signals...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {bookings.map((booking) => (
              <motion.div 
                key={booking.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-brand-slate rounded-[40px] p-7 border border-white/5 shadow-2xl space-y-6 relative overflow-hidden"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex gap-5">
                    <div className="w-14 h-14 bg-brand-dark rounded-[24px] flex items-center justify-center text-brand-amber font-black border border-white/5 shadow-inner">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black text-brand-amber uppercase tracking-[0.2em] mb-1">{booking.service}</h4>
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-gray-teal" />
                        <span className="text-sm font-black text-cream tracking-tight truncate max-w-[150px]">{booking.address}</span>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg border",
                    booking.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    booking.status === 'accepted' ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                    booking.status === 'ongoing' ? "bg-violet-500/10 text-violet-500 border-violet-500/20" :
                    booking.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-brand-surface text-gray-teal border-white/5"
                  )}>
                    {booking.status} status
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-5 border-y border-white/5">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest opacity-50">Scheduled Time</p>
                    <p className="text-[11px] font-bold text-cream uppercase tracking-tighter">{booking.date} • {booking.time}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest opacity-50">Earnings</p>
                    <p className="text-base font-black text-brand-amber tracking-tighter leading-none">{formatCurrency(booking.totalAmount)}</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  {booking.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(booking.id!, 'accepted', booking.customerId)}
                        className="flex-1 bg-brand-amber text-brand-dark py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all hover:shadow-brand-amber/20"
                      >
                        <CheckCircle2 size={18} /> Sync Link
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(booking.id!, 'cancelled', booking.customerId)}
                        className="w-16 h-16 bg-brand-surface border-2 border-white/5 rounded-[24px] flex items-center justify-center text-gray-teal hover:text-red-500 hover:border-red-500/20 transition-all active:scale-95 shadow-lg"
                      >
                        <XCircle size={22} />
                      </button>
                    </>
                  )}
                  {booking.status === 'accepted' && (
                    <button 
                      onClick={() => handleUpdateStatus(booking.id!, 'ongoing', booking.customerId)}
                      className="flex-1 bg-brand-amber text-brand-dark py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all"
                    >
                      <Zap size={18} /> Initiate Work
                    </button>
                  )}
                  {booking.status === 'ongoing' && (
                    <button 
                      onClick={() => handleUpdateStatus(booking.id!, 'completed', booking.customerId)}
                      className="flex-1 bg-emerald-500 text-brand-dark py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all"
                    >
                      <CheckCircle2 size={18} /> Verify completion
                    </button>
                  )}
                  {['accepted', 'ongoing'].includes(booking.status) && (
                    <>
                      <button className="w-16 h-16 bg-brand-surface border border-white/5 rounded-[24px] flex items-center justify-center text-cream shadow-lg active:scale-95 transition-all">
                        <MessageSquare size={20} />
                      </button>
                      <button className="w-16 h-16 bg-brand-surface border border-white/5 rounded-[24px] flex items-center justify-center text-cream shadow-lg active:scale-95 transition-all">
                        <Phone size={20} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
