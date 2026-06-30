import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ScrollText, ShieldAlert } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  title: string;
  content: { title: string; icon: any; content: string }[];
  type: 'terms' | 'privacy';
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose, onAccept, title, content, type }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // More robust check for bottom detection (within 5px)
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;
      if (isAtBottom || scrollHeight <= clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      // Check if content is already at bottom (short content) after a short delay for rendering
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          const { scrollHeight, clientHeight } = scrollRef.current;
          if (scrollHeight <= clientHeight) {
            setHasScrolledToBottom(true);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-brand-slate dark:bg-brand-dark rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-brand-slate dark:bg-brand-dark sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${type === 'terms' ? 'bg-action-orange/10 text-action-orange' : 'bg-primary-blue/10 text-primary-blue'}`}>
                  {type === 'terms' ? <ScrollText className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="font-black text-cream dark:text-cream uppercase tracking-tight">{title}</h2>
                  <p className="text-[10px] font-bold text-gray-teal dark:text-gray-teal uppercase tracking-widest">Please read to the bottom</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-brand-surface rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-teal" />
              </button>
            </div>

            {/* Content */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-gray-teal font-medium italic">
                  To protect your rights and ensure a safe environment, please review our {title.toLowerCase()} carefully.
                </p>
                {content.map((section, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <section.icon className={`w-4 h-4 ${type === 'terms' ? 'text-action-orange' : 'text-primary-blue'}`} />
                      <h3 className="text-sm font-black text-cream dark:text-cream uppercase tracking-wide">{section.title}</h3>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-teal dark:text-gray-teal pl-6">
                      {section.content}
                    </p>
                  </div>
                ))}
                
                {/* Bottom Marker */}
                <div className="pt-8 pb-4 text-center">
                  <button 
                    onClick={scrollToBottom}
                    disabled={hasScrolledToBottom}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${hasScrolledToBottom ? 'bg-primary-blue/10 border-primary-blue/20 text-primary-blue' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-gray-teal hover:border-primary-blue/30 active:scale-95'}`}
                  >
                    {hasScrolledToBottom ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {hasScrolledToBottom ? 'End of Document Reached' : 'Click to scroll to bottom'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-brand-surface/50">
              <button
                disabled={!hasScrolledToBottom}
                onClick={onAccept}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg ${
                  hasScrolledToBottom 
                    ? 'bg-primary-blue text-cream shadow-primary-blue/20 active:scale-95' 
                    : 'bg-slate-200 dark:bg-slate-700 text-gray-teal cursor-not-allowed'
                }`}
              >
                {hasScrolledToBottom ? 'I Agree & Accept' : 'Read to the bottom'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
