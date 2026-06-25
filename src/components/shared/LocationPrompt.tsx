import React from 'react';
import { MapPin, AlertTriangle, Settings, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from '../../contexts/LocationContext';

export const LocationPrompt: React.FC = () => {
  const { status, requestLocation, location } = useLocation();

  if (status === 'granted') {
    return (
      <div className="fixed top-2 left-0 right-0 w-full z-[110] pointer-events-none flex justify-end px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2 shadow-sm"
        >
          <div className="relative">
            <Radio className="w-3 h-3 text-emerald-500" />
            <span className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-[10px] font-black text-slate-600 dark:text-emerald-500 uppercase tracking-widest leading-none">Live</span>
          {location && (
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-none">
              {(location.accuracy || 0) < 50 ? 'High Accuracy' : 'Calculating...'}
            </span>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-20 left-4 right-4 z-[100] w-full"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${status === 'denied' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
              {status === 'denied' ? <AlertTriangle className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">
                {status === 'denied' ? 'Location Required' : 'Enable Location'}
              </h3>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed">
                {status === 'denied' 
                  ? 'We need your location to show nearby services and shops. Please enable it in your browser settings.' 
                  : 'MistriGO needs your location to find the best workers and shops near you.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {status === 'denied' ? (
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-900 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Reload & Retry
              </button>
            ) : (
              <button 
                onClick={requestLocation}
                disabled={status === 'checking'}
                className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
              >
                {status === 'checking' ? 'Checking...' : 'Allow Location'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
