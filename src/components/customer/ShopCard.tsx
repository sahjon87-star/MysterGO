import React from 'react';
import { Star, MapPin, Store } from 'lucide-react';
import { motion } from 'motion/react';
import { ShopProfile } from '../../types';

interface ShopCardProps {
  shop: ShopProfile;
  onClick: () => void;
}

export const ShopCard: React.FC<ShopCardProps> = ({ shop, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-brand-surface rounded-[32px] border border-white/5 shadow-2xl overflow-hidden flex flex-col cursor-pointer transition-all group min-w-[180px] h-[220px]"
    >
      <div className="h-28 bg-brand-dark flex items-center justify-center relative transition-colors">
        <div className="w-14 h-14 bg-brand-surface rounded-[24px] shadow-2xl flex items-center justify-center text-brand-amber group-hover:scale-110 transition-transform border border-white/5">
          <Store className="w-7 h-7" />
        </div>
        <div className="absolute top-3 right-3 bg-brand-amber text-brand-dark text-[7px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.2em] shadow-lg">
          AUTHENTIC
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="space-y-1">
          <h3 className="font-black text-white text-[11px] uppercase tracking-tighter truncate leading-none">
            {shop.shopName || 'Unnamed Depot'}
          </h3>
          <p className="text-[8px] font-black text-gray-teal uppercase tracking-widest">
            {shop.shopCategory?.replace('_', ' ') || 'Supply Node'}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 bg-brand-amber text-brand-dark px-2 py-1 rounded-lg">
            <Star className="w-2.5 h-2.5 fill-brand-dark text-brand-dark" />
            <span className="text-[9px] font-black">{(shop.rating || 0).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-brand-amber">
            <MapPin className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[60px]">
              {shop.shopAddress?.split(',')[0] || 'Base'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
