import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Bell, Calendar, CreditCard, MessageCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Notification } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export const CustomerNotifications: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      // Client-side sorting
      data.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5 text-primary-blue" />;
      case 'payment': return <CreditCard className="w-5 h-5 text-primary-blue" />;
      case 'chat': return <MessageCircle className="w-5 h-5 text-action-orange" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      <nav className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 flex items-center px-4 gap-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="font-bold text-slate-800 dark:text-white">Notifications</h1>
      </nav>

      <div className="p-4 space-y-4">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 animate-pulse" />
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl opacity-20">🔔</div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">No notifications</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">We'll notify you when something happens.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <motion.div 
              key={notif.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => markAsRead(notif.id)}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 relative transition-all ${!notif.read ? 'border-primary-blue/30 bg-primary-blue/5' : ''}`}
            >
              {!notif.read && (
                <div className="absolute top-5 right-5 w-2 h-2 bg-primary-blue rounded-full" />
              )}
              
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 space-y-1">
                <h4 className={`text-sm font-bold ${!notif.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{notif.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{notif.body || notif.message}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pt-1">
                  {notif.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
