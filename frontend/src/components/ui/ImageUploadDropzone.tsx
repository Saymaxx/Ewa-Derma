'use client';

import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, X, CheckCircle2, Loader2, Eye, RefreshCw, FileImage } from 'lucide-react';
import { uploadClinicalImage } from '@/lib/upload-service';

export interface ImageUploadDropzoneProps {
  label?: string;
  subLabel?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: 'clinical-photos' | 'prescriptions' | 'patient-documents';
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  className?: string;
  required?: boolean;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  label = 'Upload Photo',
  subLabel = 'PNG, JPG, WebP up to 10MB (Auto-compressed)',
  value,
  onChange,
  folder = 'clinical-photos',
  aspectRatio = 'auto',
  className = '',
  required = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);
    setProgress(10);

    try {
      const result = await uploadClinicalImage(file, folder, (percent) => {
        setProgress(percent);
      });
      onChange(result.url);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process and upload image');
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setErrorMsg(null);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text-primary flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      )}

      {/* Upload Box or Image Preview */}
      {value ? (
        <div className="relative group rounded-xl border border-surface-border overflow-hidden bg-surface shadow-xs transition-all">
          <div className="relative w-full min-h-[160px] max-h-[260px] flex items-center justify-center bg-gray-900/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-full h-full object-contain max-h-[260px] rounded-lg"
            />

            {/* Hover Actions Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white/90 hover:bg-white text-gray-900 rounded-full shadow-md text-xs font-semibold flex items-center gap-1 transition-transform hover:scale-105"
                title="View Full Size"
              >
                <Eye className="w-4 h-4 text-primary" />
                <span>View</span>
              </a>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white/90 hover:bg-white text-gray-900 rounded-full shadow-md text-xs font-semibold flex items-center gap-1 transition-transform hover:scale-105"
                title="Replace Photo"
              >
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md text-xs font-semibold flex items-center gap-1 transition-transform hover:scale-105"
                title="Remove Photo"
              >
                <X className="w-4 h-4" />
                <span>Remove</span>
              </button>
            </div>

            {/* Badge Indicator */}
            <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs pointer-events-none">
              <CheckCircle2 className="w-3 h-3" />
              <span>Ready</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-gray-300 hover:border-primary/60 bg-surface/50 hover:bg-surface'
          } ${isUploading ? 'pointer-events-none opacity-80' : ''}`}
        >
          {isUploading ? (
            <div className="py-4 flex flex-col items-center space-y-2.5">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <div className="text-xs font-semibold text-text-primary">
                Compressing & Uploading ({progress}%)...
              </div>
              <div className="w-48 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-text-primary flex items-center justify-center gap-1">
                  <span>Take photo or click to browse</span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">{subLabel}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />
    </div>
  );
};
