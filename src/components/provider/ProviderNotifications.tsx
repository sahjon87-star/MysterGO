import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  Wallet, 
  AlertCircle, 
  Trash2, 
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

export const ProviderNotifications: React.FC = () => {
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
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const ref = doc(db, 'notifications', id);
      // Simplified: Just mark as read and hide for now or implement real delete
      await updateDoc(ref, { read: true });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking': return { icon: Briefcase, color: 'bg-primary-blue text-cream shadow-lg shadow-primary-blue/20' };
      case 'payment': return { icon: Wallet, color: 'bg-green-500 text-cream shadow-lg shadow-green-500/20' };
      case 'status': return { icon: CheckCircle2, color: 'bg-action-orange text-cream shadow-lg shadow-action-orange/20' };
      case 'chat': return { icon: MessageSquare, color: 'bg-purple-500 text-cream shadow-lg shadow-purple-500/20' };
      case 'system': return { icon: ShieldCheck, color: 'bg-brand-dark text-cream shadow-lg shadow-slate-900/20' };
      default: return { icon: Bell, color: 'bg-slate-100 dark:bg-brand-surface text-gray-teal' };
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="px-4 pt-6 space-y-1">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-teal hover:text-slate-600 transition-colors">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button 
            onClick={markAllAsRead} 
            className="text-[10px] font-black text-primary-blue uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            Mark all read
          </button>
        </div>
        <h2 className="text-3xl font-black text-cream dark:text-cream uppercase tracking-tight">Activities</h2>
        <p className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest leading-none mt-1">Stay updated with your job progress</p>
      </div>

      <div className="px-4 space-y-3">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-slate-50 dark:border-slate-800 animate-pulse" />
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-32 space-y-4">
            <div className="w-24 h-24 bg-slate-50 dark:bg-brand-dark rounded-full flex items-center justify-center mx-auto text-cream dark:text-cream">
              <Bell className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-black text-cream dark:text-cream uppercase tracking-tight">No Notifications</h3>
            <p className="text-gray-teal dark:text-slate-600 text-xs font-medium max-w-[200px] mx-auto leading-relaxed">Incoming alerts and updates will appear here.</p>
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
                  className={`bg-brand-slate dark:bg-brand-dark rounded-[32px] p-6 border-2 transition-all flex items-start gap-4 group relative overflow-hidden ${n.read ? 'border-slate-50 dark:border-slate-800' : 'border-primary-blue/10 dark:border-primary-blue/20 bg-primary-blue/5'}`}
                >
                  {!n.read && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-blue" />
                  )}
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 space-y-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-black uppercase tracking-tight ${n.read ? 'text-slate-700 dark:text-cream' : 'text-cream dark:text-cream'}`}>
                        {n.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[8px] font-black text-gray-teal uppercase tracking-widest">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{n.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${n.read ? 'text-gray-teal dark:text-gray-teal font-medium' : 'text-slate-700 dark:text-cream font-bold'}`}>
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

      {notifications.length > 0 && (
         <div className="px-4 text-center pb-10">
            <p className="text-[10px] font-black text-cream dark:text-slate-600 uppercase tracking-[0.4em]">End of notifications</p>
         </div>
      )}
    </div>
  );
};
