import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { OnboardingPage } from './components/auth/OnboardingPage';
import { ChatPage } from './components/shared/ChatPage';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';
import { HelpCenter } from './components/legal/HelpCenter';
import { ReferralPage } from './components/shared/ReferralPage';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { SetupRequired } from './components/shared/SetupRequired';
import { isConfigured } from './lib/firebase';
import { Toaster } from 'react-hot-toast';
import { motion } from 'motion/react';
import { Logo } from './components/shared/Logo';

import { CustomerLayout } from './components/customer/CustomerLayout';
import { ProviderLayout } from './components/provider/ProviderLayout';
import { ShopLayout } from './components/shop/ShopLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { FCMHandler } from './components/shared/FCMHandler';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'customer' | 'provider' | 'shop_owner' | 'admin' }> = ({ children, role }) => {
  const { user, profile: authProfile, loading, isAdmin, isProvider, isShopOwner, isCustomer } = useAuth();
  const profile = authProfile as any;
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark text-cream">
    <motion.div 
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center text-center px-6"
    >
      {/* Centered Premium Squircle Brand Logo */}
      <Logo iconOnly size="xl" className="mb-6 filter drop-shadow-[0_10px_20px_rgba(245,158,11,0.15)] animate-pulse" />
      
      {/* Title */}
      <h1 className="text-4xl font-black tracking-tight text-cream mb-2">
        Mistri<span className="text-brand-amber italic">GO</span>
      </h1>
      
      {/* Subtext with wide tracking */}
      <p className="text-[11px] font-extrabold uppercase tracking-[0.35em] text-gray-teal opacity-80 mb-8">
        Expert Service Providers
      </p>

      {/* Modern, sleek custom loading bar instead of generic spinner */}
      <div className="w-32 h-1 bg-brand-surface rounded-full overflow-hidden relative border border-white/5">
        <motion.div 
          initial={{ left: "-100%" }}
          animate={{ left: "100%" }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-brand-amber to-transparent"
        />
      </div>
    </motion.div>
  </div>;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  // If no profile exists yet (e.g. first Google login) or onboarding not finished
  if (!profile || !profile.onboardingComplete) {
    // Prevent infinite redirect if already on onboarding
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  const checkRole = () => {
    if (role === 'admin' && !isAdmin) return true;
    if (role === 'provider' && !isProvider) return true;
    if (role === 'shop_owner' && !isShopOwner) return true;
    if (role === 'customer' && !isCustomer) return true;
    return false;
  };

  if (checkRole()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark text-cream p-6">
        <div className="bg-brand-slate border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-glass-var">
          <h2 className="text-xl font-black text-brand-amber uppercase tracking-widest">Access Denied</h2>
          <p className="text-gray-teal text-sm leading-relaxed">
            You do not have the required permissions to view this page. Please log in with the correct account type or return to your dashboard.
          </p>
          <div className="pt-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-brand-surface hover:bg-white/10 text-cream py-3 rounded-xl font-bold transition-all border border-white/5"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const PanelRouter: React.FC = () => {
  const { profile, isAdmin, isProvider, isShopOwner, isCustomer } = useAuth();
  const location = useLocation();
  const isRoot = location.pathname === '/';

  if (isRoot) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isProvider) return <Navigate to="/pro" replace />;
    if (isShopOwner) return <Navigate to="/merchant" replace />;
  }

  if (!isCustomer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark text-cream p-6">
        <div className="bg-brand-slate border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-black text-brand-amber uppercase tracking-widest">Access Denied</h2>
          <p className="text-gray-teal text-sm leading-relaxed">
            This section is reserved for customers. As a service provider, merchant, or administrator, please use your dedicated dashboard.
          </p>
          <div className="pt-4 flex gap-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-brand-surface hover:bg-white/10 text-cream py-3 rounded-xl font-bold transition-all border border-white/5"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return <CustomerLayout />;
};

import { LocationProvider } from './contexts/LocationContext';

const KYCRedirect: React.FC = () => {
  const { isProvider, isShopOwner } = useAuth();
  if (isProvider) return <Navigate to="/pro/kyc" replace />;
  if (isShopOwner) return <Navigate to="/merchant/kyc" replace />;
  return <Navigate to="/" replace />;
};

const JobRedirect: React.FC = () => {
  const { jobId } = useParams();
  const { isProvider } = useAuth();
  if (isProvider) return <Navigate to={`/pro/job/${jobId}`} replace />;
  return <Navigate to={`/booking-status/${jobId}`} replace />;
};

export default function App() {
  if (!isConfigured) {
    return (
      <Router>
        <SetupRequired />
      </Router>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <LocationProvider>
              <Toaster 
                position="top-center" 
                reverseOrder={false} 
                toastOptions={{
                  style: {
                    background: '#1F2937', // High contrast dark slate
                    color: '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <FCMHandler />
              <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center transition-colors duration-300">
                <div className="w-full min-h-screen bg-brand-dark flex flex-col overflow-hidden relative transition-all duration-300">
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/onboarding" element={
                      <ProtectedRoute>
                        <OnboardingPage />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/kyc" element={
                      <ProtectedRoute>
                        <KYCRedirect />
                      </ProtectedRoute>
                    } />

                    <Route path="/job/:jobId" element={
                      <ProtectedRoute>
                        <JobRedirect />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/chat/:chatId" element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    } />

                    <Route path="/privacy" element={
                      <ProtectedRoute>
                        <PrivacyPolicy />
                      </ProtectedRoute>
                    } />

                    <Route path="/terms" element={
                      <ProtectedRoute>
                        <TermsOfService />
                      </ProtectedRoute>
                    } />

                    <Route path="/help" element={
                      <ProtectedRoute>
                        <HelpCenter />
                      </ProtectedRoute>
                    } />

                    <Route path="/referral" element={
                      <ProtectedRoute>
                        <ReferralPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* Provider Panel */}
                    <Route path="/pro/*" element={
                      <ProtectedRoute role="provider">
                        <ProviderLayout />
                      </ProtectedRoute>
                    } />

                    {/* Shop Panel */}
                    <Route path="/merchant/*" element={
                      <ProtectedRoute role="shop_owner">
                        <ShopLayout />
                      </ProtectedRoute>
                    } />

                    {/* Admin Panel */}
                    <Route path="/admin/*" element={
                      <ProtectedRoute role="admin">
                        <AdminLayout />
                      </ProtectedRoute>
                    } />

                    {/* Customer Panel / Default */}
                    <Route path="/*" element={
                      <ProtectedRoute>
                        <PanelRouter />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </div>
              </div>
            </LocationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
      </ErrorBoundary>
    </Router>
  );
}
