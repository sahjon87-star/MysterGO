import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, ProviderProfile, ShopProfile, AdminProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | ProviderProfile | ShopProfile | AdminProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSubAdmin: boolean;
  isProvider: boolean;
  isShopOwner: boolean;
  isCustomer: boolean;
  updateProfile: (newData: any) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | ProviderProfile | ShopProfile | AdminProfile | null>(() => {
    const cached = localStorage.getItem('mistrigo_profile');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        localStorage.removeItem('mistrigo_profile');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (!profile) {
      setLoading(true);
    }

    const checkProfile = async () => {
      try {
        const fetchSnap = async (coll: string) => {
          try {
            return await getDoc(doc(db, coll, user.uid));
          } catch (e) {
            console.warn(`Permission denied or error fetching from ${coll}:`, e);
            return null;
          }
        };

        const [adminSnap, userSnap, providerSnap, shopSnap] = await Promise.all([
          fetchSnap('admins'),
          fetchSnap('users'),
          fetchSnap('providers'),
          fetchSnap('shops')
        ]);

        let finalAdminSnap = adminSnap;
        if (user.email === 'sahjon87@gmail.com') {
          const adminRef = doc(db, 'admins', user.uid);
          if (!adminSnap || !adminSnap.exists() || adminSnap.data()?.role !== 'super-admin') {
            console.log('Seeding or updating super-admin profile...');
            try {
              await setDoc(adminRef, {
                adminId: user.uid,
                uid: user.uid,
                email: 'sahjon87@gmail.com',
                role: 'super-admin',
                name: user.displayName || 'System Administrator',
                status: 'active',
                isOnline: true,
                currentActiveTickets: 0,
                permissions: {
                  canManageUsers: true,
                  canManageWorkers: true,
                  canViewEarnings: true,
                  canManageSupport: true,
                  canDeleteData: true
                },
                createdAt: adminSnap?.exists() ? (adminSnap.data()?.createdAt || serverTimestamp()) : serverTimestamp(),
                lastActiveAt: serverTimestamp()
              }, { merge: true });
              finalAdminSnap = await getDoc(adminRef);
            } catch (err) {
              console.error('Failed to seed super-admin profile:', err);
            }
          }
        }

        if (finalAdminSnap && finalAdminSnap.exists()) {
          const unsub = onSnapshot(doc(db, 'admins', user.uid), (snap) => {
            const profileData = { uid: snap.id, ...snap.data(), _collection: 'admins' } as AdminProfile & { _collection: string };
            setProfile(profileData);
            localStorage.setItem('mistrigo_profile', JSON.stringify(profileData));
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `admins/${user.uid}`);
            setLoading(false);
          });
          return unsub;
        }

        if (userSnap && userSnap.exists()) {
          const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            const profileData = { uid: snap.id, ...snap.data(), _collection: 'users' } as UserProfile & { _collection: string };
            setProfile(profileData);
            localStorage.setItem('mistrigo_profile', JSON.stringify(profileData));
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            setLoading(false);
          });
          return unsub;
        }

        if (providerSnap && providerSnap.exists()) {
          const unsub = onSnapshot(doc(db, 'providers', user.uid), (snap) => {
            const profileData = { uid: snap.id, ...snap.data(), _collection: 'providers' } as ProviderProfile & { _collection: string };
            setProfile(profileData);
            localStorage.setItem('mistrigo_profile', JSON.stringify(profileData));
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `providers/${user.uid}`);
            setLoading(false);
          });
          return unsub;
        }

        if (shopSnap && shopSnap.exists()) {
          const unsub = onSnapshot(doc(db, 'shops', user.uid), (snap) => {
            const profileData = { uid: snap.id, ...snap.data(), _collection: 'shops' } as ShopProfile & { _collection: string };
            setProfile(profileData);
            localStorage.setItem('mistrigo_profile', JSON.stringify(profileData));
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `shops/${user.uid}`);
            setLoading(false);
          });
          return unsub;
        }

        setProfile(null);
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        setLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    checkProfile().then(unsub => {
      if (unsub) unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const updateProfile = (newData: any) => {
    setProfile(prev => {
      const updated = prev ? { ...prev, ...newData } : (newData as any);
      localStorage.setItem('mistrigo_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const isSuperAdmin = profile?._collection === 'admins' && (profile as AdminProfile).role === 'super-admin' || user?.email === 'sahjon87@gmail.com';
  const isSubAdmin = profile?._collection === 'admins' && (profile as AdminProfile).role === 'sub-admin';
  const isAdmin = isSuperAdmin || isSubAdmin || profile?.role === 'admin';

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    isSuperAdmin,
    isSubAdmin,
    isProvider: !isAdmin && (profile?._collection === 'providers' || profile?.role === 'provider'),
    isShopOwner: !isAdmin && (profile?._collection === 'shops' || profile?.role === 'shop_owner'),
    isCustomer: !isAdmin && (profile?._collection === 'users' || profile?.role === 'customer'),
    updateProfile,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

