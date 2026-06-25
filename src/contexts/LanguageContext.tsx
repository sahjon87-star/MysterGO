import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'bn' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  bn: {
    'login.tagline': 'বাংলাদেশের সেরা সার্ভিস মার্কেটপ্লেস',
    'login.heading': 'আপনার অ্যাকাউন্টে লগইন করুন',
    'login.sub': 'স্বাগতম! নিচের যেকোনো পদ্ধতিতে লগইন করুন',
    'login.btn': 'লগইন করুন',
    'login.forgot': 'পাসওয়ার্ড ভুলে গেছেন?',
    'login.noAccount': 'অ্যাকাউন্ট নেই?',
    'login.signup': 'নিবন্ধন করুন',
    'nav.home': 'হোম',
    'nav.search': 'খুঁজুন',
    'nav.bookings': 'বুকিং',
    'nav.wallet': 'ওয়ালেট',
    'nav.profile': 'প্রোফাইল',
    'menu.bookings': 'আমার বুকিং',
    'menu.wallet': 'আমার ওয়ালেট',
    'menu.notifs': 'নোটিফিকেশন',
    'menu.settings': 'সেটিংস',
    'menu.help': 'সহায়তা কেন্দ্র',
    'menu.logout': 'লগআউট',
    'menu.jobs': 'আমার কাজ',
    'field.email': 'ইমেইল এড্রেস',
    'field.password': 'পাসওয়ার্ড',
  },
  en: {
    'login.tagline': "Bangladesh's Best Service Marketplace",
    'login.heading': 'Sign in to your account',
    'login.sub': 'Welcome! Choose a sign-in method',
    'login.btn': 'Sign In',
    'login.forgot': 'Forgot password?',
    'login.noAccount': "Don't have an account?",
    'login.signup': 'Sign Up',
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.bookings': 'Bookings',
    'nav.wallet': 'Wallet',
    'nav.profile': 'Profile',
    'menu.bookings': 'My Bookings',
    'menu.wallet': 'My Wallet',
    'menu.notifs': 'Notifications',
    'menu.settings': 'Settings',
    'menu.help': 'Help Center',
    'menu.logout': 'Logout',
    'menu.jobs': 'My Jobs',
    'field.email': 'Email Address',
    'field.password': 'Password',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>((localStorage.getItem('nsbd_lang') as Language) || 'bn');

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('nsbd_lang', newLang);
  };

  const t = (key: string) => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
