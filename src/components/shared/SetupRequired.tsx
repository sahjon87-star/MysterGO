import React from 'react';
import { ShieldAlert, Terminal, Settings, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export const SetupRequired: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-primary-blue selection:text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-blue/10 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -ml-48 -mb-48" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-slate-900/50 backdrop-blur-2xl rounded-[48px] border border-white/10 shadow-glass p-12 text-center space-y-10 relative z-10"
      >
        <div className="flex flex-col items-center gap-6">
          <Logo iconOnly className="h-20 w-20" />
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-tight">
              Initialization <span className="text-primary-blue">Paused</span>
            </h2>
            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">
              Operational Matrix Requires Configuration
            </p>
          </div>
        </div>

        <div className="p-8 bg-slate-950/50 rounded-[32px] border border-white/5 space-y-6 text-left">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 bg-primary-blue/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary-blue/20">
              <ShieldAlert className="w-6 h-6 text-primary-blue" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-black text-xs uppercase tracking-widest">Missing Protocol Keys</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                The application instance has detected missing Firebase environment variables. Real-time directive synchronization and security protocols are currently dormant.
              </p>
            </div>
          </div>

          <div className="space-y-3">
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
               <Terminal className="w-3 h-3" /> Required Directives
             </div>
             <div className="grid grid-cols-1 gap-2">
                {[
                  'VITE_FIREBASE_API_KEY',
                  'VITE_FIREBASE_PROJECT_ID',
                  'VITE_FIREBASE_AUTH_DOMAIN'
                ].map((key) => (
                  <div key={key} className="bg-slate-900 px-4 py-3 rounded-xl border border-white/5 font-mono text-[9px] text-primary-light/70 flex items-center justify-between">
                    <span>{key}</span>
                    <span className="text-action-orange/50">MISSING</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
              Activate the Firebase Setup in the AI Studio environment or provide manual credentials in the settings terminal.
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] flex-1 bg-white/5" />
              <Settings className="w-4 h-4 text-slate-700" />
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-white text-slate-950 rounded-[24px] font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:bg-primary-blue hover:text-white transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            Re-Scan Operational Environment
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
