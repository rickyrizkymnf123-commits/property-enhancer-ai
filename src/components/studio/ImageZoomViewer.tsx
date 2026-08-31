import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Download,
  X,
  Sparkles,
  Move,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ImageZoomViewerProps {
  imageUrl: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onDownload?: () => void;
  className?: string;
}

export const ImageZoomViewer: React.FC<ImageZoomViewerProps> = ({
  imageUrl,
  alt = 'High-Resolution Property Preview',
  isOpen,
  onClose,
  title = 'Pratinjau Resolusi Tinggi AI',
  onDownload,
  className = '',
}) => {
  const [scale, setScale] = useState<number>(1.0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset zoom & position whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1.0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // Keyboard shortcut listener (Escape to close, +/- to zoom)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(4.0, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(0.5, Math.round((prev - 0.25) * 100) / 100);
      if (next <= 1.0) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
  };

  const handleFit = () => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1.0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || scale <= 1.0) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging, scale]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    // Default download trigger
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `property_enhanced_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl transition-opacity animate-in fade-in select-none',
        className
      )}
      data-testid="zoom-viewer-modal"
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 h-16 px-6 bg-slate-950/80 border-b border-white/10 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
            <span className="text-xs text-slate-400 font-mono">
              Skala: {Math.round(scale * 100)}% {scale > 1 ? '• Klik & Geser untuk Menjelajah' : ''}
            </span>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-2">
          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
            data-testid="zoom-download-btn"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Unduh HD</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            data-testid="zoom-close-btn"
            aria-label="Tutup pratinjau"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Image Canvas */}
      <div
        className={cn(
          'w-full h-full pt-16 pb-20 flex items-center justify-center overflow-hidden',
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="transition-transform duration-75 ease-out max-w-full max-h-full flex items-center justify-center p-4"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            src={imageUrl}
            alt={alt}
            draggable={false}
            className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/10 select-none pointer-events-none"
            data-testid="zoom-image"
          />
        </div>
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center items-center z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 p-2 rounded-2xl bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-2xl pointer-events-auto">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Perkecil (-)"
            data-testid="zoom-out-btn"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Scale Indicator */}
          <span
            className="px-3 py-1 text-xs font-mono font-bold text-purple-300 min-w-[56px] text-center"
            data-testid="zoom-scale-text"
          >
            {Math.round(scale * 100)}%
          </span>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4.0}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Perbesar (+)"
            data-testid="zoom-in-btn"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
            title="Kembali ke 1:1"
            data-testid="zoom-reset-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>1:1</span>
          </button>

          {/* Fit to Screen */}
          <button
            type="button"
            onClick={handleFit}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
            title="Paskan Layar"
            data-testid="zoom-fit-btn"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageZoomViewer;
