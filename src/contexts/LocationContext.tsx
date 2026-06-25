import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface LocationContextType {
  location: Location | null;
  status: 'prompt' | 'denied' | 'granted' | 'checking';
  error: string | null;
  requestLocation: () => void;
  hasActiveTracking: boolean;
  setManualHighFrequency: (enabled: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isCustomer, isProvider, isShopOwner } = useAuth();
  const [location, setLocation] = useState<Location | null>(null);
  const [status, setStatus] = useState<'prompt' | 'denied' | 'granted' | 'checking'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [hasActiveTracking, setHasActiveTracking] = useState(false);
  const [manualHighFrequency, setManualHighFrequency] = useState(false);

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const lastUpdateRef = useRef(0);

  // Keep manual frequency and active state ref current to avoid state closure issues in timers/handlers
  const hasActiveTrackingRef = useRef(false);
  useEffect(() => {
    hasActiveTrackingRef.current = hasActiveTracking;
  }, [hasActiveTracking]);

  // Subscription for active booking / order detection
  useEffect(() => {
    if (!user?.uid) {
      setHasActiveTracking(false);
      return;
    }

    try {
      const qCustomerBookings = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', 'in', ['accepted', 'ongoing'])
      );

      const qProviderBookings = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid),
        where('status', 'in', ['accepted', 'ongoing'])
      );

      const qCustomerOrders = query(
        collection(db, 'orders'),
        where('customerId', '==', user.uid),
        where('status', 'in', ['pending', 'processing', 'shipped'])
      );

      const qMerchantOrders = query(
        collection(db, 'orders'),
        where('shopId', '==', user.uid),
        where('status', 'in', ['pending', 'processing', 'shipped'])
      );

      let activeB1 = false;
      let activeB2 = false;
      let activeO1 = false;
      let activeO2 = false;

      const updateActiveState = () => {
        setHasActiveTracking(activeB1 || activeB2 || activeO1 || activeO2 || manualHighFrequency);
      };

      let unsubB1, unsubB2, unsubO1, unsubO2;

      if (isCustomer) {
        unsubB1 = onSnapshot(qCustomerBookings, (snap) => {
          activeB1 = !snap.empty;
          updateActiveState();
        }, (err) => console.warn('LocationContext b1 error:', err));

        unsubO1 = onSnapshot(qCustomerOrders, (snap) => {
          activeO1 = !snap.empty;
          updateActiveState();
        }, (err) => console.warn('LocationContext o1 error:', err));
      }

      if (isProvider) {
        unsubB2 = onSnapshot(qProviderBookings, (snap) => {
          activeB2 = !snap.empty;
          updateActiveState();
        }, (err) => console.warn('LocationContext b2 error:', err));
      }

      if (isShopOwner) {
        unsubO2 = onSnapshot(qMerchantOrders, (snap) => {
          activeO2 = !snap.empty;
          updateActiveState();
        }, (err) => console.warn('LocationContext o2 error:', err));
      }

      return () => {
        unsubB1?.();
        unsubB2?.();
        unsubO1?.();
        unsubO2?.();
      };
    } catch (err) {
      console.warn('Real-time tracking subscription failed:', err);
    }
  }, [user?.uid, manualHighFrequency, isCustomer, isProvider, isShopOwner]);

  const updateProfileLocation = async (lat: number, lng: number) => {
    // Only update if logged in, profile is loaded, and onboarding is done
    const currentProfile = profileRef.current as any;
    if (!user?.uid || !currentProfile || !currentProfile.onboardingComplete) return;

    // Rate limit updates based on tracking state (High frequency: 3 seconds, normal: 120 seconds)
    const now = Date.now();
    const intervalThreshold = hasActiveTrackingRef.current ? 3000 : 120000;
    if (lastUpdateRef.current && (now - lastUpdateRef.current < intervalThreshold)) {
      return;
    }

    try {
      // Robust collection detection
      let collectionName = currentProfile._collection;
      
      if (!collectionName) {
        if (currentProfile.role === 'provider' || 'providerType' in currentProfile) collectionName = 'providers';
        else if (currentProfile.role === 'shop_owner' || 'shopName' in currentProfile) collectionName = 'shops';
        else collectionName = 'users'; 
      }
      
      const validCollections = ['users', 'providers', 'shops'];
      if (!validCollections.includes(collectionName)) return;

      const userRef = doc(db, collectionName, user.uid);

      // Perform Nominatim reverse-geocoding to get the exact localized local Bangladeshi address string
      let localizedAddress = '';
      try {
        const geoResponse = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData && geoData.display_name) {
            localizedAddress = geoData.display_name;
          }
        }
      } catch (geoErr) {
        console.warn('Nominatim reverse-geocoding failed, continuing anyway:', geoErr);
      }
      
      const profileUpdates: any = {
        location: { lat, lng },
        lastLocationUpdate: serverTimestamp()
      };

      if (localizedAddress) {
        if (collectionName === 'shops') {
          profileUpdates.shopAddress = localizedAddress;
        } else {
          profileUpdates.address = localizedAddress;
        }
      }

      await setDoc(userRef, profileUpdates, { merge: true });

      // If the user is an active provider, write coordinates to active booking documents in real-time
      if (currentProfile.role === 'provider' || collectionName === 'providers') {
        const qOngoing = query(
          collection(db, 'bookings'),
          where('providerId', '==', user.uid),
          where('status', 'in', ['accepted', 'ongoing'])
        );
        const ongoingSnap = await getDocs(qOngoing);
        if (!ongoingSnap.empty) {
          const batchPromises = ongoingSnap.docs.map((bookingDoc) => {
            const bookingDocRef = doc(db, 'bookings', bookingDoc.id);
            const bookingUpdates: any = {
              providerLocation: { lat, lng },
              providerLastUpdated: serverTimestamp()
            };
            if (localizedAddress) {
              bookingUpdates.providerAddress = localizedAddress;
            }
            return setDoc(bookingDocRef, bookingUpdates, { merge: true });
          });
          await Promise.all(batchPromises);
          console.log(`Updated provider location coordinates/address in ${ongoingSnap.size} bookings`);
        }
      }

      lastUpdateRef.current = now;
      console.log(`Successfully updated location in ${collectionName}:`, { lat, lng, localizedAddress });
    } catch (err: any) {
      // If we get a permission error, it's likely the Firestore rules haven't been deployed
      // properly or are currently restrictive. We'll log more detail but not crash.
      console.warn('Profile location update skipped:', err.message);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setStatus('denied');
      return;
    }

    setStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });
        setStatus('granted');
        updateProfileLocation(latitude, longitude);
      },
      (err) => {
        setStatus('denied');
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    let watchId: number;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({ lat: latitude, lng: longitude, accuracy });
          setStatus('granted');
          updateProfileLocation(latitude, longitude);
        },
        (err) => {
          // Only set error if we don't have a location yet or if it's a permanent denial
          if (err.code === 1) { // PERMISSION_DENIED
            setStatus('denied');
            setError('Location permission denied');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    // Check permissions API
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          setStatus('granted');
        } else if (result.state === 'prompt') {
          setStatus('prompt');
        } else {
          setStatus('denied');
        }

        result.onchange = () => {
          if (result.state === 'granted') {
            setStatus('granted');
          } else if (result.state === 'prompt') {
            setStatus('prompt');
          } else {
            setStatus('denied');
          }
        };
      });
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user?.uid, profile?.role]);

  return (
    <LocationContext.Provider value={{ 
      location, 
      status, 
      error, 
      requestLocation,
      hasActiveTracking,
      setManualHighFrequency
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
