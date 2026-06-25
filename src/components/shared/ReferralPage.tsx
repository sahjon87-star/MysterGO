import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  Users, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Zap,
  Clock,
  ShieldCheck,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export const ReferralPage: React.FC = () => {
  const { profile: authProfile } = useAuth();
  const profile = authProfile as any;
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [squad, setSquad] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'invite' | 'squad' | 'activity'>('invite');
  const [pendingCount, setPendingCount] = useState(0);
  const [adminSettings, setAdminSettings] = useState({
    referralRewardAmount: 20,
    isReferralEnabled: true
  });

  useEffect(() => {
    const initReferral = async () => {
      if (!profile?.uid) return;

      try {
        // 0. Fetch Admin Referral Settings (Target system_config specifically)
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const settingsSnap = await getDoc(doc(db, 'settings', 'system_config'));
          if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            setAdminSettings({
              referralRewardAmount: data.referralRewardAmount ?? 20,
              isReferralEnabled: data.isReferralEnabled !== false 
            });
          } else {
            // Document doesn't exist, keep default true
            setAdminSettings(prev => ({ ...prev, isReferralEnabled: true }));
          }
        } catch (e) {
          console.warn('Could not fetch referral settings, using defaults');
          setAdminSettings(prev => ({ ...prev, isReferralEnabled: true }));
        }

        // 1. Get or generate referral code
        let activeCode = profile.referralCode;
        if (!activeCode) {
          activeCode = 'MGO-' + profile.uid.slice(0, 6).toUpperCase();
          const coll = (profile as any)._collection || (profile.role === 'provider' ? 'providers' : profile.role === 'shop_owner' ? 'shops' : 'users');
          try {
            await updateDoc(doc(db, coll, profile.uid), {
              referralCode: activeCode
            });
          } catch (err) {
            console.warn('Could not update referral code in DB:', err);
          }
        }
        setReferralCode(activeCode);

        // 2. Fetch referral count and squad (Parallel query across collections)
        const collections = ['users', 'providers', 'shops'];
        
        console.log('Fetching referrals for:', profile.uid, activeCode);

        // Fetch Active (Referrer stores UID) and Pending (Referrer stores Code)
        const fetchCollection = async (coll: string, uidOrCode: string) => {
          try {
            return await getDocs(query(collection(db, coll), where('referredBy', '==', uidOrCode), limit(50)));
          } catch (e: any) {
            console.warn(`Permission denied fetching from ${coll} for ${uidOrCode}. This is expected if Firestore rules are not set to public list.`);
            return { docs: [], size: 0 } as any; // Return empty mock for resilience
          }
        };

        const [activeSnaps, pendingSnaps] = await Promise.all([
          Promise.all(collections.map(coll => fetchCollection(coll, profile.uid))),
          Promise.all(collections.map(coll => fetchCollection(coll, activeCode)))
        ]);
        
        const allSquad = activeSnaps.flatMap(snap => snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
        const pending = pendingSnaps.reduce((acc, snap) => acc + (snap.size || 0), 0);

        // 3. Fetch Recent Referral Activity
        try {
          const txSnap = await getDocs(query(
            collection(db, 'transactions'),
            where('userId', '==', profile.uid),
            where('description', '>=', 'Referral'),
            limit(10)
          ));
          setActivity(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.warn('Could not fetch referral activity:', e);
        }

        setReferralCount(allSquad.length);
        setPendingCount(pending);
        setSquad(allSquad.slice(0, 10)); 
      } catch (err: any) {
        console.error('Error initializing referral:', err);
        // Do not block the page, just log it
      } finally {
        setLoading(false);
      }
    };

    initReferral();
  }, [profile?.uid]); // Use UID specifically to avoid re-runs on other profile changes

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = `${window.origin}/signup?ref=${referralCode}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminSettings.isReferralEnabled && profile?.role !== 'admin' && profile?.email !== 'sahjon87@gmail.com') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[30px] flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800">
            <Gift className="w-10 h-10 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Program Paused</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-loose">
              The referral program is currently offline for maintenance. Check back soon for new rewards!
            </p>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-slate-900 dark:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
      {/* 0. Header with Back Button */}
      <div className="px-5 pt-6 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95 transition-all text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Referral</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* 1. Reward Hero Section */}
      <div className="px-5 pt-6 pb-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-[40px] p-8 text-center text-white shadow-2xl shadow-blue-500/20"
        >
          {/* Animated Background Orbs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-action-orange/20 rounded-full blur-3xl" />
          </div>

          <div className="relative space-y-6">
            <motion.div 
              initial={{ rotate: -20, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center mx-auto shadow-inner"
            >
              <Gift className="w-10 h-10 text-white drop-shadow-lg" />
            </motion.div>
            
            <div className="space-y-1">
              <h1 className="text-5xl font-black italic tracking-tighter drop-shadow-md text-white">GET ৳{adminSettings.referralRewardAmount}</h1>
              <p className="text-xl font-bold uppercase tracking-widest text-white/90">For Every Friend</p>
            </div>

            <div className="inline-flex items-center gap-2 px-6 py-2 bg-black/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 text-white">
              You Get ৳{adminSettings.referralRewardAmount} <span className="opacity-30">•</span> They Get ৳{adminSettings.referralRewardAmount}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 1.5 System Tabs */}
      <div className="px-5 mb-6">
        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          {[
            { id: 'invite', label: 'Invite', icon: Share2 },
            { id: 'squad', label: 'Squad', icon: Users },
            { id: 'activity', label: 'History', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-primary-blue text-white shadow-md shadow-primary-blue/20' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'invite' && (
          <motion.div 
            key="invite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-5 space-y-6"
          >
            {/* 2. Referral Code Section */}
            <div className="bg-white dark:bg-slate-900 rounded-[35px] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-bold text-primary-blue uppercase tracking-[0.2em]">Your Exclusive Referral Code</p>
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary-blue to-purple-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                    <div className="relative bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-5 px-8 flex items-center justify-center">
                      <span className="text-4xl font-black text-slate-800 dark:text-white tracking-[0.2em]">{referralCode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={copyToClipboard}
                    className="flex-1 bg-primary-blue text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary-blue/20"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Mistrigo Referral',
                          text: `Join me on MistriGO! Use my code ${referralCode} to get ৳${adminSettings.referralRewardAmount} off your first service.`,
                          url: shareUrl
                        });
                      }
                    }}
                    className="w-16 bg-action-orange text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-action-orange/20"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Stats Section */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Referrals', val: referralCount, icon: Users, color: 'text-primary-blue' },
                { label: 'Earned', val: `৳${referralCount * adminSettings.referralRewardAmount}`, icon: Gift, color: 'text-action-orange' },
                { label: 'Pending', val: pendingCount, icon: Clock, color: 'text-amber-500' },
              ].map((stat, i) => (
                <div 
                  key={i}
                  className="bg-white dark:bg-slate-900 p-4 rounded-3xl text-center space-y-1 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex justify-center">
                    <stat.icon className={`w-5 h-5 ${stat.color} p-1 bg-slate-50 dark:bg-slate-800 rounded-lg`} />
                  </div>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{stat.val}</p>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* 4. Mission Path */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">System Protocol</h3>
              <div className="space-y-3">
                {[
                  { title: 'Spread the word', desc: 'Blast your code to friends & family.', icon: Zap, step: '01', color: 'bg-primary-blue' },
                  { title: 'They join up', desc: 'Friends enter your code during signup.', icon: Sparkles, step: '02', color: 'bg-purple-500' },
                  { title: 'Verification', desc: 'Automatic fraud detection check.', icon: ShieldCheck, step: '03', color: 'bg-emerald-500' },
                  { title: 'Get paid', desc: 'Rewards hit your wallet instantly.', icon: Trophy, step: '04', color: 'bg-action-orange' },
                ].map((mission, i) => (
                  <div 
                    key={i} 
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl flex items-center gap-4 shadow-sm"
                  >
                    <div className={`${mission.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                      <mission.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{mission.title}</h4>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{mission.desc}</p>
                    </div>
                    <span className="text-[10px] font-black text-slate-200 dark:text-slate-700">{mission.step}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'squad' && (
          <motion.div 
            key="squad"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-5 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Active Squad</h3>
              <span className="px-2 py-1 bg-primary-blue text-white text-[8px] font-black uppercase tracking-widest rounded-full">{referralCount} Verified</span>
            </div>
            
            <div className="space-y-2">
              {squad.length > 0 ? squad.map((member, i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-sm hover:border-primary-blue/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                    {member.photoURL ? (
                      <img src={member.photoURL} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <Users className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{member.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{member.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-500/10 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-green-500" />
                    <span className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Verified</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.1em]">Squad Empty</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No friends have joined your quadrant yet</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('invite')}
                    className="px-6 py-3 bg-primary-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary-blue/20"
                  >
                    Invites & Codes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div 
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-5 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Reward Ledger</h3>
              <div className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">LIVE DATA</div>
            </div>

            <div className="space-y-3">
              {activity.length > 0 ? activity.map((tx, i) => (
                <div 
                  key={tx.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{tx.description}</h4>
                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {tx.createdAt?.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) || 'RECENT'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-500 tracking-tight">+৳{tx.amount}</p>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CREDITED</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <CreditCard className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.1em]">No Activity</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Referral rewards will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 mt-8">
        {/* 6. Legal Footer */}
        <div className="bg-action-orange/5 dark:bg-action-orange/10 p-5 rounded-3xl border border-action-orange/20 flex gap-4">
          <div className="shrink-0">
            <AlertCircle className="w-5 h-5 text-action-orange" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[9px] font-black text-action-orange uppercase tracking-widest">Protocol Rules</h4>
            <p className="text-[8px] font-bold text-action-orange/70 uppercase tracking-widest leading-relaxed">
              1. Multi-accounting results in permanent ban. <br />
              2. Rewards only valid for verified new users. <br />
              3. System reserves right to audit all referrals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
