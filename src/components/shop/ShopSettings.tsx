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
  Truck,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, serverTimestamp, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { ThemeToggle } from '../ThemeToggle';
import toast from 'react-hot-toast';

export const ShopSettings: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'main' | 'shop' | 'appearance' | 'privacy'>('main');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOne, setConfirmOne] = useState(false);
  const [confirmTwo, setConfirmTwo] = useState(false);
  const [confirmThree, setConfirmThree] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // 1. Fetch all products listed by this shop
      const productsQ = query(collection(db, 'products'), where('shopId', '==', user.uid));
      const productsSnap = await getDocs(productsQ);
      
      // 2. Cascade delete all product nodes
      const deletePromises = productsSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // 3. Delete the shop document from 'shops' collection
      await deleteDoc(doc(db, 'shops', user.uid));

      // 4. Delete the Firebase Auth user
      await deleteUser(user);

      toast.success("Merchant account deleted successfully");
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete shop account");
    } finally {
      setDeleting(false);
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
            <ChevronLeft className="w-8 h-8" />
          </button>
          <h2 className="text-2xl font-black text-cream dark:text-cream uppercase tracking-tight">
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
            <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              <button 
                onClick={() => setActiveTab('shop')}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors border-b border-slate-50 dark:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-blue/10 text-primary-blue rounded-xl flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">Shop Profile</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">Shop Name, Address, Category</p>
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
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">App Theme</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">Dark Mode, System Default</p>
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
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">Privacy & Visibility</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">Open/Closed status, Map visibility</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cream" />
              </button>

              <button className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">Payout Accounts</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">bKash, Nagad, Bank</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cream" />
              </button>

              <button className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 text-gray-teal rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-cream">Delivery Options</p>
                    <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-0.5">Delivery fees, Radius</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cream" />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-cream dark:text-slate-600 uppercase tracking-[0.3em] px-4">Support & Info</h3>
              <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
                  <button className="w-full flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-gray-teal rounded-xl flex items-center justify-center">
                        <Info className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">Version</span>
                    </div>
                    <span className="text-xs font-black text-cream">1.5.0-merch</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-gray-teal rounded-xl flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">Push Notifications</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cream" />
                  </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] px-4">Danger Zone</h3>
              <div className="bg-red-50/5 dark:bg-red-950/5 rounded-[32px] border-2 border-red-100 dark:border-red-900/20 overflow-hidden shadow-sm">
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-between p-6 hover:bg-red-50/15 dark:hover:bg-red-900/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-red-500">Delete Shop Account</span>
                      <p className="text-[9px] font-black text-red-400 dark:text-red-500 uppercase tracking-widest mt-0.5">Permanently purge your store</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-300" />
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
                 <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-4">Brand Display Name</label>
                 <input 
                   type="text" 
                   defaultValue={profile?.shopName || profile?.name}
                   onBlur={(e) => updateShopFields({ shopName: e.target.value })}
                   className="w-full bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-[28px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-4">Merchant Category</label>
                 <select 
                   defaultValue={profile?.shopCategory}
                   onChange={(e) => updateShopFields({ shopCategory: e.target.value })}
                   className="w-full bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-[28px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream appearance-none"
                 >
                   <option value="Hardware">Hardware & Tools</option>
                   <option value="Electrical">Electrical Supplies</option>
                   <option value="Plumbing">Plumbing Store</option>
                   <option value="Construction">Construction Material</option>
                   <option value="Paint Shop">Paint & Decor</option>
                 </select>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-4">Physical Address</label>
                 <textarea 
                   defaultValue={profile?.address}
                   onBlur={(e) => updateShopFields({ address: e.target.value })}
                   className="w-full bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-[32px] px-6 py-5 outline-none focus:ring-2 focus:ring-primary-blue text-sm font-bold dark:text-cream resize-none"
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
             <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] p-8 border border-slate-50 dark:border-slate-800 space-y-8">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-cream uppercase tracking-tight">Dark Mode</h4>
                    <p className="text-[10px] font-medium text-gray-teal mt-0.5">Switch app visual theme</p>
                  </div>
                  <ThemeToggle />
               </div>

               <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-gray-teal uppercase tracking-widest px-2">Merchant Language</h4>
                  <div className="grid grid-cols-2 gap-3">
                     {languages.map((l) => (
                       <button
                         key={l.code}
                         onClick={() => setLang(l.code)}
                         className={`py-6 rounded-[28px] flex flex-col items-center gap-2 border-2 transition-all ${lang === l.code ? 'bg-primary-blue border-primary-blue text-cream shadow-xl shadow-primary-blue/20' : 'bg-slate-50 dark:bg-brand-surface border-slate-100 dark:border-slate-700 text-gray-teal'}`}
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
                    <h4 className="text-sm font-bold text-slate-700 dark:text-cream uppercase tracking-tight">Shop Open Status</h4>
                    <p className="text-[10px] font-medium text-gray-teal mt-0.5">Toggle visibility to customers</p>
                  </div>
                  <div 
                    onClick={() => updateShopFields({ isOpen: !profile?.isOpen })}
                    className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-all ${profile?.isOpen ? 'bg-green-500' : 'bg-slate-200 dark:bg-brand-surface'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-brand-slate transition-all ${profile?.isOpen ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
               </div>

               <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button className="w-full flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-brand-surface text-gray-teal rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">Change Admin Password</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cream" />
                  </button>
                  <button className="w-full flex items-center justify-between group pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-brand-surface text-gray-teal rounded-xl flex items-center justify-center">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">View Public Shop</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cream" />
                  </button>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteModal(false)}
              className="fixed inset-0 bg-brand-dark/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] bottom-auto max-h-[80vh] overflow-y-auto bg-brand-slate dark:bg-brand-dark rounded-[32px] shadow-2xl z-50 p-6 border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="w-10 h-10 bg-slate-100 dark:bg-brand-surface rounded-full flex items-center justify-center text-gray-teal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-xl font-black text-cream dark:text-cream tracking-tight mb-2">Delete Merchant Account?</h3>
              <p className="text-sm text-gray-teal dark:text-gray-teal mb-8 leading-relaxed">
                This action is permanent and cannot be undone. All your merchant profile, listed products, order logs, and depot data will be permanently purged.
              </p>

              <div className="space-y-4 mb-8">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmOne ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmOne && <CheckCircle2 className="w-4 h-4 text-cream" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmOne} onChange={(e) => setConfirmOne(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-cream font-medium leading-tight">
                    I understand that all my product listings will be permanently deleted and cannot be restored.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmTwo ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmTwo && <CheckCircle2 className="w-4 h-4 text-cream" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmTwo} onChange={(e) => setConfirmTwo(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-cream font-medium leading-tight">
                    I confirm that I have no pending shipments or active disputes with customers.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmThree ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmThree && <CheckCircle2 className="w-4 h-4 text-cream" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmThree} onChange={(e) => setConfirmThree(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-cream font-medium leading-tight">
                    I understand this action is completely irreversible and this merchant ID will be blacklisted.
                  </span>
                </label>
              </div>

              <button
                onClick={handleDeleteAccount}
                disabled={!confirmOne || !confirmTwo || !confirmThree || deleting}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center transition-all ${
                  confirmOne && confirmTwo && confirmThree && !deleting
                    ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-xl shadow-red-500/20'
                    : 'bg-slate-100 dark:bg-brand-surface text-gray-teal cursor-not-allowed'
                }`}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Permanently Delete Account'
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
