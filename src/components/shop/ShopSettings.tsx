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
  Smartphone,
  Store,
  CreditCard,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { ThemeToggle } from '../ThemeToggle';
import toast from 'react-hot-toast';

export const ShopSettings: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'main' | 'shop' | 'appearance' | 'privacy'>('main');

  const updateShopFields = async (fields: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'shops', user.uid), {
        ...fields,
        updatedAt: serverTimestamp()
      });
      toast.success('Shop settings updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update shop');
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
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
            {activeTab === 'main' ? 'Shop Settings' : t(`settings.${activeTab}`)}
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
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              <button 
                onClick={() => setActiveTab('shop')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-blue/10 text-primary-blue rounded-xl flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Shop Profile</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Shop Name, Address, Category</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>

              <button 
                onClick={() => setActiveTab('appearance')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">App Theme</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Dark Mode, System Default</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>

              <button 
                onClick={() => setActiveTab('privacy')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-action-orange/10 text-action-orange rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Privacy & Visibility</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Open/Closed status, Map visibility</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>

              <button className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Payout Accounts</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">bKash, Nagad, Bank</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>

              <button className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Delivery Options</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Delivery fees, Radius</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            </div>

             <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] px-4">Support & Info</h3>
               <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
                  <button className="w-full flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                        <Info className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Version</span>
                    </div>
                    <span className="text-xs font-black text-slate-300">1.5.0-merch</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Push Notifications</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
               </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full py-6 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-[32px] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/20 active:scale-95"
            >
              Sign Out Merchant
            </button>
          </motion.div>
        )}

        {activeTab === 'shop' && (
           <motion.div 
            key="shop"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 space-y-8"
          >
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Brand Display Name</label>
                 <input 
                   type="text" 
                   defaultValue={profile?.shopName || profile?.name}
                   onBlur={(e) => updateShopFields({ shopName: e.target.value })}
                   className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-white"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Merchant Category</label>
                 <select 
                   defaultValue={profile?.shopCategory}
                   onChange={(e) => updateShopFields({ shopCategory: e.target.value })}
                   className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-white appearance-none"
                 >
                   <option value="Hardware">Hardware & Tools</option>
                   <option value="Electrical">Electrical Supplies</option>
                   <option value="Plumbing">Plumbing Store</option>
                   <option value="Construction">Construction Material</option>
                   <option value="Paint Shop">Paint & Decor</option>
                 </select>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Physical Address</label>
                 <textarea 
                   defaultValue={profile?.address}
                   onBlur={(e) => updateShopFields({ address: e.target.value })}
                   className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-white resize-none"
                   rows={3}
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
             <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-50 dark:border-slate-800 space-y-8">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">Dark Mode</h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">Switch app visual theme</p>
                  </div>
                  <ThemeToggle />
               </div>

               <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Merchant Language</h4>
                  <div className="grid grid-cols-2 gap-3">
                     {languages.map((l) => (
                       <button
                         key={l.code}
                         onClick={() => setLang(l.code)}
                         className={`py-6 rounded-[28px] flex flex-col items-center gap-2 border-2 transition-all ${lang === l.code ? 'bg-primary-blue border-primary-blue text-white shadow-xl shadow-primary-blue/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
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
             <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-50 dark:border-slate-800 space-y-8">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">Shop Open Status</h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">Toggle visibility to customers</p>
                  </div>
                  <div 
                    onClick={() => updateShopFields({ isOpen: !profile?.isOpen })}
                    className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-all ${profile?.isOpen ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-all ${profile?.isOpen ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
               </div>

               <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button className="w-full flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Change Admin Password</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                  <button className="w-full flex items-center justify-between group pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">View Public Shop</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
