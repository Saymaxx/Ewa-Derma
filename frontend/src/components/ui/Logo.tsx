import React from 'react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon-only';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'full', className = '' }) => {
  const imageSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
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
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official Ewa Derma Circular Badge Logo */}
      <div
        className={`${imageSizes[size]} rounded-full overflow-hidden shadow-md relative shrink-0 border-2 border-accent/40 bg-white hover:scale-105 transition-transform`}
      >
        <img
          src="/ewa-derma-logo.jpg"
          alt="Ewa Derma Clinic Logo"
          className="w-full h-full object-cover"
        />
      </div>

      {variant === 'full' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`${textSizes[size]} text-primary font-serif font-extrabold tracking-tight`}>
              EWA DERMA
            </span>
          </div>
          <span className={`${subtitleSizes[size]} text-accent font-bold uppercase tracking-wider -mt-1`}>
            SKIN • HAIR • CLINIC
          </span>
        </div>
      )}
    </div>
  );
};
