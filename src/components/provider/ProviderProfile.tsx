import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  Briefcase, 
  ShieldCheck, 
  Award, 
  ChevronRight, 
  Clock, 
  Settings,
  Share2,
  Lock,
  Globe,
  Bell,
  Trash2,
  Camera,
  History,
  TrendingUp,
  Heart,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, setDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { getInitials } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { uploadImage } from '../../services/imgbb';
import toast from 'react-hot-toast';

export const ProviderProfile: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const profile = authProfile as any;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    completedJobs: 0,
    totalEarnings: 0,
    avgRating: 0,
    recognition: 'Reliable Partner'
  });
  const [uploading, setUploading] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmOne, setConfirmOne] = useState(false);
  const [confirmTwo, setConfirmTwo] = useState(false);
  const [confirmThree, setConfirmThree] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchStats = async () => {
      try {
        const bookingsQ = query(
          collection(db, 'bookings'),
          where('providerId', '==', profile.uid),
          where('status', '==', 'completed')
        );
        const bookingsSnap = await getDocs(bookingsQ);
        const completed = bookingsSnap.docs.length;
        
        let earnings = 0;
        bookingsSnap.docs.forEach(doc => {
          earnings += doc.data().providerEarning || 0;
        });

        setStats({
          completedJobs: completed,
          totalEarnings: earnings,
          avgRating: profile.rating || 0,
          recognition: completed > 50 ? 'Expert Provider' : completed > 10 ? 'Senior Provider' : 'New Provider'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'provider_stats');
      }
    };

    fetchStats();
  }, [profile?.uid, profile?.rating]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, `avatar_${user.uid}`, 400);
      await setDoc(doc(db, 'providers', user.uid), { photoURL: url }, { merge: true });
      toast.success('Profile photo updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmOne || !confirmTwo || !confirmThree) {
      toast.error("Please confirm all conditions before deleting your account.");
      return;
    }
    setDeleting(true);
    try {
      if (user) {
        // Delete provider document first
        await deleteDoc(doc(db, 'providers', user.uid));
        // Delete the Firebase Auth user
        await deleteUser(user);
        toast.success("Account deleted successfully");
        // Navigation is handled automatically by AuthContext
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error("Security requirement: Please log out, log back in, and try again.");
      } else {
        toast.error(err.message || "Failed to delete account");
      }
      setDeleting(false);
    }
  };

  const menuGroups = [
    {
      title: 'Performance & Earnings',
      items: [
        { icon: TrendingUp, label: 'Work Insights', path: '/pro/insights', color: 'text-primary-blue bg-primary-blue/10' },
        { icon: History, label: 'Earnings History', path: '/pro/wallet', color: 'text-action-orange bg-action-orange/10' },
        { icon: Star, label: 'Customer Reviews', path: '/pro/reviews', color: 'text-primary-blue bg-primary-blue/10' },
      ]
    },
    {
      title: 'Security & Verification',
      items: [
        { icon: ShieldCheck, label: 'KYC Verification', path: '/pro/kyc', color: 'text-primary-blue bg-primary-blue/10', sub: profile?.isVerified ? 'Verified' : 'Pending' },
        { icon: Lock, label: 'Privacy Settings', path: '/pro/settings', color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
      ]
    },
    {
      title: 'General',
      items: [
        { icon: Globe, label: 'App Language', path: '/settings', color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
        { icon: Bell, label: 'Notifications', path: '/notifications', color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
        { icon: Share2, label: 'Share Provider ID', onClick: () => {
          navigator.share({
            title: 'MistriGO Provider',
            text: `Check out my profile on MistriGO! Provider ID: ${profile?.uid}`,
            url: window.location.href
          }).catch(console.error);
        }, color: 'text-gray-teal bg-slate-100 dark:bg-brand-surface' },
      ]
    }
  ];

  return (
    <div className="space-y-8 pb-32">
      {/* Profile Header */}
      <div className="bg-brand-dark border-b border-primary-blue/20 pt-12 pb-24 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative group">
            <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-[40px] border-4 border-white/10 shadow-2xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95 cursor-pointer relative">
              {profile?.photoURL ? (
                <img src={profile.photoURL} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-4xl font-black text-cream">{getInitials(profile?.name || '??')}</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-brand-dark/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary-blue animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute bottom-1 right-1 w-10 h-10 bg-primary-blue text-cream rounded-2xl shadow-xl flex items-center justify-center border-4 border-brand-dark transition-transform active:scale-90 cursor-pointer">
              <Camera className="w-4 h-4" />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>

          <div className="mt-6 text-center space-y-1 px-6">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-black text-cream tracking-tight">{profile?.name}</h2>
              {profile?.isVerified && <ShieldCheck className="w-5 h-5 text-primary-blue" />}
            </div>
            <p className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em]">{profile?.service}</p>
            <div className="flex items-center justify-center gap-1.5 text-primary-blue mt-2 bg-primary-blue/10 px-4 py-1.5 rounded-full border border-primary-blue/20">
              <Award className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">{stats.recognition}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="px-4 -mt-16 relative z-20">
        <div className="bg-brand-slate dark:bg-brand-dark rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl p-8 grid grid-cols-3 gap-4">
          <div className="text-center space-y-1 border-r border-slate-50 dark:border-slate-800">
            <div className="text-xl font-black text-cream dark:text-cream leading-none">{profile?.rating?.toFixed(1) || '0.0'}</div>
            <div className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">Rating</div>
          </div>
          <div className="text-center space-y-1 border-r border-slate-50 dark:border-slate-800">
            <div className="text-xl font-black text-cream dark:text-cream leading-none">{stats.completedJobs}</div>
            <div className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">Jobs</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-xl font-black text-cream dark:text-cream leading-none">{profile?.yearsExperience || 0}y</div>
            <div className="text-[8px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-widest">Ex.</div>
          </div>
        </div>
      </div>

      {/* Menu Groups */}
      <div className="px-4 space-y-8">
        {menuGroups.map((group, i) => (
          <div key={i} className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-[0.3em] px-4">{group.title}</h3>
            <div className="bg-brand-slate dark:bg-brand-dark rounded-[32px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
              {group.items.map((item, j) => (
                <button
                  key={j}
                  onClick={item.onClick || (() => navigate(item.path!))}
                  className={`w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors ${j !== group.items.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-700 dark:text-cream">{item.label}</span>
                      {item.sub && <p className="text-[9px] font-black uppercase text-primary-blue tracking-widest mt-0.5">{item.sub}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-teal dark:text-gray-teal" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="px-4 pt-4">
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-between p-6 rounded-[32px] border-2 border-red-100 dark:border-red-900/20 bg-red-50/10 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500">
              <Trash2 className="w-5 h-5" />
            </div>
            <span className="text-sm font-black text-red-500 uppercase tracking-widest">Delete Account</span>
          </div>
          <ChevronRight className="w-5 h-5 text-red-200 dark:text-red-900/40 group-hover:text-red-500" />
        </button>
      </div>

      <div className="text-center space-y-1">
        <p className="text-[10px] font-black text-gray-teal dark:text-gray-teal uppercase tracking-[0.4em]">MistriGO Provider v2.1.0</p>
        <p className="text-[9px] font-medium text-gray-teal dark:text-gray-teal opacity-60">Crafted with ❤️ in Bangladesh</p>
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

              <h3 className="text-xl font-black text-cream dark:text-cream tracking-tight mb-2">Delete Provider Account?</h3>
              <p className="text-sm text-gray-teal dark:text-gray-teal mb-8 leading-relaxed">
                This action is permanent and cannot be undone. All your provider data, job history, and earnings will be permanently deleted.
              </p>

              <div className="space-y-4 mb-8">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmOne ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmOne && <CheckCircle2 className="w-4 h-4 text-cream" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmOne} onChange={(e) => setConfirmOne(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-cream font-medium leading-tight">
                    I understand that I will lose all my job history, ratings, and reviews permanently.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmTwo ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmTwo && <CheckCircle2 className="w-4 h-4 text-cream" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmTwo} onChange={(e) => setConfirmTwo(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-cream font-medium leading-tight">
                    I confirm that I have no pending jobs and have withdrawn all my earnings.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors mt-0.5 ${confirmThree ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'}`}>
                    {confirmThree && <CheckCircle2 className="w-4 h-4 text-cream" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={confirmThree} onChange={(e) => setConfirmThree(e.target.checked)} disabled={deleting} />
                  <span className="text-sm text-slate-600 dark:text-cream font-medium leading-tight">
                    I understand this action is irreversible and my account cannot be recovered.
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
