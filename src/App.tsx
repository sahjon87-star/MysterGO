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
import { LocationPrompt } from './components/shared/LocationPrompt';
import { FCMHandler } from './components/shared/FCMHandler';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'customer' | 'provider' | 'shop_owner' | 'admin' }> = ({ children, role }) => {
  const { user, profile: authProfile, loading, isAdmin, isProvider, isShopOwner, isCustomer } = useAuth();
  const profile = authProfile as any;
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#121316] text-white">
    <motion.div 
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center text-center px-6"
    >
      {/* Centered Premium Squircle Brand Logo */}
      <Logo iconOnly size="xl" className="mb-6 filter drop-shadow-[0_10px_20px_rgba(255,90,0,0.15)] animate-pulse" />
      
      {/* Title */}
      <h1 className="text-4xl font-black tracking-tight text-white mb-2">
        Mistri<span className="text-[#FF5A00] italic">GO</span>
      </h1>
      
      {/* Subtext with wide tracking */}
      <p className="text-[11px] font-extrabold uppercase tracking-[0.35em] text-[#8E9CAE] opacity-80 mb-8">
        Expert Service Providers
      </p>

      {/* Modern, sleek custom loading bar instead of generic spinner */}
      <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
        <motion.div 
          initial={{ left: "-100%" }}
          animate={{ left: "100%" }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[#FF5A00] to-transparent"
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

  if (role === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  if (role === 'provider' && !isProvider) return <Navigate to="/" replace />;
  if (role === 'shop_owner' && !isShopOwner) return <Navigate to="/" replace />;
  if (role === 'customer' && !isCustomer) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const PanelRouter: React.FC = () => {
  const { profile, isAdmin, isProvider, isShopOwner } = useAuth();
  const location = useLocation();
  const isRoot = location.pathname === '/';

  if (isRoot) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isProvider) return <Navigate to="/pro" replace />;
    if (isShopOwner) return <Navigate to="/merchant" replace />;
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
              <Toaster position="top-center" reverseOrder={false} />
              <LocationPrompt />
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
