import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'default';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors';

  const variants = {
    primary: 'bg-primary-50 text-primary-700 border border-primary-200',
    accent: 'bg-accent-50 text-accent-700 border border-accent-200',
    success: 'bg-status-success-bg text-status-success border border-green-200',
    warning: 'bg-status-warning-bg text-status-warning border border-amber-200',
    danger: 'bg-status-danger-bg text-status-danger border border-red-200',
    info: 'bg-status-info-bg text-status-info border border-blue-200',
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
  };

  const dotColors = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
    info: 'bg-status-info',
    default: 'bg-gray-500',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};
