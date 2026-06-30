import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  limit, 
  doc, 
  updateDoc, 
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Bell, 
  ShoppingBag, 
  Package, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronLeft,
  X,
  MessageSquare,
  ShieldCheck,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import toast from 'react-hot-toast';

export const ShopNotifications: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const markAllAsRead = async () => {
    if (!profile?.uid) return;
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadNotifications.forEach(n => {
        const ref = doc(db, 'notifications', n.id!);
        batch.update(ref, { read: true });
      });
      await batch.commit();
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const ref = doc(db, 'notifications', id);
      await updateDoc(ref, { read: true });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking': return { icon: ShoppingBag, color: 'bg-primary-blue text-cream shadow-lg' };
      case 'payment': return { icon: Wallet, color: 'bg-green-500 text-cream shadow-lg' };
      case 'status': return { icon: CheckCircle2, color: 'bg-action-orange text-cream shadow-lg' };
      case 'chat': return { icon: MessageSquare, color: 'bg-purple-500 text-cream shadow-lg' };
      case 'system': return { icon: ShieldCheck, color: 'bg-brand-dark text-cream shadow-lg' };
      default: return { icon: Bell, color: 'bg-slate-100 text-gray-teal' };
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="px-4 pt-6 space-y-1">
        <div className="flex items-center justify-between">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-teal hover:text-slate-600 transition-colors">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button onClick={markAllAsRead} className="text-[10px] font-black text-primary-blue uppercase tracking-widest">Mark all as read</button>
        </div>
        <h2 className="text-3xl font-black text-cream dark:text-cream uppercase tracking-tight">Activities</h2>
        <p className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest mt-1 leading-none">Notifications for your shop</p>
      </div>

      <div className="px-4 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-brand-slate dark:bg-brand-dark rounded-[32px] animate-pulse" />
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-32 space-y-4">
            <div className="w-24 h-24 bg-slate-50 dark:bg-brand-dark rounded-full flex items-center justify-center mx-auto text-cream dark:text-cream">
              <Bell className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-black text-cream dark:text-cream uppercase tracking-tight">Silence in Store</h3>
            <p className="text-gray-teal text-xs font-medium max-w-[200px] mx-auto leading-relaxed">No new alerts yet. We'll notify you when customer activity happens.</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((n) => {
              const { icon: Icon, color } = getIcon(n.type);
              return (
                <motion.div 
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-brand-slate dark:bg-brand-dark rounded-[32px] p-6 border-2 transition-all flex items-start gap-4 group relative overflow-hidden ${n.read ? 'border-slate-50 dark:border-slate-800' : 'border-primary-blue/10 bg-primary-blue/5'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 space-y-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-black uppercase tracking-tight truncate ${n.read ? 'text-slate-700 dark:text-cream' : 'text-cream dark:text-cream'}`}>
                        {n.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[8px] font-black text-gray-teal uppercase tracking-widest shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{n.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${n.read ? 'text-gray-teal font-medium' : 'text-slate-700 dark:text-cream font-bold'}`}>
                      {n.message}
                    </p>
                  </div>

                  <button 
                    onClick={() => deleteNotification(n.id!)}
                    className="absolute top-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 transition-all text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
