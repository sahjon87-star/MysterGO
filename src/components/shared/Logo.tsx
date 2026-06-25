import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'default' | 'admin' | 'pro' | 'merchant';
}

export const Logo: React.FC<LogoProps> = ({ className, iconOnly, variant = 'default' }) => {
  // Use the MistriGO branding colors and "G" symbol
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110",
        "bg-brand-blue"
      )}>
        <span className="text-white font-black text-2xl">G</span>
      </div>
      {!iconOnly && (
        <span className="font-black text-2xl tracking-tight text-cream">
          Mistri<span className="text-brand-amber">GO</span>
          {variant !== 'default' && (
            <span className="text-xs ml-1 opacity-50 uppercase tracking-widest">
              {variant}
            </span>
          )}
        </span>
      )}
    </div>
  );
};
