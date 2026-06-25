import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Booking } from '../../types';
import { 
  History, Calendar, MapPin, ChevronRight, 
  Search, Clock, Hammer, AlertCircle, ShoppingBag, 
  Trash2, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/utils';

export const BookingsPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      setLoading(false);
    });

    return () => unsub();
  }, [profile?.uid]);

  const filteredBookings = bookings.filter(b => {
    if (activeFilter === 'active') return ['pending', 'accepted', 'ongoing'].includes(b.status);
    if (activeFilter === 'completed') return b.status === 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Header Visual */}
      <div className="bg-slate-900 p-8 pt-12 rounded-b-[48px] shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/20 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between text-white">
            <h1 className="text-xl font-black uppercase tracking-[0.2em]">Operational Logs</h1>
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                  activeFilter === f ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-white dark:bg-slate-900 rounded-[40px] animate-pulse" />
          ))
        ) : filteredBookings.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
              <History size={40} className="text-slate-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.4em]">No deployment history</h3>
            <p className="text-[10px] font-medium text-slate-500 uppercase mt-2">Initiate your first engagement from the port.</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-8 px-6 py-3 bg-primary-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
            >
              Access Port <Search size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking, idx) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/booking-status/${booking.id}`)}
                className="bg-white dark:bg-slate-900 rounded-[40px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 group cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                      booking.status === 'completed' ? "bg-emerald-500 shadow-emerald-500/20" :
                      booking.status === 'cancelled' ? "bg-red-500 shadow-red-500/20" :
                      "bg-primary-blue shadow-primary-blue/20"
                    )}>
                      <Hammer size={24} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-tight">
                        {booking.service}
                      </h4>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                        {booking.date} at {booking.time}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    booking.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    booking.status === 'cancelled' ? "bg-red-50 text-red-600 border-red-100 text-red-500" :
                    "bg-primary-blue/5 text-primary-blue border-primary-blue/10"
                  )}>
                    {booking.status}
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate max-w-[120px]">{booking.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{formatCurrency(booking.totalAmount)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
