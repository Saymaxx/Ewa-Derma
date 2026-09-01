import React, { TableHTMLAttributes, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Table: React.FC<TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-surface-border bg-white shadow-sm">
      <table className={twMerge(clsx('w-full text-left text-sm', className))} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <thead
      className={twMerge(
        clsx('bg-surface text-xs uppercase text-text-secondary tracking-wider border-b border-surface-border', className),
      )}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tbody className={twMerge(clsx('divide-y divide-surface-border', className))} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tr
      className={twMerge(
        clsx('hover:bg-primary-50/40 transition-colors duration-100', className),
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <th
      className={twMerge(clsx('px-4 py-3 font-semibold text-text-primary', className))}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableCell: React.FC<TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <td className={twMerge(clsx('px-4 py-3.5 text-text-primary', className))} {...props}>
      {children}
    </td>
  );
};
