import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'default' | 'admin' | 'pro' | 'merchant';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className, iconOnly, variant = 'default', size = 'md' }) => {
  // Size dimensions
  const dimensions = {
    sm: { box: 'w-8 h-8', text: 'text-lg', markSize: 32 },
    md: { box: 'w-10 h-10', text: 'text-2xl', markSize: 40 },
    lg: { box: 'w-16 h-16', text: 'text-4xl', markSize: 64 },
    xl: { box: 'w-24 h-24', text: 'text-5xl', markSize: 96 }
  }[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* perfectly balanced squircle presentation (rounded corner square) with logo mark set flat against dark charcoal slate */}
      <div className={cn(
        "rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 bg-[#121316] border border-white/5",
        dimensions.box
      )}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="p-1.5"
        >
          {/* Stylized M - Left half in solid white for structural stability and trust */}
          <rect x="23" y="32" width="10" height="34" rx="4" fill="#FFFFFF" />
          <path d="M 33 32 L 50 78 L 50 60 L 33 32 Z" fill="#FFFFFF" />

          {/* Stylized M - Right half in vibrant Neon Orange (#FF5A00) for motion, acceleration, and speed */}
          <rect x="67" y="32" width="10" height="34" rx="4" fill="#FF5A00" />
          <path d="M 67 32 L 50 78 L 50 60 L 67 32 Z" fill="#FF5A00" />

          {/* Location Map Pin - A sharp V-shaped point at (50,78) with a pinhole cutout */}
          <circle cx="50" cy="50" r="5" fill="#121316" />

          {/* Wrench Tool - Circular head integrated into upper-right vertex of the M with a jaw cutout at 45 degrees */}
          <circle cx="72" cy="28" r="9" fill="#FF5A00" />
          {/* Rotating jaw cutout */}
          <path d="M 72 28 L 78 22 A 6 6 0 0 0 70 20 L 72 28 Z" fill="#121316" />
          <circle cx="72" cy="28" r="3.5" fill="#121316" />
        </svg>
      </div>

      {!iconOnly && (
        <span className={cn("font-black tracking-tight text-slate-900 dark:text-white flex items-center", dimensions.text)}>
          Mistri
          <span className="text-[#FF5A00] italic ml-0.5">GO</span>
          {variant !== 'default' && (
            <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[#FF5A00] font-bold uppercase tracking-wider scale-90">
              {variant}
            </span>
          )}
        </span>
      )}
    </div>
  );
};

