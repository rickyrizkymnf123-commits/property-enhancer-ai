import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PhotoUploaderProps {
  onFileSelect: (file: File | null, previewUrl: string | null) => void;
  selectedFile?: File | null;
  previewUrl?: string | null;
  disabled?: boolean;
  maxSizeBytes?: number; // default: 15MB
  className?: string;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onFileSelect,
  selectedFile = null,
  previewUrl = null,
  disabled = false,
  maxSizeBytes = 15 * 1024 * 1024, // 15MB
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const validateFile = useCallback(
    (file: File): { valid: boolean; error: string | null } => {
      // Check file extension
      const fileName = file.name.toLowerCase();
      const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(ext));

      // Check MIME type
      const hasValidMime = allowedMimeTypes.includes(file.type.toLowerCase()) || hasValidExt;

      if (!hasValidMime || !hasValidExt) {
        return {
          valid: false,
          error: 'Format file tidak didukung. Harap gunakan format JPG, PNG, atau WEBP.',
        };
      }

      if (file.size > maxSizeBytes) {
        const sizeMb = Math.round(maxSizeBytes / (1024 * 1024));
        return {
          valid: false,
          error: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas maksimal ${sizeMb}MB.`,
        };
      }

      return { valid: true, error: null };
    },
    [maxSizeBytes]
  );

  const handleFile = useCallback(
    (file: File) => {
      setErrorMessage(null);
      const validation = validateFile(file);

      if (!validation.valid) {
        setErrorMessage(validation.error);
        onFileSelect(null, null);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      onFileSelect(file, objectUrl);
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileSelect(null, null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={cn('w-full space-y-2', className)} data-testid="photo-uploader">
      {/* Dropzone Container */}
      <div
        onClick={() => !disabled && !selectedFile && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center min-h-[220px] p-6 text-center backdrop-blur-md',
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-900/40 border-white/5'
            : selectedFile
            ? 'bg-slate-900/90 border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.15)] cursor-default'
            : isDragOver
            ? 'bg-purple-950/40 border-purple-400 scale-[1.01] shadow-[0_0_30px_rgba(168,85,247,0.3)] cursor-pointer'
            : 'bg-slate-900/60 border-white/15 hover:border-purple-400/60 hover:bg-slate-900/80 cursor-pointer'
        )}
        data-testid="dropzone-area"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          data-testid="photo-file-input"
        />

        {selectedFile && previewUrl ? (
          /* Selected File Preview View */
          <div className="w-full flex flex-col sm:flex-row items-center gap-4 justify-between" data-testid="preview-container">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-950 border border-white/20 shrink-0 shadow-lg group">
                <img
                  src={previewUrl}
                  alt={selectedFile.name}
                  className="w-full h-full object-cover"
                  data-testid="photo-preview-image"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <span className="text-[10px] text-white font-mono uppercase">Preview</span>
                </div>
              </div>

              <div className="text-left overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span className="uppercase text-purple-300 font-semibold">{selectedFile.name.split('.').pop()}</span>
                </div>
                <div className="text-xs text-emerald-400/90 mt-1 flex items-center gap-1 font-medium">
                  <span>Siap ditingkatkan</span>
                </div>
              </div>
            </div>

            {/* Remove / Change File Button */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                data-testid="remove-photo-btn"
              >
                <X className="w-4 h-4" />
                <span>Ganti Foto</span>
              </button>
            )}
          </div>
        ) : (
          /* Empty Upload State */
          <div className="flex flex-col items-center space-y-3 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/20 via-purple-500/10 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <UploadCloud className="w-8 h-8 text-purple-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-1">
                Tarik & Lepas Foto Properti ke Sini, atau{' '}
                <span className="text-purple-400 underline underline-offset-4">Pilih File</span>
              </p>
              <p className="text-xs text-slate-400">
                Mendukung format <strong className="text-slate-300">JPG, PNG, WEBP</strong> (Maksimal 15MB)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 border border-white/5 text-slate-300 font-mono">
                JPG
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 border border-white/5 text-slate-300 font-mono">
                PNG
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 border border-white/5 text-slate-300 font-mono">
                WEBP
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 font-mono">
                Maks 15MB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Validation Error Alert */}
      {errorMessage && (
        <div
          className="flex items-center gap-2.5 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs font-medium backdrop-blur-md shadow-sm"
          data-testid="upload-error-alert"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
