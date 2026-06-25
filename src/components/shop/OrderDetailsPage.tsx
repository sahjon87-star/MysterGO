import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp, runTransaction, collection, addDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  ChevronLeft, 
  MoreHorizontal,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Package,
  Calendar,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() } as Order);
      } else {
        toast.error('Order not found');
        navigate('/merchant/orders');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `order/${orderId}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  const updateStatus = async (newStatus: Order['status']) => {
    if (!order) return;
    setUpdating(true);
    try {
      if (newStatus === 'delivered') {
        const token = await auth.currentUser?.getIdToken();
        let success = false;
        try {
          const response = await fetch('/api/orders/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              orderId: order.id,
              shopId: order.shopId,
            }),
          });

          const data = await response.json();
          if (response.ok) {
            success = true;
            toast.success('Order delivered! Revenue added to wallet.');
          } else {
            console.warn("Server-side complete-order failed, trying client-side fallback. Error:", data.error);
          }
        } catch (apiErr) {
          console.warn("API call failed, trying client-side fallback:", apiErr);
        }

        if (!success) {
          const orderRef = doc(db, "orders", order.id!);
          const shopRef = doc(db, "shops", order.shopId);
          const txRef = doc(collection(db, "transactions"));
          const notifyRef = doc(collection(db, "notifications"));

          const earning = order.totalAmount || 0;

          await runTransaction(db, async (transaction) => {
            const orderSnap = await transaction.get(orderRef);
            const shopSnap = await transaction.get(shopRef);

            if (!orderSnap.exists()) {
              throw new Error("Order not found");
            }
            if (!shopSnap.exists()) {
              throw new Error("Shop not found");
            }

            const orderData = orderSnap.data();
            if (orderData.status === "delivered") {
              throw new Error("Order is already delivered");
            }

            transaction.update(orderRef, {
              status: "delivered",
              deliveredAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            transaction.update(shopRef, {
              walletBalance: increment(earning),
              totalEarnings: increment(earning)
            });

            transaction.set(txRef, {
              userId: order.shopId,
              userName: shopSnap.data()?.name || "Material Shop",
              amount: earning,
              type: "credit",
              description: `Order Delivered: ${order.id}`,
              status: "approved",
              bookingId: order.id,
              userCollection: "shops",
              createdAt: serverTimestamp()
            });

            if (order.customerId) {
              transaction.set(notifyRef, {
                userId: order.customerId,
                title: "অর্ডার ডেলিভারি সম্পন্ন! 📦",
                body: `আপনার অর্ডার #${order.id} সফলভাবে ডেলিভারি করা হয়েছে।`,
                read: false,
                type: "order_delivered",
                createdAt: serverTimestamp()
              });
            }
          });

          toast.success('Order delivered! Revenue added to wallet.');
        }
      } else {
        await updateDoc(doc(db, 'orders', order.id!), {
          status: newStatus,
          updatedAt: serverTimestamp(),
          [`${newStatus}At`]: serverTimestamp(),
        });
        toast.success(`Order status: ${newStatus}`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary-blue" />
    </div>
  );

  if (!order) return null;

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <div className="flex items-center gap-2">
           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
            order.status === 'pending' ? 'bg-action-orange/10 text-action-orange' :
            order.status === 'processing' ? 'bg-primary-blue/10 text-primary-blue' :
            order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
            'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {order.status}
          </span>
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Customer Area */}
      <div className="px-4">
         <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-5">
               <div className="w-20 h-20 bg-primary-blue/10 rounded-[30px] flex items-center justify-center text-primary-blue font-black text-2xl border-4 border-white dark:border-slate-800 shadow-lg">
                  {getInitials(order.customerName)}
               </div>
               <div className="flex-1 space-y-1">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{order.customerName}</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordered today at 2:30 PM</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <button 
                onClick={() => window.open(`tel:${order.customerPhone}`)} 
                className="flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 active:scale-95"
              >
                <Phone className="w-4 h-4" />
                Call Customer
              </button>
               <button 
                onClick={() => navigate(`/chat/${order.customerId}`)} 
                className="flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
            </div>
         </div>
      </div>

      {/* Order Content */}
      <div className="px-4 space-y-8">
         <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Cart Information</h3>
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
               <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {order.items.map((item, i) => (
                    <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                             <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                          </div>
                          <div>
                             <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{item.name}</h5>
                             <p className="text-[9px] font-bold text-slate-400 mt-0.5">Quantity: <span className="text-primary-blue">{item.quantity}</span></p>
                          </div>
                       </div>
                       <div className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(item.price * item.quantity)}</div>
                    </div>
                  ))}
               </div>

               <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Subtotal</span>
                     <span>{formatCurrency(order.totalAmount - 50)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Delivery Fee</span>
                     <span>৳50.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                     <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Grand Total</span>
                     <span className="text-xl font-black text-primary-blue tracking-tighter">{formatCurrency(order.totalAmount)}</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Delivery Route</h3>
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
               <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 shrink-0 border border-slate-100 dark:border-slate-700 shadow-inner">
                     <MapPin className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Drop-off Address</p>
                     <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed pr-6">{order.customerAddress}</p>
                  </div>
               </div>

               <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-[24px] border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                     <Truck className="w-5 h-5 text-primary-blue" />
                     <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase leading-none">Standard Shipping</p>
                        <p className="text-[9px] font-medium text-slate-400">Within Dhaka Metro</p>
                     </div>
                  </div>
                  <span className="text-[10px] font-black text-primary-blue uppercase tracking-widest">LIVE TRACKING</span>
               </div>
            </div>
         </div>
      </div>

       {/* Floating Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-40">
        <div className="flex gap-3">
          {order.status === 'pending' && (
            <>
               <button 
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="flex-1 py-5 rounded-[24px] bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest border-2 border-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject
              </button>
               <button 
                onClick={() => updateStatus('processing')}
                disabled={updating}
                className="flex-[2] py-5 bg-primary-blue text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-blue/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Process Order
              </button>
            </>
          )}

          {order.status === 'processing' && (
            <button 
              onClick={() => updateStatus('shipped')}
              disabled={updating}
              className="w-full py-5 bg-slate-900 dark:bg-primary-blue text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Out for Delivery
            </button>
          )}

          {order.status === 'shipped' && (
            <button 
              onClick={() => updateStatus('delivered')}
              disabled={updating}
              className="w-full py-5 bg-green-500 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Delivered
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
