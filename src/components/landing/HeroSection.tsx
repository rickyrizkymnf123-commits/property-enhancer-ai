import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap, Star } from 'lucide-react';
import { BeforeAfterSlider } from '../studio/BeforeAfterSlider';

export interface HeroSectionProps {
  onCtaClick?: () => void;
  onExploreClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onCtaClick,
  onExploreClick,
}) => {
  // Sample high quality real estate comparison photos
  const sampleOriginal = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70&sat=-40&bri=-30';
  const sampleEnhanced = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=95';

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32" id="hero" data-testid="hero-section">
      {/* Background Ambient Neon Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-purple-600/25 via-pink-600/20 to-cyan-500/20 blur-[130px] rounded-full -z-10" />
      <div className="pointer-events-none absolute top-1/2 right-0 w-[400px] h-[400px] bg-blue-600/15 blur-[120px] rounded-full -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Copywriting & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            
            {/* Top Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/50 px-4 py-1.5 backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              data-testid="hero-badge"
            >
              <Sparkles className="h-4 w-4 text-purple-400 animate-spin-slow" />
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
                AI Real Estate Enhancer #1 di Indonesia
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Tingkatkan Kualitas Foto Properti Seketika{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                dengan AI
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed">
              Ubah foto properti gelap, kusam, atau langit mendung menjadi visual spektakuler standar majalah arsitektur dalam 5 detik. Tingkatkan daya tarik listing dan percepat closing properti hingga 5x lebih cepat.
            </p>

            {/* CTA Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
              <a
                href="#pricing"
                onClick={(e) => {
                  e.preventDefault();
                  if (onCtaClick) onCtaClick();
                  else scrollToSection('pricing');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 px-8 py-4 text-base font-bold text-white shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:shadow-[0_0_35px_rgba(168,85,247,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all border border-purple-300/30 group"
                data-testid="hero-cta-pricing"
              >
                <span>Beli Akses Lifetime</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#gallery"
                onClick={(e) => {
                  e.preventDefault();
                  if (onExploreClick) onExploreClick();
                  else scrollToSection('gallery');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 px-7 py-4 text-base font-semibold text-slate-200 hover:text-white transition-all backdrop-blur-md"
                data-testid="hero-cta-gallery"
              >
                <span>Lihat Contoh Hasil</span>
              </a>
            </div>

            {/* Micro Trust Points */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 w-full">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 justify-center lg:justify-start">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Akses Selamanya</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 justify-center lg:justify-start">
                <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                <span>100 Foto / Bulan</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 justify-center lg:justify-start">
                <Star className="h-4 w-4 text-purple-400 shrink-0 fill-purple-400" />
                <span>Resolusi Ultra HD</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Before/After Studio Slider */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="relative w-full max-w-xl p-2 sm:p-3 rounded-3xl bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              {/* Top Bar Decoration */}
              <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 border-b border-white/10 mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-slate-300">Live AI Real Estate Preview</span>
                </div>
                <div className="text-[11px] text-purple-300 font-medium">Geser untuk membandingkan ⇄</div>
              </div>

              {/* Slider Component */}
              <BeforeAfterSlider
                originalUrl={sampleOriginal}
                enhancedUrl={sampleEnhanced}
                originalAlt="Foto Interior Properti Sebelum AI"
                enhancedAlt="Foto Interior Properti Sesudah AI HDR"
                aspectRatio="16/9"
                initialPosition={50}
              />
            </div>
            <p className="mt-3 text-xs text-slate-400 text-center">
              💡 Geser garis pemisah neon ke kiri atau ke kanan untuk melihat perbedaan sebelum dan sesudah AI.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
