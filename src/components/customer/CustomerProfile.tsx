import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  User, 
  Settings, 
  Bell, 
  LogOut, 
  ChevronRight, 
  CreditCard, 
  Calendar,
  HelpCircle,
  Share2,
  Edit3,
  Languages,
  Camera,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, getInitials } from '../../lib/utils';
import { uploadImage } from '../../services/imgbb';

export const CustomerProfile: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const { t, setLang, lang } = useLanguage();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingsCount, setBookingsCount] = useState<number | null>(null);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.name, profile?.phone]);

  useEffect(() => {
    if (!profile?.uid) return;

    let field = 'customerId';
    if (profile?.role === 'provider') {
      field = 'providerId';
    } else if (profile?.role === 'shop') {
      field = 'shopId';
    }

    const q = query(
      collection(db, 'bookings'),
      where(field, '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setBookingsCount(snap.size);
    }, (err) => {
      console.warn('Error listening to bookings count in profile:', err);
    });

    return () => unsub();
  }, [profile?.uid, profile?.role]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, `avatar_${user.uid}`, 400);
      const collection = profile?.role === 'customer' ? 'users' : 'providers';
      await setDoc(doc(db, collection, user.uid), { photoURL: url }, { merge: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const collection = profile?.role === 'customer' ? 'users' : 'providers';
      await setDoc(doc(db, collection, user.uid), { name, phone }, { merge: true });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'bn' : 'en';
    setLang(newLang);
    if (user) {
      const collection = profile?.role === 'customer' ? 'users' : 'providers';
      setDoc(doc(db, collection, user.uid), { preferredLanguage: newLang }, { merge: true });
    }
  };

  const menuItems = [
    { icon: Calendar, label: 'menu.bookings', path: '/bookings', color: 'text-brand-amber bg-brand-amber/10' },
    { icon: CreditCard, label: 'menu.wallet', path: '/wallet', color: 'text-brand-amber bg-brand-amber/10', sub: profile ? `Balance: ${formatCurrency(profile.walletBalance)}` : '' },
    { icon: Bell, label: 'menu.notifs', path: '/notifications', color: 'text-brand-amber bg-brand-amber/10' },
    { icon: Languages, label: 'Change Language', onClick: toggleLanguage, color: 'text-brand-amber bg-brand-amber/10', sub: lang === 'en' ? 'English' : 'বাংলা' },
    { icon: Settings, label: 'menu.settings', path: '/settings', color: 'text-gray-teal bg-white/5' },
    { icon: HelpCircle, label: 'menu.help', path: '/help', color: 'text-brand-amber bg-brand-amber/10' },
    { icon: Share2, label: 'Share App', path: '/share', color: 'text-brand-amber bg-brand-amber/10' },
  ];

  return (
    <div className="space-y-6 pb-20 bg-brand-dark min-h-screen">
      {/* Profile Hero */}
      <div className="bg-brand-dark px-4 pt-10 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-amber/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-[32px] bg-brand-slate border-4 border-white/5 flex items-center justify-center overflow-hidden shadow-2xl">
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  className="w-full h-full object-cover" 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-brand-amber font-black text-3xl">{profile ? getInitials(profile.name) : '??'}</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-brand-dark/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-brand-amber border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 bg-brand-amber p-2 rounded-xl text-brand-dark shadow-lg border-2 border-brand-dark active:scale-90 transition-all cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="editing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3 w-full max-w-[240px]"
              >
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-brand-slate border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-cream text-sm font-bold text-center outline-none focus:border-brand-amber"
                  placeholder="Name"
                />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-brand-slate border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-cream text-sm font-bold text-center outline-none focus:border-brand-amber"
                  placeholder="Phone"
                />
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-brand-surface rounded-xl text-cream border border-slate-200 dark:border-white/10"><X className="w-4 h-4" /></button>
                  <button onClick={handleSaveProfile} disabled={saving} className="p-2 bg-brand-amber rounded-xl text-brand-dark">
                    {saving ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="viewing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-black text-cream tracking-tight">{profile?.name}</h2>
                  <button onClick={() => setIsEditing(true)} className="text-brand-amber"><Edit3 className="w-4 h-4" /></button>
                </div>
                <p className="text-gray-teal text-xs font-bold uppercase tracking-[0.2em]">{profile?.phone || profile?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-brand-amber/10 px-4 py-1.5 rounded-full border border-brand-amber/20">
            <span className="text-[10px] font-black text-brand-amber uppercase tracking-widest">Premium Customer</span>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-500 text-[10px] font-bold"
            >
              <AlertCircle className="w-3 h-3" />
              {error}
            </motion.div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 -mt-10 relative z-20">
        <div className="bg-brand-slate rounded-[32px] shadow-2xl border border-slate-200 dark:border-white/5 p-6 grid grid-cols-3 gap-4">
          <div className="text-center space-y-1 border-r border-slate-200 dark:border-white/5">
            <div className="text-lg font-black text-cream italic">
              {bookingsCount !== null ? bookingsCount : (profile?.bookingsCount || profile?.bookings?.length || 0)}
            </div>
            <div className="text-[10px] font-bold text-gray-teal uppercase tracking-tighter">Bookings</div>
          </div>
          <div className="text-center space-y-1 border-r border-slate-200 dark:border-white/5">
            <div className="text-lg font-black text-cream italic">
              {formatCurrency(profile?.totalSpent || profile?.spent || 0)}
            </div>
            <div className="text-[10px] font-bold text-gray-teal uppercase tracking-tighter">Spent</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-lg font-black text-brand-amber italic">
              {profile?.referralCount || 0}
            </div>
            <div className="text-[10px] font-bold text-gray-teal uppercase tracking-tighter">Referrals</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 pb-8">
        <div className="bg-brand-slate rounded-[32px] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden divide-y divide-slate-200 dark:divide-white/5">
          {menuItems.map((item) => (
            <button 
              key={item.label}
              onClick={item.onClick ? item.onClick : () => navigate(item.path!)}
              className="w-full flex items-center gap-4 p-5 hover:bg-brand-surface/30 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-active:scale-90 ${item.color} border border-slate-200 dark:border-white/5`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-black text-cream truncate tracking-tight uppercase leading-none">{t(item.label)}</h4>
                {item.sub && <p className="text-[10px] font-bold text-gray-teal uppercase tracking-wider mt-1.5">{item.sub}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-teal group-hover:text-brand-amber transition-colors" />
            </button>
          ))}
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-5 hover:bg-red-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center group-active:scale-90 transition-transform border border-red-500/20">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left text-sm font-black text-red-500 uppercase tracking-tighter">
                {t('menu.logout')}
            </div>
          </button>
        </div>
        
        <p className="text-center mt-8 text-[10px] font-bold text-gray-teal uppercase tracking-[0.3em]">MistriGO v5.0.1</p>
      </div>
    </div>
  );
};
