import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const notificationService = {
  notifyUser: async (userId: string, title: string, body: string, type: string = 'info', data: any = {}) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        body,
        type,
        data,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Notification failed:', err);
    }
  },
  notifyAdmin: async (title: string, body: string, type: string = 'system', data: any = {}) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin', // Global admin channel
        title,
        body,
        type,
        data,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Admin Notification failed:', err);
    }
  },
};
