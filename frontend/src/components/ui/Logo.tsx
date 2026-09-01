import React from 'react';
import { Sparkles } from 'lucide-react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon-only';
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'full' }) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  };

  const textSizes = {
    sm: 'text-base font-bold tracking-tight',
    md: 'text-xl font-bold tracking-tight',
    lg: 'text-2xl font-bold tracking-tight',
  };

  const subtitleSizes = {
    sm: 'text-[9px] tracking-widest',
    md: 'text-[11px] tracking-widest',
    lg: 'text-[13px] tracking-widest',
  };

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Clinic Monogram Icon with Gold Accent */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-md relative overflow-hidden shrink-0 border border-primary-light/30`}
      >
        <span className="font-serif font-extrabold text-white tracking-tighter">ED</span>
        {/* Subtle Gold accent pin */}
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent ring-2 ring-white/50" />
      </div>

      {variant === 'full' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`${textSizes[size]} text-primary font-serif font-bold`}>
              EWA DERMA
            </span>
          </div>
          <span
            className={`${subtitleSizes[size]} text-accent font-semibold uppercase -mt-1`}
          >
            CLINIC MANAGEMENT
          </span>
        </div>
      )}
    </div>
  );
};
