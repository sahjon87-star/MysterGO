import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Notification } from '../../types';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  CreditCard, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

interface AdminNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  adminId: string;
}

export const AdminNotifications: React.FC<AdminNotificationsProps> = ({ isOpen, onClose, adminId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', adminId),
      limit(100) // Fetch more to allow client-side sorting/filtering
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Notification))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 20); // Keep the limit for the UI
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [adminId]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;

      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Briefcase className="w-5 h-5 text-primary-blue" />;
      case 'payment': return <CreditCard className="w-5 h-5 text-primary-blue" />;
      case 'kyc': return <ShieldCheck className="w-5 h-5 text-action-orange" />;
      case 'system': return <AlertCircle className="w-5 h-5 text-primary-blue" />;
      default: return <Bell className="w-5 h-5 text-gray-teal" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-[100]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xs bg-brand-slate dark:bg-brand-dark shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-dark dark:bg-primary-blue rounded-xl flex items-center justify-center">
                  <Bell className="text-cream w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-cream dark:text-cream tracking-tight">Notifications</h3>
                  <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">Real-time updates</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-50 dark:hover:bg-brand-surface rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-teal dark:text-gray-teal" />
              </button>
            </div>

            {/* Actions */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-brand-surface/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">
                {notifications.filter(n => !n.read).length} Unread
              </span>
              <button 
                onClick={markAllAsRead}
                className="text-[10px] font-black text-primary-blue dark:text-primary-blue uppercase tracking-widest hover:text-primary-blue/80 dark:hover:text-primary-blue/80 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-slate-50 dark:bg-brand-surface rounded-2xl animate-pulse" />
                ))
              ) : notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-brand-surface rounded-full flex items-center justify-center">
                    <Bell className="w-8 h-8 text-cream dark:text-slate-700" />
                  </div>
                  <div>
                    <h4 className="font-black text-cream dark:text-cream text-sm uppercase tracking-tight">All caught up!</h4>
                    <p className="text-[10px] font-medium text-gray-teal dark:text-gray-teal">No new notifications at the moment.</p>
                  </div>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer group relative",
                      n.read ? "bg-brand-slate dark:bg-brand-dark border-slate-100 dark:border-slate-800" : "bg-primary-blue/5 dark:bg-primary-blue/10 border-primary-blue/20 dark:border-primary-blue/30 shadow-sm"
                    )}
                    onClick={() => !n.read && markAsRead(n.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        n.read ? "bg-slate-50 dark:bg-brand-surface" : "bg-brand-slate dark:bg-brand-dark shadow-sm"
                      )}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={cn(
                          "text-xs font-black tracking-tight leading-tight",
                          n.read ? "text-slate-600 dark:text-gray-teal" : "text-cream dark:text-cream"
                        )}>
                          {n.title}
                        </h5>
                        <p className="text-[10px] text-gray-teal dark:text-gray-teal mt-1 line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                        <p className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest mt-2">
                          {n.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 bg-primary-blue rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-brand-dark dark:bg-primary-blue text-cream rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/20 dark:shadow-primary-blue/20 active:scale-95 transition-all"
              >
                Close Panel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Helper for conditional classes
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
