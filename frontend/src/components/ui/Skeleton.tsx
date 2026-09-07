'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx('animate-pulse bg-surface-border/70 rounded-lg', className),
      )}
      {...props}
    />
  );
};

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 5,
  rows = 5,
  className = '',
}) => {
  return (
    <div className={twMerge('w-full overflow-hidden', className)}>
      <div className="bg-surface/60 border-b border-surface-border px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton key={`th-${idx}`} className="h-4 flex-1 max-w-[140px]" />
        ))}
      </div>
      <div className="divide-y divide-surface-border/50">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`tr-${rIdx}`} className="px-4 py-3.5 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <Skeleton
                key={`td-${rIdx}-${cIdx}`}
                className={clsx(
                  'h-4 flex-1',
                  cIdx === 0 ? 'max-w-[120px]' : cIdx === columns - 1 ? 'max-w-[80px]' : 'max-w-[180px]',
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export interface CardSkeletonProps {
  lines?: number;
  rows?: number;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  lines,
  rows,
  className = '',
}) => {
  const lineCount = rows ?? lines ?? 3;
  return (
    <div
      className={twMerge(
        'p-5 rounded-2xl bg-white border border-surface-border shadow-xs space-y-4',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: lineCount }).map((_, idx) => (
          <Skeleton
            key={idx}
            className={clsx(
              'h-3.5',
              idx === lineCount - 1 ? 'w-2/3' : 'w-full',
            )}
          />
        ))}
      </div>
    </div>
  );
};

export interface StatGridSkeletonProps {
  count?: number;
  className?: string;
}

export const StatGridSkeleton: React.FC<StatGridSkeletonProps> = ({
  count = 4,
  className = '',
}) => {
  return (
    <div
      className={twMerge(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 rounded-2xl bg-white border border-surface-border shadow-xs flex items-center justify-between"
        >
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
          <Skeleton className="w-10 h-10 rounded-xl" />
        </div>
      ))}
    </div>
  );
};
