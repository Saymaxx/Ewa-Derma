import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentTop?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  accentTop = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-surface-card rounded-xl border border-surface-border shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden',
          accentTop && 'border-t-4 border-t-accent',
          className,
        ),
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx('px-6 py-4 border-b border-surface-border flex items-center justify-between', className),
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3
      className={twMerge(
        clsx('text-base font-semibold text-text-primary tracking-tight', className),
      )}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={twMerge(clsx('p-6', className))} {...props}>
      {children}
    </div>
  );
};
