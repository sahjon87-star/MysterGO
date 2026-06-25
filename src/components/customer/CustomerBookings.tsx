import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Calendar, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Booking, Order } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { TrackingMap } from '../shared/TrackingMap';

const ShopOrderCard: React.FC<{ order: Order; customerLoc: [number, number] }> = ({ order, customerLoc }) => {
  const [expanded, setExpanded] = useState(false);
  const [shopLoc, setShopLoc] = useState<[number, number] | null>(null);
  const [deliveryLoc, setDeliveryLoc] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!order.id || !order.shopId || !expanded) return;
    const unsubShop = onSnapshot(doc(db, 'shops', order.shopId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.location?.lat && data.location?.lng) {
          setShopLoc([data.location.lat, data.location.lng]);
        }
      }
    });
    return () => unsubShop();
  }, [order.shopId, expanded]);

  useEffect(() => {
    if (order.status !== 'shipped' || !shopLoc || !expanded) {
      setDeliveryLoc(null);
      return;
    }

    setDeliveryLoc(shopLoc);

    const startLat = shopLoc[0];
    const startLng = shopLoc[1];
    const endLat = customerLoc[0];
    const endLng = customerLoc[1];

    const duration = 60000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const latOffset = Math.sin(progress * Math.PI) * 0.0008;
      const lngOffset = Math.cos(progress * Math.PI) * 0.0008;

      const currentLat = startLat + (endLat - startLat) * progress + latOffset;
      const currentLng = startLng + (endLng - startLng) * progress + lngOffset;

      setDeliveryLoc([currentLat, currentLng]);

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order.status, shopLoc, expanded, customerLoc]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-sm">
          {getInitials(order.shopName)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 dark:text-white truncate">{order.productName || (order.items && order.items[0]?.name) || 'Product'}</h3>
          <p className="text-slate-400 dark:text-[10px] dark:text-slate-500 font-bold uppercase tracking-wider">{order.shopName}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          order.status === 'delivered' ? 'bg-primary-blue/10 text-primary-blue' :
          order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
          'bg-primary-blue/10 dark:bg-primary-blue/20 text-primary-blue dark:text-primary-blue'
        }`}>
          {order.status}
        </div>
      </div>

      {expanded && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden space-y-3 pt-2"
        >
          <div className="text-[10px] font-black text-gray-teal uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-Time Delivery Dispatch Map
          </div>
          <TrackingMap 
            userRole="customer"
            customerLocation={customerLoc}
            shopLocation={shopLoc}
            deliveryLocation={deliveryLoc}
            height="260px"
            statusInfo={order.status === 'shipped' ? 'Courier Out for Delivery' : 'Preparing Order'}
          />
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-4">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest">
          {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          {['processing', 'shipped', 'delivered'].includes(order.status) && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="px-4 py-2 border border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer"
            >
              {expanded ? 'Hide Map' : 'Track Delivery'}
            </button>
          )}
          <div className="text-primary-blue font-black text-sm">{formatCurrency(order.totalAmount)}</div>
        </div>
      </div>
    </motion.div>
  );
};

export const CustomerBookings: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [shopOrders, setShopOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled' | 'shop'>('active');

  const customerLoc: [number, number] = (profile?.location?.lat && profile?.location?.lng)
    ? [profile.location.lat, profile.location.lng]
    : [23.8103, 90.4125];

  useEffect(() => {
    if (!profile) return;
    
    // Listen for bookings
    const qBookings = query(
      collection(db, 'bookings'),
      where('customerId', '==', profile.uid)
    );

    const unsubBookings = onSnapshot(qBookings, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    // Listen for shop orders
    const qOrders = query(
      collection(db, 'orders'),
      where('customerId', '==', profile.uid)
    );

    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setShopOrders(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => {
      unsubBookings();
      unsubOrders();
    };
  }, [profile]);

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'active') return ['pending', 'accepted', 'ongoing'].includes(b.status);
    return b.status === activeTab;
  });

  return (
    <div className="space-y-6">
      <div className="px-4 pt-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">My Bookings</h2>
      </div>

      <div className="px-4">
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
          {([
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'shop', label: 'Shop Orders' },
          ] as const).map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-blue text-white shadow-md shadow-primary-blue/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 animate-pulse" />
          ))
        ) : activeTab === 'shop' ? (
          shopOrders.length === 0 ? (
            <div className="text-center py-20 space-y-4 col-span-full">
              <div className="text-6xl opacity-20">🛍️</div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">No shop orders</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">You haven't ordered any products yet.</p>
            </div>
          ) : (
            shopOrders.map((order) => (
              <ShopOrderCard key={order.id} order={order} customerLoc={customerLoc} />
            ))
          )
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 space-y-4 col-span-full">
            <div className="text-6xl opacity-20">📋</div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">No bookings found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">You don't have any {activeTab} bookings.</p>
            {activeTab === 'active' && (
              <button 
                onClick={() => navigate('/search')}
                className="bg-primary-blue text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary-blue/20 active:scale-95 transition-all"
              >
                Book a Service
              </button>
            )}
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <motion.div 
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/booking-status/${booking.id}`)}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary-blue/30 dark:hover:border-primary-blue/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-blue/10 flex items-center justify-center text-primary-blue font-bold text-sm">
                  {getInitials(booking.providerName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-primary-blue dark:group-hover:text-primary-blue transition-colors truncate">{booking.providerName}</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">{booking.service}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  booking.status === 'completed' ? 'bg-primary-blue/10 text-primary-blue' :
                  booking.status === 'cancelled' ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                  'bg-action-orange/10 dark:bg-action-orange/20 text-action-orange dark:text-action-orange'
                }`}>
                  {booking.status}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">{booking.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">{booking.time}</span>
                  </div>
                </div>
                <div className="text-primary-blue font-black text-sm">{formatCurrency(booking.totalAmount)}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
