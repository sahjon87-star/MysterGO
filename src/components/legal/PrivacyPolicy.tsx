import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { privacySections } from '../../constants/legal';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-12 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        <button 
          onClick={() => navigate(-1)} 
          className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="space-y-4">
          <div className="w-12 h-12 bg-primary-blue/10 dark:bg-primary-blue/20 rounded-2xl flex items-center justify-center text-primary-blue shadow-inner">
            <Shield size={24} />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Privacy Protocol</h1>
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Final Production Version • Last Updated June 2026</p>
          </div>
        </div>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed border-l-4 border-primary-blue pl-4 py-1 bg-primary-blue/5 dark:bg-primary-blue/10 rounded-r-xl">
            MistriGO is committed to the absolute integrity and security of your personal and professional data.
            This protocol outlines how we harvest, process, and protect information within our network.
          </p>

          <div className="space-y-8">
            {privacySections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={index} 
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 p-6 sm:p-8 rounded-[30px] shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-primary-blue">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">{section.title}</h3>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line pl-11">
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
