import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, doc, setDoc, serverTimestamp, where, updateDoc, increment, addDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { User, Camera, Wrench, UserPlus, Store, MapPin, CheckCircle2, Clock, Briefcase, ShieldCheck, Loader2 } from 'lucide-react';
import { uploadImage } from '../../services/imgbb';
import { Category, UserRole, JobType } from '../../types';

export const OnboardingPage: React.FC = () => {
  const { profile: authProfile, user, updateProfile } = useAuth();
  const profile = authProfile as any;
  const { t, setLang, lang } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.onboardingComplete) {
      navigate('/', { replace: true });
      return;
    }
    if (profile && step === 0) {
      // If we have a profile, we should at least be at step 1
      // but only if we are currently at 0 (to avoid jumping while user is navigating)
      setStep(1);
    }
  }, [profile]);
  
  // Form state
  const isWhitelistedAdmin = false;
  const [role, setRole] = useState<UserRole>(profile?.role || 'customer');
  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || user?.photoURL || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [preferredJobType, setPreferredJobType] = useState<JobType>('standard');
  const [hourlyRate, setHourlyRate] = useState('500');
  const [dailyRate, setDailyRate] = useState('2000');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [referralInput, setReferralInput] = useState(profile?.referredBy || '');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [adminSettings, setAdminSettings] = useState({
    referralRewardAmount: 20,
    isReferralEnabled: true
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { getDoc, getDocs, collection, doc } = await import('firebase/firestore');
        
        const fetchCategories = async () => {
          try {
            const snap = await getDocs(collection(db, 'categories'));
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          } catch (e) {
            console.warn('Could not fetch categories:', e);
            return [];
          }
        };

        const fetchSettings = async () => {
          try {
            const snap = await getDoc(doc(db, 'settings', 'system_config'));
            if (snap.exists()) {
              const data = snap.data();
              return {
                referralRewardAmount: data.referralRewardAmount ?? 20,
                isReferralEnabled: data.isReferralEnabled !== false
              };
            }
          } catch (e) {
            console.warn('Could not fetch settings:', e);
          }
          return { referralRewardAmount: 20, isReferralEnabled: true };
        };

        const [catData, settingsData] = await Promise.all([
          fetchCategories(),
          fetchSettings()
        ]);
        
        setCategories(catData);
        setAdminSettings(settingsData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitialData();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, `avatar_${user?.uid}`, 400);
      setPhotoURL(url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    if (role === 'provider' && !selectedCategory) {
      alert('Please select a category');
      return;
    }
    if (role === 'shop_owner' && (!shopName || !shopAddress || !selectedCategory)) {
      alert('Please fill in all shop details');
      return;
    }
    setLoading(true);
    try {
      const collectionName = profile?._collection || (role === 'admin' || role === 'customer' ? 'users' : role === 'provider' ? 'providers' : 'shops');
      const baseData: any = {
        uid: user.uid,
        name,
        email: user.email,
        phone,
        photoURL,
        role,
        onboardingComplete: true,
        preferredLanguage: lang,
        updatedAt: serverTimestamp(),
      };

      if (!profile) {
        baseData.createdAt = serverTimestamp();
        baseData.isBlocked = false;
        baseData.walletBalance = 0;
        baseData.referralCode = 'MGO-' + user.uid.slice(0, 6).toUpperCase();
      }

      if (role === 'provider') {
        const category = categories.find(c => c.id === selectedCategory);
        baseData.category = selectedCategory;
        baseData.skill = category ? (lang === 'bn' ? category.name_bn : category.name_en) : '';
        baseData.preferredJobType = preferredJobType;
        baseData.hourlyRate = parseFloat(hourlyRate);
        baseData.dailyRate = parseFloat(dailyRate);
        
        if (!profile) {
          baseData.providerType = 'worker';
          baseData.experience = 0;
          baseData.bio = '';
          baseData.isOnline = false;
          baseData.isVerified = false;
          baseData.kycStatus = 'none';
          baseData.rating = 0;
          baseData.totalJobs = 0;
          baseData.totalEarnings = 0;
        }
      }

      if (role === 'shop_owner') {
        baseData.shopName = shopName;
        baseData.shopAddress = shopAddress;
        baseData.shopCategory = selectedCategory;
        
        if (!profile) {
          baseData.isVerified = false;
          baseData.kycStatus = 'none';
          baseData.rating = 0;
          baseData.totalSales = 0;
        }
      }

      if (location) {
        baseData.location = location;
      }

      await setDoc(doc(db, collectionName, user.uid), baseData, { merge: true });

      if (referralInput && adminSettings.isReferralEnabled) {
        const cleanCode = referralInput.trim().toUpperCase();
        if (cleanCode && (!profile || !profile.onboardingComplete)) {
          try {
            const token = await auth.currentUser?.getIdToken();
            let success = false;
            let rewardAmount = Number((adminSettings as any).referralRewardAmount || 20) || 20;

            try {
              const response = await fetch('/api/referrals/claim', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  referralCode: cleanCode,
                  newUserId: user.uid,
                  newUserRole: role,
                  newUserName: name,
                }),
              });

              const data = await response.json();
              if (response.ok) {
                success = true;
                rewardAmount = data.rewardAmount || rewardAmount;
                toast.success(`Referral code claimed! You received ৳${rewardAmount}`);
              } else {
                console.warn("Server-side referral claim failed, trying client-side fallback. Error:", data.error);
              }
            } catch (apiErr) {
              console.warn("API call failed, trying client-side fallback:", apiErr);
            }

            if (!success) {
              if (!cleanCode.startsWith("MGO-")) {
                toast.error("Invalid referral code prefix. Must start with MGO-.");
              } else {
                // Client-side transaction fallback
                const collections = ["providers", "users", "shops"];
                let referrerDoc: any = null;
                let referrerCollection = "";

                for (const coll of collections) {
                  const snap = await getDocs(query(collection(db, coll), where("referralCode", "==", cleanCode)));
                  if (!snap.empty) {
                    referrerDoc = snap.docs[0];
                    referrerCollection = coll;
                    break;
                  }
                }

                if (!referrerDoc) {
                  toast.error("Referral code not found.");
                } else if (referrerDoc.id === user.uid) {
                  toast.error("Self-referral is blocked.");
                } else {
                  // Run client-side referral reward updates
                  const referrerRef = doc(db, referrerCollection, referrerDoc.id);
                  const newUserRef = doc(db, collectionName, user.uid);
                  const refTxRef = doc(collection(db, "transactions"));
                  const newUserTxRef = doc(collection(db, "transactions"));
                  const refNotifyRef = doc(collection(db, "notifications"));
                  const newUserNotifyRef = doc(collection(db, "notifications"));

                  await runTransaction(db, async (transaction) => {
                    const referrerSnap = await transaction.get(referrerRef);
                    const newUserSnap = await transaction.get(newUserRef);

                    if (!referrerSnap.exists()) {
                      throw new Error("Referrer not found");
                    }

                    const newUserData = newUserSnap.exists() ? newUserSnap.data() : null;
                    if (newUserData && newUserData.referredBy) {
                      throw new Error("Referral already claimed.");
                    }

                    // 1. Credit Referrer
                    transaction.update(referrerRef, {
                      walletBalance: increment(rewardAmount)
                    });

                    // 2. Credit New User & Link Referral
                    transaction.update(newUserRef, {
                      walletBalance: increment(rewardAmount),
                      referredBy: referrerDoc.id,
                      referredByCollection: referrerCollection
                    });

                    // 3. Referrer Transaction Log
                    transaction.set(refTxRef, {
                      userId: referrerDoc.id,
                      userName: referrerSnap.data()?.name || "MistriGO user",
                      amount: rewardAmount,
                      type: "credit",
                      description: `Referral Bonus: ${name || "New User"}`,
                      status: "approved",
                      userCollection: referrerCollection,
                      createdAt: serverTimestamp()
                    });

                    // 4. New User Sign-up Log
                    transaction.set(newUserTxRef, {
                      userId: user.uid,
                      userName: name || "New User",
                      amount: rewardAmount,
                      type: "credit",
                      description: `Sign-up Referral Bonus (Code: ${cleanCode})`,
                      status: "approved",
                      userCollection: collectionName,
                      createdAt: serverTimestamp()
                    });

                    // 5. Referrer Notification
                    transaction.set(refNotifyRef, {
                      userId: referrerDoc.id,
                      title: "Referral Reward Received!",
                      body: `You have been credited ৳${rewardAmount} for inviting ${name || "a new user"} to MistriGO.`,
                      type: "wallet",
                      read: false,
                      createdAt: serverTimestamp()
                    });

                    // 6. New User Notification
                    transaction.set(newUserNotifyRef, {
                      userId: user.uid,
                      title: "Referral Reward Claimed!",
                      body: `Welcome to MistriGO! You received ৳${rewardAmount} sign-up bonus from code ${cleanCode}.`,
                      type: "wallet",
                      read: false,
                      createdAt: serverTimestamp()
                    });
                  });

                  toast.success(`Referral code claimed! You received ৳${rewardAmount}`);
                }
              }
            }

            // Fetch latest profile from DB to get the new walletBalance
            const userSnap = await getDoc(doc(db, collectionName, user.uid));
            if (userSnap.exists()) {
              Object.assign(baseData, userSnap.data());
            }
          } catch (err: any) {
            console.warn('Could not credit referral:', err);
            toast.error(err.message || 'Could not credit referral');
          }
        }
      }
      
      // Update local profile immediately to satisfy App.tsx ProtectedRoute check
      updateProfile(baseData);
      
      navigate('/', { replace: true });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        layout
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
      >
        <div className="flex gap-2 justify-center mb-8">
          {[0, 1, 2, 3, 4, 5, 6].map((s) => (
            <div 
              key={s}
              className={`h-1.5 w-6 rounded-full transition-all duration-500 ${step >= s ? 'bg-primary-blue' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="text-primary-blue w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Welcome to MistriGO!</h2>
                <p className="text-slate-500 text-sm mt-1">How would you like to use the app?</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setRole('customer')}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${role === 'customer' ? 'border-primary-blue bg-primary-blue/5 text-primary-blue' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'customer' ? 'bg-primary-blue text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">I am a Customer</p>
                    <p className="text-[8px] font-medium opacity-70">I want to hire services</p>
                  </div>
                </button>
                <button 
                  onClick={() => setRole('provider')}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${role === 'provider' ? 'border-primary-blue bg-primary-blue/5 text-primary-blue' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'provider' ? 'bg-primary-blue text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">I am a Provider</p>
                    <p className="text-[8px] font-medium opacity-70">I want to offer services</p>
                  </div>
                </button>
                <button 
                  onClick={() => setRole('shop_owner')}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${role === 'shop_owner' ? 'border-primary-blue bg-primary-blue/5 text-primary-blue' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'shop_owner' ? 'bg-primary-blue text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">I am a Shop Owner</p>
                    <p className="text-[8px] font-medium opacity-70">I want to sell products</p>
                  </div>
                </button>

                {role === 'admin' && (
                  <button 
                    onClick={() => setRole('admin')}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${role === 'admin' ? 'border-primary-blue bg-primary-blue/5 text-primary-blue' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role === 'admin' ? 'bg-primary-blue text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">I am an Admin</p>
                      <p className="text-[8px] font-medium opacity-70">System Administration</p>
                    </div>
                  </button>
                )}
              </div>

              <button 
                onClick={() => setStep(1)}
                className="w-full bg-primary-blue text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-blue/20 active:scale-[0.98] transition-all"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold text-slate-800">Set up your profile</h2>
              
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                    {photoURL ? (
                      <img 
                        src={photoURL} 
                        className="w-full h-full object-cover" 
                        alt="Avatar" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-primary-blue p-2 rounded-full text-white shadow-lg cursor-pointer hover:bg-primary-blue/90 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                </div>
                {uploading && <p className="text-xs text-primary-blue mt-2 font-medium animate-pulse">Uploading...</p>}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-blue outline-none"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <span className="px-3 py-3 bg-slate-100 text-slate-500 font-bold border-r border-slate-200">+880</span>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 px-4 py-3 bg-transparent text-slate-900 placeholder:text-slate-400 outline-none"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(0)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="flex-1 bg-primary-blue text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-blue/20 active:scale-[0.98] transition-all"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="text-blue-600 w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Referral Code</h2>
                <p className="text-slate-500 text-sm mt-1">Have a referral code? Enter it below to get rewards!</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-2">Referral Code (Optional)</label>
                <input 
                  type="text" 
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center tracking-widest uppercase"
                  placeholder="MGO-XXXXXX"
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-primary-blue text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-blue/20">Next</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3-language"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold text-slate-800">Choose Language</h2>
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => setLang('bn')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${lang === 'bn' ? 'border-primary-blue bg-primary-blue/5 text-primary-blue' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                >
                  <span className="font-bold text-lg">বাংলা</span>
                  {lang === 'bn' && <CheckCircle2 className="w-6 h-6 border-none" />}
                </button>
                <button 
                  onClick={() => setLang('en')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${lang === 'en' ? 'border-primary-blue bg-primary-blue/5 text-primary-blue' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                >
                  <span className="font-bold text-lg">English</span>
                  {lang === 'en' && <CheckCircle2 className="w-6 h-6 border-none" />}
                </button>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Back</button>
                <button onClick={() => setStep(4)} className="flex-1 bg-primary-blue text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-blue/20">Next</button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4-category-location"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {role === 'provider' || role === 'shop_owner' ? (
                <>
                  <h2 className="text-xl font-bold text-slate-800">
                    {role === 'provider' ? 'Select your specialty' : 'Select shop category'}
                  </h2>
                  
                  {role === 'shop_owner' && (
                    <div className="space-y-4 mb-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Shop Name</label>
                        <input 
                          type="text" 
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-blue outline-none"
                          placeholder="My Awesome Shop"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Shop Address</label>
                        <input 
                          type="text" 
                          value={shopAddress}
                          onChange={(e) => setShopAddress(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-blue outline-none"
                          placeholder="Shop Address"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto p-1">
                    {categories.length === 0 ? (
                      <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-xs font-medium italic">No categories available yet.</p>
                        <p className="text-slate-400 text-[10px] mt-1">Please contact admin or try again later.</p>
                      </div>
                    ) : (
                      categories.map((cat) => (
                        <button 
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedCategory === cat.id ? 'border-primary-blue bg-primary-blue/5' : 'border-slate-100 bg-slate-50'}`}
                        >
                          <span className="text-2xl">{cat.icon}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                            {lang === 'bn' ? cat.name_bn : cat.name_en}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep(3)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Back</button>
                    <button 
                      onClick={() => {
                        if (!selectedCategory) {
                          alert('Please select a category first');
                          return;
                        }
                        if (role === 'shop_owner' && (!shopName || !shopAddress)) {
                          alert('Please fill in all shop details');
                          return;
                        }
                        if (role === 'provider') {
                          setStep(5);
                        } else {
                          setStep(6);
                        }
                      }} 
                      className="flex-1 bg-primary-blue text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-blue/20"
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="w-20 h-20 bg-primary-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-10 h-10 text-primary-blue" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Almost there!</h2>
                  <p className="text-slate-500 text-sm">We need your location to show you the best services nearby.</p>
                  
                  <button 
                    onClick={() => {
                      setLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                          setLoading(false);
                        },
                        (err) => {
                          console.error(err);
                          setLoading(false);
                          alert('Could not get location. Please ensure GPS is on.');
                        }
                      );
                    }}
                    className={`w-full py-3 rounded-xl transition-all font-bold flex items-center justify-center gap-2 ${location ? 'bg-primary-blue/5 text-primary-blue border-2 border-primary-blue' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {location ? '✅ Location Captured' : '📍 Allow Location Access'}
                  </button>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setStep(3)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Back</button>
                    <button 
                      onClick={handleFinish}
                      disabled={loading}
                      className="flex-1 bg-action-orange text-white font-bold py-3 rounded-xl shadow-lg shadow-action-orange/20 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Let's Go! 🚀"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 5 && role === 'provider' && (
            <motion.div 
              key="step5-work-type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold text-slate-800">Work Type & Rates</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Work Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPreferredJobType('daily')}
                      className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${preferredJobType === 'daily' ? 'border-primary-blue bg-primary-blue/5 text-primary-blue' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                    >
                      Daily Wage
                    </button>
                    <button 
                      onClick={() => setPreferredJobType('contract')}
                      className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${preferredJobType === 'contract' ? 'border-primary-blue bg-primary-blue/5 text-primary-blue' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                    >
                      Contract Base
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hourly Rate (৳)</label>
                  <input 
                    type="number" 
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-blue outline-none text-sm"
                    placeholder="e.g. 500"
                  />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">How much you charge per hour</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Rate (৳)</label>
                  <input 
                    type="number" 
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-blue outline-none text-sm"
                    placeholder="e.g. 2000"
                  />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Standard rate for 8 hours of work</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(4)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Back</button>
                <button onClick={() => setStep(6)} className="flex-1 bg-primary-blue text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-blue/20">Next</button>
              </div>
            </motion.div>
          )}

          {step === 6 && (role === 'provider' || role === 'shop_owner') && (
            <motion.div 
              key="step6-location"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-primary-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-primary-blue" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Almost there!</h2>
              <p className="text-slate-500 text-sm">We need your location to show you the best services nearby.</p>
              
              <button 
                onClick={() => {
                  setLoading(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      setLoading(false);
                    },
                    (err) => {
                      console.error(err);
                      setLoading(false);
                      alert('Could not get location. Please ensure GPS is on.');
                    }
                  );
                }}
                className={`w-full py-3 rounded-xl transition-all font-bold flex items-center justify-center gap-2 ${location ? 'bg-primary-blue/5 text-primary-blue border-2 border-primary-blue' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {location ? '✅ Location Captured' : '📍 Allow Location Access'}
              </button>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(role === 'provider' ? 5 : 4)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Back</button>
                <button 
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 bg-action-orange text-white font-bold py-3 rounded-xl shadow-lg shadow-action-orange/20 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Let's Go! 🚀"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
