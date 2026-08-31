import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronsLeftRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BeforeAfterSliderProps {
  originalUrl: string;
  enhancedUrl: string;
  originalAlt?: string;
  enhancedAlt?: string;
  initialPosition?: number; // 0 to 100, default: 50
  className?: string;
  onPositionChange?: (position: number) => void;
  showLabels?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
  aspectRatio?: '4/3' | '16/9' | 'auto' | 'square';
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalUrl,
  enhancedUrl,
  originalAlt = 'Foto Asli (Sebelum)',
  enhancedAlt = 'Foto Ditingkatkan AI (Sesudah)',
  initialPosition = 50,
  className = '',
  onPositionChange,
  showLabels = true,
  beforeLabel = 'Sebelum',
  afterLabel = 'Sesudah (AI)',
  aspectRatio = '16/9',
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(
    Math.min(100, Math.max(0, initialPosition))
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const rounded = Math.round(percentage * 10) / 10;
      setSliderPosition(rounded);
      onPositionChange?.(rounded);
    },
    [onPositionChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      if (e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
    },
    [updatePosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      updatePosition(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, updatePosition]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let newPos = sliderPosition;
    if (e.key === 'ArrowLeft') {
      newPos = Math.max(0, sliderPosition - 5);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      newPos = Math.min(100, sliderPosition + 5);
      e.preventDefault();
    } else if (e.key === 'Home') {
      newPos = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      newPos = 100;
      e.preventDefault();
    }
    if (newPos !== sliderPosition) {
      setSliderPosition(newPos);
      onPositionChange?.(newPos);
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '4/3':
        return 'aspect-[4/3]';
      case 'square':
        return 'aspect-square';
      case 'auto':
        return '';
      case '16/9':
      default:
        return 'aspect-[16/9]';
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Perbandingan Foto Sebelum dan Sesudah AI"
      aria-valuenow={Math.round(sliderPosition)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={cn(
        'relative w-full overflow-hidden select-none rounded-2xl border border-white/10 shadow-2xl bg-slate-950 group cursor-ew-resize outline-none focus:ring-2 focus:ring-purple-500/50',
        getAspectClass(),
        className
      )}
      style={{ touchAction: 'none' }}
      data-testid="before-after-slider"
    >
      {/* Background Image: Enhanced (Sesudah) */}
      <img
        src={enhancedUrl}
        alt={enhancedAlt}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        draggable={false}
        data-testid="enhanced-image"
      />

      {/* Foreground Image: Original (Sebelum), clipped by slider position */}
      <div
        className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
        }}
        data-testid="original-image-container"
      >
        <img
          src={originalUrl}
          alt={originalAlt}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          draggable={false}
          data-testid="original-image"
        />
      </div>

      {/* Draggable Neon Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none transition-transform duration-75"
        style={{
          left: `${sliderPosition}%`,
          transform: 'translateX(-50%)',
        }}
        data-testid="slider-divider"
      >
        {/* Glow Line */}
        <div className="absolute inset-0 w-0.5 bg-gradient-to-b from-purple-400 via-pink-400 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.8),0_0_24px_rgba(6,182,212,0.6)]" />

        {/* Center Draggable Thumb Button */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-slate-900/90 border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)] text-purple-200 backdrop-blur-md transition-transform duration-150',
            isDragging ? 'scale-110 ring-4 ring-purple-500/30' : 'group-hover:scale-105'
          )}
          data-testid="slider-handle"
        >
          <ChevronsLeftRight className="w-5 h-5 text-purple-300" />
        </div>
      </div>

      {/* Badges */}
      {showLabels && (
        <>
          {/* "Sebelum" Badge Top-Left */}
          <div
            className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-300 pointer-events-none shadow-md"
            data-testid="badge-before"
          >
            {beforeLabel}
          </div>

          {/* "Sesudah (AI)" Badge Top-Right */}
          <div
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/80 backdrop-blur-md border border-purple-500/30 text-xs font-semibold uppercase tracking-wider text-purple-200 pointer-events-none shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            data-testid="badge-after"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>{afterLabel}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default BeforeAfterSlider;
