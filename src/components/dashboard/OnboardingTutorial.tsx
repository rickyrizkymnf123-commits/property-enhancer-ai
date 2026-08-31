import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  UploadCloud,
  Wand2,
  CheckCircle2,
  Sliders,
  X,
  ChevronRight,
  ChevronLeft,
  Eye,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface OnboardingTutorialProps {
  isOpen?: boolean;
  onClose?: () => void;
  storageKey?: string;
}

const STEPS = [
  {
    step: 1,
    title: '1. Unggah Foto Properti',
    description:
      'Tarik & lepas foto properti Anda dalam format JPG, PNG, atau WEBP (hingga 15MB). Foto asli tetap terjaga aman.',
    icon: UploadCloud,
    badge: 'Langkah 1',
  },
  {
    step: 2,
    title: '2. Pilih Preset AI Properti',
    description:
      'Pilih preset yang sesuai kebutuhan: HDR Real Estate (pencahayaan seimbang), Twilight Sky (senja mewah), Interior Brightening (ruangan terang), atau Declutter (rapi).',
    icon: Wand2,
    badge: 'Langkah 2',
  },
  {
    step: 3,
    title: '3. Proses Cepat & Real-Time',
    description:
      'AI Gateway memproses foto Anda secara real-time (5-15 detik). Pantau status langsung dan sisa kuota bulanan Anda.',
    icon: Sliders,
    badge: 'Langkah 3',
  },
  {
    step: 4,
    title: '4. Bandingkan & Unduh HD',
    description:
      'Gunakan slider perbandingan Sebelum & Sesudah interaktif, periksa detail dengan Zoom Viewer, dan unduh foto resolusi tinggi siap listing.',
    icon: Sparkles,
    badge: 'Langkah 4',
  },
];

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  storageKey = 'pea_onboarding_completed',
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    } else {
      const hasCompleted = localStorage.getItem(storageKey);
      if (!hasCompleted) {
        setIsOpen(true);
      }
    }
  }, [controlledIsOpen, storageKey]);

  const handleClose = () => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
    controlledOnClose?.();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const current = STEPS[currentStep];
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      data-testid="onboarding-tutorial-modal"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-purple-500/30 p-6 md:p-8 shadow-[0_0_50px_rgba(168,85,247,0.25)] overflow-hidden">
        {/* Neon decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close / Skip button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          data-testid="onboarding-close-btn"
          aria-label="Lewati panduan"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((s, idx) => (
            <div
              key={s.step}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                idx === currentStep
                  ? 'w-8 bg-gradient-to-r from-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                  : idx < currentStep
                  ? 'w-3 bg-purple-400/60'
                  : 'w-3 bg-slate-800'
              )}
              data-testid={`onboarding-step-indicator-${idx}`}
            />
          ))}
          <span className="text-xs font-mono text-slate-400 ml-2">
            {currentStep + 1} dari {STEPS.length}
          </span>
        </div>

        {/* Icon & Content */}
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-cyan-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <Icon className="w-7 h-7" />
          </div>

          <div>
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
              {current.badge}
            </span>
            <h2 className="text-xl font-bold font-heading text-white mt-0.5">
              {current.title}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-2">
              {current.description}
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            data-testid="onboarding-skip-btn"
          >
            Lewati Tutorial
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                data-testid="onboarding-prev-btn"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
              data-testid="onboarding-next-btn"
            >
              <span>{currentStep === STEPS.length - 1 ? 'Mulai Tingkatkan Foto' : 'Lanjut'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;
