import React from 'react';
import { Star, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { ProviderProfile } from '../../types';
import { formatCurrency, getInitials } from '../../lib/utils';

interface WorkerCardProps {
  worker: ProviderProfile;
  displayPrice?: number;
  onClick: () => void;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({ worker, displayPrice, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex-shrink-0 w-48 bg-brand-surface rounded-[32px] border border-white/5 shadow-2xl p-5 cursor-pointer transition-all group overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-[24px] bg-brand-dark flex items-center justify-center overflow-hidden border-2 border-white/10 shadow-2xl transition-transform group-hover:scale-110">
          {worker.photoURL ? (
            <img 
              src={worker.photoURL} 
              className="w-full h-full object-cover" 
              alt={worker.name} 
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-brand-amber font-black text-xl">{getInitials(worker.name)}</span>
          )}
        </div>
        {worker.isOnline && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-[4px] border-brand-surface rounded-full shadow-lg pulse" />
        )}
      </div>
      
      <div className="space-y-1 mb-4">
        <h3 className="font-black text-cream text-sm uppercase tracking-tight truncate">{worker.name}</h3>
        <div className="flex items-center gap-2">
          <p className="text-gray-teal text-[8px] font-black uppercase tracking-[0.2em]">{worker.skill || worker.providerType}</p>
          <div className="w-1 h-1 bg-brand-amber rounded-full" />
          <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">
            OPERATIONAL
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
        <div className="flex flex-col">
          <span className="text-cream font-black text-lg leading-none">
            {formatCurrency(displayPrice || worker.hourlyRate)}
          </span>
          <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest mt-1">/ CYCLE</span>
        </div>
        <div className="flex items-center gap-1.5 bg-brand-amber text-brand-dark px-3 py-1.5 rounded-xl shadow-lg">
          <Star className="w-2.5 h-2.5 fill-brand-dark text-brand-dark" />
          <span className="text-[10px] font-black">{(worker.rating || 0).toFixed(1)}</span>
        </div>
      </div>
    </motion.div>
  );
};
