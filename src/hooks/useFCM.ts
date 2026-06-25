import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, firebaseConfig } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, query, where, collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const VAPID_KEY = "BJ9d7iomVPfSVs-o5uu2h3FF84bW2XHUYT7hM_5PpoUY3I4O9bmOOerNR7ZkSq92tuYGyC2pMcQMAFpzXziBfmg";

export const useFCM = () => {
  const [token, setToken] = useState<string | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    // 1. Explicitly register FCM Service Worker for maximum reliability on Cloud Run domains
    if ('serviceWorker' in navigator) {
      const qs = new URLSearchParams(firebaseConfig as any).toString();
      navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs}`)
        .then((registration) => {
          console.log('MistriGO Service Worker registered successfully under scope:', registration.scope);
        })
        .catch((err) => {
          console.warn('MistriGO Service Worker registration failed:', err);
        });
    }
  }, []);

  useEffect(() => {
    const requestPermission = async () => {
      if (!messaging) return;

      try {
        if (typeof window === 'undefined' || !('Notification' in window)) {
          return;
        }

        let existingPermission: NotificationPermission = 'default';
        try {
          existingPermission = Notification.permission;
        } catch (e) {
          // If browser context blocks reading permission, exit silently
          return;
        }

        // 1. Immediate exit on 'denied' (Remain completely silent, no console warn spam)
        if (existingPermission === 'denied') {
          return;
        }

        // 2. Silent Bypass: Only prompt if 'default' (user hasn't decided yet).
        // If it's already 'granted', skip prompt and proceed to get token.
        let permission: NotificationPermission = existingPermission;
        if (existingPermission === 'default') {
          try {
            permission = await Notification.requestPermission();
          } catch (e) {
            // Silently fallback if iframe sandboxing blocks Permission Prompting
            return;
          }
        }

        if (permission === 'granted') {
          // Pass the registered service worker explicitly to getToken if possible, or let it fallback
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (currentToken) {
            setToken(currentToken);
            console.log('Generated local FCM token:', currentToken);
            
            // Update user/provider profile with FCM token if logged in
            if (user) {
              let collectionName = 'users';
              if (profile) {
                if (profile.role === 'provider') {
                  collectionName = 'providers';
                } else if (profile.role === 'shop_owner') {
                  collectionName = 'shops';
                }
              } else {
                // Read from cached localStorage profile if Firestore Context profile is still initializing
                const profileStr = localStorage.getItem('mistrigo_profile');
                if (profileStr) {
                  try {
                    const p = JSON.parse(profileStr);
                    if (p.role === 'provider') {
                      collectionName = 'providers';
                    } else if (p.role === 'shop_owner') {
                      collectionName = 'shops';
                    }
                  } catch (e) {
                    console.debug('FCM profile parse fallback error:', e);
                  }
                }
              }

              const userRef = doc(db, collectionName, user.uid);
              console.log(`FCM sync: writing token to collection "${collectionName}" under document "${user.uid}"`);
              
              await setDoc(userRef, {
                fcmToken: currentToken,
                fcmTokenLastUpdated: serverTimestamp(),
                updatedAt: serverTimestamp()
              }, { merge: true })
              .then(() => {
                console.log('Successfully saved FCM token to Firestore!');
              })
              .catch(err => {
                console.warn('Could not update FCM token in Firestore:', err.message);
              });
            }
          }
        }
      } catch (err) {
        // Fallback catch, log minimally to avoid floods
        console.warn('Silent FCM bypass handler warning:', err);
      }
    };

    requestPermission();

  }, [user, profile]);

  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received: ', payload);
        // User requested: "These messages should not be displayed. Find a solution and ensure the notification box is the only place they appear."
        // We removed the toast.success from here.
      });
      return () => unsubscribe();
    }
  }, []);

  // Listen to the Firestore notifications collection in real-time
  // to ensure instant push-like behavior on all active and background mobile and desktop browsers
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          console.log('Real-time query notification detected:', data);

          // 1. User requested not to show foreground toasts for notifications
          // toast.success(`${data.title}: ${data.body}`, { ... });

          // 2. Dispatch a physical browser notification for background browsers
          let canNotify = false;
          try {
            canNotify = 'Notification' in window && Notification.permission === 'granted';
          } catch (e) {
            console.debug('Could not query notification permission in this sandbox environment:', e);
          }
          if (canNotify) {
            try {
              new Notification(data.title, {
                body: data.body,
                icon: '/logo.png',
                tag: change.doc.id,
              });
            } catch (err) {
              console.warn('Native notification instantiation failed: ', err);
            }
          }
        }
      });
    }, (error) => {
      console.warn('Firestore real-time notifications listener error:', error);
    });

    return () => unsubscribe();
  }, [user]);

  return { token };
};
