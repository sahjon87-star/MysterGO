import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../shared/Logo';
import { motion } from 'motion/react';

export const LoginPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

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
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password Sign-In has not been enabled in the Firebase Console. Please go to your Firebase Console under Build > Authentication > Sign-in method, add the Email/Password provider, and enable it.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please check your internet connection or disable any ad-blockers/VPNs.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        setError('Network error: Please check your internet connection or disable any ad-blockers/VPNs that might be blocking Firebase.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled: The popup was closed before completion.');
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 transition-colors">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-slate rounded-3xl shadow-2xl p-8 border border-white/5"
      >
        <div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <p className="text-gray-teal text-sm mt-1 font-bold uppercase tracking-widest text-[10px]">{t('login.tagline')}</p>
        </div>

        <h2 className="text-xl font-black text-cream mb-2 uppercase tracking-tight">{t('login.heading')}</h2>
        <p className="text-gray-teal text-sm mb-6">{t('login.sub')}</p>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-teal uppercase tracking-wider">{t('field.email')}</label>
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
            <label className="text-xs font-bold text-gray-teal uppercase tracking-wider">{t('field.password')}</label>
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
                id="toggle-login-password"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-amber hover:shadow-brand-amber/20 text-brand-dark font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.btn')}
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
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-brand-surface border border-white/5 hover:border-brand-amber/30 text-cream font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span className="uppercase tracking-widest text-xs">Login with Google</span>
        </button>

        <p className="text-center mt-8 text-sm text-gray-teal">
          {t('login.noAccount')}{' '}
          <button onClick={() => navigate('/signup')} className="text-brand-amber font-black hover:underline uppercase tracking-widest text-xs">
            {t('login.signup')}
          </button>
        </p>
      </motion.div>
    </div>
  );
};
