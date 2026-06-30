import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc, increment, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { User, Mail, Lock, Check, ScrollText, ShieldAlert, Wrench, Store, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../shared/Logo';
import { motion } from 'motion/react';
import { UserRole } from '../../types';
import { PolicyModal } from './PolicyModal';
import { privacySections, termsSections } from '../../constants/legal';

export const SignupPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const referralFromUrl = searchParams.get('ref');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!trimmedPassword) {
      setError('Please enter a password.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Please accept the Terms and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      await updateProfile(cred.user, { displayName: trimmedName });
      
      const referralCode = 'MGO-' + cred.user.uid.slice(0, 6).toUpperCase();
      
      // Check if user was referred
      let referredBy = null;
      if (referralFromUrl) {
        // Just store the code, validation and payment happens in Onboarding
        referredBy = referralFromUrl.toUpperCase();
      }

      const baseData = {
        uid: cred.user.uid,
        name: trimmedName,
        email: trimmedEmail,
        role,
        preferredLanguage: lang,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        isBlocked: false,
        walletBalance: 0,
        referralCode: referralCode,
        referredBy: referredBy
      };

      if (role === 'provider') {
        await setDoc(doc(db, 'providers', cred.user.uid), {
          ...baseData,
          providerType: 'worker',
          hourlyRate: 500,
          experience: 0,
          bio: '',
          isOnline: false,
          isVerified: false,
          kycStatus: 'none',
          rating: 0,
          totalJobs: 0,
          totalEarnings: 0,
          walletBalance: 0,
        });
      } else if (role === 'shop_owner') {
        await setDoc(doc(db, 'shops', cred.user.uid), {
          ...baseData,
          shopName: '',
          shopCategory: '',
          shopAddress: '',
          isVerified: false,
          kycStatus: 'none',
          rating: 0,
          totalSales: 0,
        });
      } else {
        await setDoc(doc(db, 'users', cred.user.uid), baseData);
      }

      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password Sign-In has not been enabled in the Firebase Console. Please go to your Firebase Console under Build > Authentication > Sign-in method, add the Email/Password provider, and enable it.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Please accept the Terms and Privacy Policy');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      
      const referralCode = 'MGO-' + cred.user.uid.slice(0, 6).toUpperCase();
      let referredBy = null;
      if (referralFromUrl) {
        referredBy = referralFromUrl.toUpperCase();
      }

      const baseData = {
        uid: cred.user.uid,
        name: cred.user.displayName || 'Google User',
        email: cred.user.email,
        role,
        preferredLanguage: lang,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        isBlocked: false,
        walletBalance: 0,
        referralCode: referralCode,
        referredBy: referredBy
      };

      if (role === 'provider') {
        await setDoc(doc(db, 'providers', cred.user.uid), {
          ...baseData,
          providerType: 'worker',
          hourlyRate: 505,
          experience: 0,
          bio: '',
          isOnline: false,
          isVerified: false,
          kycStatus: 'none',
          rating: 0,
          totalJobs: 0,
          totalEarnings: 0,
          walletBalance: 0,
        }, { merge: true });
      } else if (role === 'shop_owner') {
        await setDoc(doc(db, 'shops', cred.user.uid), {
          ...baseData,
          shopName: '',
          shopCategory: '',
          shopAddress: '',
          isVerified: false,
          kycStatus: 'none',
          rating: 0,
          totalSales: 0,
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', cred.user.uid), baseData, { merge: true });
      }

      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please check your internet connection or disable any ad-blockers/VPNs.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-up cancelled: The popup was closed before completion.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 py-12 transition-colors">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-slate rounded-3xl shadow-2xl p-8 border border-white/5"
      >
        <div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <p className="text-gray-teal text-sm mt-1 font-bold uppercase tracking-widest text-[10px]">Create a new account</p>
        </div>

        <div className="space-y-1 mb-6">
          <label className="text-xs font-bold text-gray-teal uppercase tracking-wider">I am a —</label>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setRole('customer')}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${role === 'customer' ? 'border-brand-amber bg-brand-amber/10 text-brand-amber' : 'border-white/5 bg-brand-surface text-gray-teal'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight">Customer</span>
            </button>
            <button 
              onClick={() => setRole('provider')}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${role === 'provider' ? 'border-brand-amber bg-brand-amber/10 text-brand-amber' : 'border-white/5 bg-brand-surface text-gray-teal'}`}
            >
              <Wrench className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight">Provider</span>
            </button>
            <button 
              onClick={() => setRole('shop_owner')}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${role === 'shop_owner' ? 'border-brand-amber bg-brand-amber/10 text-brand-amber' : 'border-white/5 bg-brand-surface text-gray-teal'}`}
            >
              <Store className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tight">Shop Owner</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-teal uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-teal w-5 h-5" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-brand-surface border border-white/5 rounded-2xl focus:ring-2 focus:ring-brand-amber transition-all outline-none text-cream placeholder:text-gray-teal font-medium"
                placeholder="Your Name"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-teal uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-teal w-5 h-5" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-brand-surface border border-white/5 rounded-2xl focus:ring-2 focus:ring-brand-amber transition-all outline-none text-cream placeholder:text-gray-teal font-medium"
                placeholder="example@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-teal uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-teal w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-brand-surface border border-white/5 rounded-2xl focus:ring-2 focus:ring-brand-amber transition-all outline-none text-cream placeholder:text-gray-teal font-medium animate-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-teal hover:text-brand-amber transition-colors p-1"
                id="toggle-signup-password"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-teal uppercase tracking-wider">Confirm Password</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-teal w-5 h-5" />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-brand-surface border border-white/5 rounded-2xl focus:ring-2 focus:ring-brand-amber transition-all outline-none text-cream placeholder:text-gray-teal font-medium animate-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-teal hover:text-brand-amber transition-colors p-1"
                id="toggle-signup-confirm-password"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest">{error}</p>}

          <div className="space-y-3 pt-2">
            <div 
              onClick={() => !acceptedTerms && setShowTermsModal(true)}
              className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${acceptedTerms ? 'border-brand-amber bg-brand-amber/5' : 'border-white/5 hover:border-brand-amber/20'}`}
            >
              <div className="relative flex items-center mt-0.5">
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${acceptedTerms ? 'bg-brand-amber border-brand-amber' : 'border-white/10'}`}>
                  {acceptedTerms && <Check className="w-3.5 h-3.5 text-brand-dark" />}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-cream uppercase tracking-wider leading-none mb-1">
                  Terms of Service
                </p>
                <p className="text-[9px] font-bold text-gray-teal leading-tight">
                  {acceptedTerms ? 'Accepted' : 'Click to read and accept'}
                </p>
              </div>
              {!acceptedTerms && <ScrollText className="w-4 h-4 text-brand-amber animate-pulse" />}
            </div>

            <div 
              onClick={() => !acceptedPrivacy && setShowPrivacyModal(true)}
              className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${acceptedPrivacy ? 'border-brand-amber bg-brand-amber/5' : 'border-white/5 hover:border-brand-amber/20'}`}
            >
              <div className="relative flex items-center mt-0.5">
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${acceptedPrivacy ? 'bg-brand-amber border-brand-amber' : 'border-white/10'}`}>
                  {acceptedPrivacy && <Check className="w-3.5 h-3.5 text-brand-dark" />}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-cream uppercase tracking-wider leading-none mb-1">
                  Privacy Policy
                </p>
                <p className="text-[9px] font-bold text-gray-teal leading-tight">
                  {acceptedPrivacy ? 'Accepted' : 'Click to read and accept'}
                </p>
              </div>
              {!acceptedPrivacy && <ShieldAlert className="w-4 h-4 text-brand-amber animate-pulse" />}
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !acceptedTerms || !acceptedPrivacy}
            className="w-full bg-brand-amber hover:shadow-brand-amber/20 text-brand-dark font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-brand-slate px-2 text-gray-teal font-black">Or</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-3 bg-brand-surface border border-white/5 hover:border-brand-amber/30 text-cream font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span className="uppercase tracking-widest text-xs">Sign up with Google</span>
        </button>

        <p className="text-center mt-8 text-sm text-gray-teal">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-brand-amber font-black hover:underline uppercase tracking-widest text-xs">
            Login
          </button>
        </p>
      </motion.div>

      <PolicyModal 
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAcceptedTerms(true);
          setShowTermsModal(false);
        }}
        title="Terms of Service"
        content={termsSections}
        type="terms"
      />

      <PolicyModal 
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => {
          setAcceptedPrivacy(true);
          setShowPrivacyModal(false);
        }}
        title="Privacy Policy"
        content={privacySections}
        type="privacy"
      />
    </div>
  );
};
