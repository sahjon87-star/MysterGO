import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { motion } from 'motion/react';
import { termsSections } from '../../constants/legal';

export const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-12 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        <button 
          onClick={() => navigate(-1)} 
          className="p-4 bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-brand-surface/50 text-slate-700 dark:text-cream transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="space-y-4">
          <div className="w-12 h-12 bg-primary-blue/10 dark:bg-primary-blue/20 rounded-2xl flex items-center justify-center text-primary-blue shadow-inner">
            <ScrollText size={24} />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-950 dark:text-cream tracking-tighter uppercase">User Agreement</h1>
            <p className="text-gray-teal dark:text-gray-teal font-bold uppercase text-[10px] tracking-[0.3em]">Complete Bangladesh Compliant Version • Last Updated June 2026</p>
          </div>
        </div>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-lg text-slate-600 dark:text-gray-teal font-medium leading-relaxed border-l-4 border-primary-blue pl-4 py-1 bg-primary-blue/5 dark:bg-primary-blue/10 rounded-r-xl">
            By registering, accessing, or utilizing the MistriGO platform, you explicitly agree to be bound by our Terms of Service, Privacy Policy, and local digital regulations.
          </p>

          <div className="space-y-8">
            {termsSections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={index} 
                  className="bg-brand-slate dark:bg-brand-dark border border-slate-100 dark:border-slate-800/50 p-6 sm:p-8 rounded-[30px] shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-brand-surface/50 flex items-center justify-center text-primary-blue">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-cream dark:text-cream text-base uppercase tracking-tight">{section.title}</h3>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-600 dark:text-gray-teal whitespace-pre-line pl-11">
                    {section.content}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
