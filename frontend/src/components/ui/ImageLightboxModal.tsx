'use client';

import React from 'react';
import { X, Download, ExternalLink, ZoomIn } from 'lucide-react';
import { Button } from './Button';

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
  categoryBadge?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Clinical Image Viewer',
  subtitle,
  categoryBadge,
}) => {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-2xl shadow-2xl border border-surface-border overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border bg-surface-raised">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">{title}</h3>
                {categoryBadge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                    {categoryBadge}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </button>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
              title="Open Full Size in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* High-Resolution Image Container */}
        <div className="relative flex-1 overflow-auto bg-gray-950 flex items-center justify-center p-4 min-h-[360px] max-h-[75vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg select-none"
          />
        </div>
      </div>
    </div>
  );
};
