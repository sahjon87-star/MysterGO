import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  User, 
  MapPin, 
  Bell, 
  Globe, 
  Shield, 
  ChevronRight, 
  ChevronLeft,
  Moon,
  Info,
  Smartphone,
  LogOut,
  Map,
  Lock,
  Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { ThemeToggle } from '../ThemeToggle';
import toast from 'react-hot-toast';

export const CustomerSettings: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  const updateProfileFields = async (fields: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...fields,
        updatedAt: serverTimestamp()
      });
      toast.success('Settings updated');
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'bn', label: 'বাংলা', flag: '🇧🇩' }
  ] as const;

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="px-4 pt-6 space-y-1">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">App Settings</h2>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Configure your MistriGO experience</p>
      </div>

      <div className="px-4 space-y-8 pb-32">
        {/* Core Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
           <button className="w-full flex items-center justify-between p-7 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-primary-blue/10 text-primary-blue rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                 </div>
                 <div className="text-left">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Default Location</span>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Current: {profile?.address || 'Not Set'}</p>
                 </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
           </button>

           <div className="p-7 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                 </div>
                 <div className="text-left">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Dark Appearance</span>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Optimize for night use</p>
                 </div>
              </div>
              <ThemeToggle />
           </div>

           <button className="w-full flex items-center justify-between p-7 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-action-orange/10 text-action-orange rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                 </div>
                 <div className="text-left">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Push Notifications</span>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Enabled</p>
                 </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
           </button>
        </div>

        {/* Language Selection */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Interface Language</h3>
          <div className="grid grid-cols-2 gap-4">
             {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-2 ${lang === l.code ? 'bg-primary-blue border-primary-blue text-white shadow-xl shadow-primary-blue/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'}`}
                >
                   <span className="text-3xl">{l.flag}</span>
                   <span className="text-[10px] font-black uppercase tracking-widest leading-none">{l.label}</span>
                </button>
             ))}
          </div>
        </div>

        {/* Legal & Security */}
        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Account & Safety</h3>
           <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
             <button onClick={() => navigate('/terms')} className="w-full flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                   <Shield className="w-5 h-5 text-slate-400" />
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Privacy Policy</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200" />
             </button>
             <button className="w-full flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                   <Lock className="w-5 h-5 text-slate-400" />
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Security Credentials</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200" />
             </button>
           </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full py-6 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-[32px] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/20 active:scale-95 flex items-center justify-center gap-3"
        >
          <LogOut className="w-5 h-5" />
          End Session
        </button>
      </div>
    </div>
  );
};
