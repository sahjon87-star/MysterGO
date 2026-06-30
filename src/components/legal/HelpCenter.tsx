import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Search, 
  MessageSquare, 
  Phone, 
  Mail, 
  ArrowRight, 
  HelpCircle, 
  FileText, 
  ShieldCheck, 
  Zap, 
  AlertCircle,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const faqs = [
    { q: 'How to book a mistri?', a: 'Go to home, select category, pick a worker and click "Hire Now".' },
    { q: 'Is the service safe?', a: 'Yes, all workers are NID verified and tracked via GPS.' },
    { q: 'How do I pay?', a: 'You can pay using bKash, Nagad or Cash after work is done.' },
    { q: 'What if work is bad?', a: 'You can file a dispute within 24 hours of completion.' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <div className="bg-brand-dark px-4 pt-10 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-blue/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        
        <div className="relative z-10 flex items-center justify-between mb-8">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-cream/50 hover:text-cream transition-colors">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black text-cream uppercase tracking-tight">Help Center</h1>
            <p className="text-[9px] font-black text-gray-teal uppercase tracking-[0.3em]">Support Hub</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="relative z-10 w-full">
           <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-teal">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                placeholder="Search help articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[28px] pl-16 pr-6 py-6 text-cream placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary-blue transition-all shadow-xl"
              />
           </div>
        </div>
      </div>

      <div className="w-full px-4 -mt-8 relative z-20 space-y-8">
        {/* Support Options */}
        <div className="grid grid-cols-2 gap-4">
           <button className="bg-brand-slate dark:bg-brand-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center gap-3 text-center group active:scale-95 transition-all">
              <div className="w-14 h-14 bg-primary-blue/10 rounded-2xl flex items-center justify-center text-primary-blue group-hover:scale-110 transition-transform">
                 <MessageSquare className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase text-slate-700 dark:text-cream tracking-widest">Live Chat</span>
           </button>
           <button 
             onClick={() => window.open('tel:01700000000')}
             className="bg-brand-slate dark:bg-brand-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center gap-3 text-center group active:scale-95 transition-all"
           >
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                 <Phone className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase text-slate-700 dark:text-cream tracking-widest">Call Center</span>
           </button>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] px-4">Topics</h3>
          <div className="bg-brand-slate dark:bg-brand-dark rounded-[40px] border border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm">
            {[
              { label: 'Booking & Requests', icon: BookOpen, color: 'text-primary-blue' },
              { label: 'Payment & Wallet', icon: Zap, color: 'text-action-orange' },
              { label: 'Privacy & Safety', icon: ShieldCheck, color: 'text-green-500' },
              { label: 'Account Settings', icon: AlertCircle, color: 'text-gray-teal' }
            ].map((topic, i) => (
              <button key={i} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-brand-surface transition-colors border-b last:border-0 border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <topic.icon className={`w-5 h-5 ${topic.color}`} />
                  <span className="text-sm font-bold text-slate-700 dark:text-cream">{topic.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-cream" />
              </button>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4 pb-20">
          <h3 className="text-[10px] font-black text-gray-teal uppercase tracking-[0.3em] px-4">Common Questions</h3>
          <div className="space-y-3">
             {faqs.map((f, i) => (
               <details key={i} className="group bg-brand-slate dark:bg-brand-dark rounded-[28px] border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <summary className="list-none p-6 flex items-center justify-between cursor-pointer">
                    <h4 className="text-sm font-bold text-cream dark:text-cream pr-6 leading-tight">{f.q}</h4>
                    <ChevronRight className="w-5 h-5 text-cream transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-6 pb-6 text-xs font-medium text-gray-teal leading-relaxed">
                    {f.a}
                  </div>
               </details>
             ))}
          </div>
        </div>
      </div>

       {/* Footer Contact */}
       <div className="fixed bottom-0 left-0 right-0 p-4 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-40 text-center">
          <button className="text-[10px] font-black text-primary-blue uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
             <Mail className="w-4 h-4" /> Send us an Email
          </button>
       </div>
    </div>
  );
};
