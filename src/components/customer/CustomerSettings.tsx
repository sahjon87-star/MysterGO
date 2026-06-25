import React, { useState } from 'react';
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
  Headphones,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { ThemeToggle } from '../ThemeToggle';
import toast from 'react-hot-toast';

export const CustomerSettings: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOne, setConfirmOne] = useState(false);
  const [confirmTwo, setConfirmTwo] = useState(false);
  const [confirmThree, setConfirmThree] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Delete customer document from 'users' collection
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete the Firebase Auth user
      await deleteUser(user);
      toast.success("Account deleted successfully");
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeleting(false);
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

        {/* Danger Zone */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] px-4">Danger Zone</h3>
          <div className="bg-red-50/5 dark:bg-red-950/5 rounded-[40px] border border-red-100 dark:border-red-900/20 overflow-hidden shadow-sm">
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-between p-6 hover:bg-red-50/15 dark:hover:bg-red-900/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-red-500">Delete Account</span>
                  <p className="text-[9px] font-black text-red-400 dark:text-red-500 uppercase tracking-widest mt-0.5">Permanently remove your profile</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-300" />
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

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] bottom-auto max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl z-50 p-6 border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Delete Customer Account?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                This action is permanent and cannot be undone. All your customer profile, booking history, and active wallet balance will be permanently deleted.
              </p>

              <div className="space-y-4 mb-8">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmOne ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmOne && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmOne} onChange={(e) => setConfirmOne(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-tight">
                    I understand that I will lose all my order history, bookings, and customer status permanently.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmTwo ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmTwo && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmTwo} onChange={(e) => setConfirmTwo(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-tight">
                    I confirm that I have no active bookings in progress and understand any remaining wallet balance is forfeited.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmThree ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmThree && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmThree} onChange={(e) => setConfirmThree(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-tight">
                    I understand this action is completely irreversible and cannot be recovered.
                  </span>
                </label>
              </div>

              <button
                onClick={handleDeleteAccount}
                disabled={!confirmOne || !confirmTwo || !confirmThree || deleting}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center transition-all ${
                  confirmOne && confirmTwo && confirmThree && !deleting
                    ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-xl shadow-red-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
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
