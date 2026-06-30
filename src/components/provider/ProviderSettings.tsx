import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Settings as SettingsIcon, 
  User, 
  MapPin, 
  Bell, 
  Globe, 
  Shield, 
  Moon, 
  Sun, 
  ChevronRight, 
  ChevronLeft,
  Camera,
  LogOut,
  Trash2,
  Lock,
  Eye,
  Info,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { ThemeToggle } from '../ThemeToggle';
import toast from 'react-hot-toast';

export const ProviderSettings: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'main' | 'account' | 'privacy' | 'appearance'>('main');

  const updateProfileFields = async (fields: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'providers', user.uid), {
        ...fields,
        updatedAt: serverTimestamp()
      });
      toast.success('Settings updated successfully');
    } catch (err) {
      console.error(err);
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
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <button 
            onClick={() => activeTab === 'main' ? navigate(-1) : setActiveTab('main')} 
            className="p-2 -ml-2 text-gray-teal hover:text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-black text-cream dark:text-cream uppercase tracking-tight">
            {activeTab === 'main' ? 'Settings' : t(`settings.${activeTab}`)}
          </h2>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'main' && (
          <motion.div 
            key="main"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 space-y-8"
          >
            <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              <button 
                onClick={() => setActiveTab('account')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors border-b border-slate-50 dark:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-blue/10 text-primary-blue rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">Account Information</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">Profile, Services, Experience</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cream" />
              </button>

              <button 
                onClick={() => setActiveTab('appearance')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors border-b border-slate-50 dark:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">Display & Appearance</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">Dark Mode, Language</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cream" />
              </button>

              <button 
                onClick={() => setActiveTab('privacy')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors border-b border-slate-50 dark:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-action-orange/10 text-action-orange rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">Privacy & Security</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">Permissions, Online Status</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cream" />
              </button>

              <button className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-brand-surface text-gray-teal rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">Notifications</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">Push settings, SMS</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cream" />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-cream dark:text-slate-600 uppercase tracking-[0.3em] px-4">Support & About</h3>
               <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
                  <button className="w-full flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-gray-teal rounded-xl flex items-center justify-center">
                        <Info className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">Version</span>
                    </div>
                    <span className="text-xs font-black text-cream">2.1.0-gold</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-gray-teal rounded-xl flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">Check for Updates</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cream" />
                  </button>
               </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full py-6 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-[32px] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/20 active:scale-95"
            >
              Sign Out Securely
            </button>
          </motion.div>
        )}

        {activeTab === 'account' && (
           <motion.div 
            key="account"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 space-y-8"
          >
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-4">Full Name</label>
                 <input 
                   type="text" 
                   defaultValue={profile?.name}
                   onBlur={(e) => updateProfileFields({ name: e.target.value })}
                   className="w-full bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-[28px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-4">Primary Service</label>
                 <select 
                   defaultValue={profile?.service}
                   onChange={(e) => updateProfileFields({ service: e.target.value })}
                   className="w-full bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-[28px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream appearance-none"
                 >
                   <option value="Plumber">Plumber</option>
                   <option value="Electrician">Electrician</option>
                   <option value="AC Technician">AC Technician</option>
                   <option value="Carpenter">Carpenter</option>
                   <option value="Painter">Painter</option>
                   <option value="Cleaner">Cleaner</option>
                 </select>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-4">Experience (Years)</label>
                 <input 
                   type="number" 
                   defaultValue={profile?.yearsExperience}
                   onBlur={(e) => updateProfileFields({ yearsExperience: parseInt(e.target.value) })}
                   className="w-full bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-[28px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream"
                 />
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'appearance' && (
           <motion.div 
            key="appearance"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 space-y-8"
          >
             <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] p-8 border border-slate-50 dark:border-slate-800 space-y-8">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-cream uppercase tracking-tight">Dark Mode</h4>
                    <p className="text-[10px] font-medium text-gray-teal mt-0.5">Adjust app brightness</p>
                  </div>
                  <ThemeToggle />
               </div>

               <div className="space-y-4 pt-8 border-t border-slate-50 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-gray-teal uppercase tracking-widest">Preferred Language</h4>
                  <div className="grid grid-cols-2 gap-3">
                     {languages.map((l) => (
                       <button
                         key={l.code}
                         onClick={() => setLang(l.code)}
                         className={`py-6 rounded-[24px] flex flex-col items-center gap-2 border-2 transition-all ${lang === l.code ? 'bg-primary-blue border-primary-blue text-cream shadow-xl shadow-primary-blue/20' : 'bg-slate-50 dark:bg-brand-surface border-slate-100 dark:border-slate-700 text-gray-teal'}`}
                       >
                         <span className="text-3xl">{l.flag}</span>
                         <span className="text-[10px] font-black uppercase tracking-widest">{l.label}</span>
                       </button>
                     ))}
                  </div>
               </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'privacy' && (
           <motion.div 
            key="privacy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 space-y-8"
          >
             <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] p-8 border border-slate-50 dark:border-slate-800 space-y-8">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-cream uppercase tracking-tight">Online Status</h4>
                    <p className="text-[10px] font-medium text-gray-teal mt-0.5">Show as available on map</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative p-1 transition-all ${profile?.isOnline ? 'bg-primary-blue' : 'bg-slate-200 dark:bg-brand-surface'}`}>
                    <div className={`w-4 h-4 rounded-full bg-brand-slate transition-all ${profile?.isOnline ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
               </div>

               <div className="space-y-4 pt-8 border-t border-slate-50 dark:border-slate-800">
                  <button className="w-full flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 text-gray-teal rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">Change Password</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cream" />
                  </button>
                  <button className="w-full flex items-center justify-between group pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 text-gray-teal rounded-xl flex items-center justify-center">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">Blocked Customers</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cream" />
                  </button>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
