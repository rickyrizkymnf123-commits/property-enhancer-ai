import React from 'react';
import { Check, Sparkles, Shield, Zap, MessageCircle, Crown, ArrowRight } from 'lucide-react';
import { formatCurrencyIdr } from '../../lib/utils';

export interface PricingSectionProps {
  onSelectPlan?: () => void;
  whatsappNumber?: string;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  onSelectPlan,
  whatsappNumber = '6281234567890',
}) => {
  const planDetails = {
    title: 'Lifetime Deal — Akses Seumur Hidup',
    badge: 'Penawaran Terbatas • 1x Bayar',
    price: 499000,
    originalPrice: 999000,
    monthlyQuota: 100,
    description:
      'Solusi hemat permanen untuk agen dan kantor properti. Bayar sekali hari ini, nikmati kuota 100 foto AI setiap bulan selamanya.',
    features: [
      '100 Foto AI Setiap Bulan (Reset Otomatis 30 Hari)',
      'Akses Semua 5 Preset AI Real Estate (HDR, Twilight, Sky, Brightening, Declutter)',
      'Resolusi Penuh Ultra-HD Bebas Kompresi',
      'Bebas Watermark — Siap Pakai di Listing & Instagram',
      'Fitur Slider Perbandingan & Zoom Inspector',
      'Manajemen Folder & Galeri Proyek Tak Terbatas',
      'Bantuan Prioritas Langsung via WhatsApp',
    ],
  };

  const handleCtaClick = () => {
    if (onSelectPlan) {
      onSelectPlan();
    } else {
      const message = encodeURIComponent(
        'Halo Admin Property Enhancer AI, saya tertarik membeli Paket Lifetime Deal seharga Rp 499.000. Mohon informasi rekening dan aktivasinya.'
      );
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
  };

  return (
    <section className="relative py-24 bg-slate-950 overflow-hidden" id="pricing" data-testid="pricing-section">
      {/* Glow Backdrop */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-purple-600/20 blur-[150px] rounded-full -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/50 px-4 py-1.5 backdrop-blur-md">
            <Crown className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
              Investasi Terbaik Listing Anda
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Harga Transparan,{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Sekali Bayar Selamanya
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300">
            Tanpa biaya langganan bulanan yang menguras dompet. Dapatkan akses penuh dengan sistem reset kuota otomatis setiap 30 hari.
          </p>
        </div>

        {/* Pricing Card (Centered Lifetime Package) */}
        <div className="max-w-2xl mx-auto">
          <div
            className="relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-2 border-purple-500/50 p-8 sm:p-12 shadow-[0_0_50px_rgba(168,85,247,0.25)] backdrop-blur-2xl"
            data-testid="pricing-card-lifetime"
          >
            {/* Top Ribbon */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-purple-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{planDetails.badge}</span>
            </div>

            {/* Plan Header */}
            <div className="text-center pb-8 border-b border-white/10">
              <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mb-2">
                {planDetails.title}
              </h3>
              <p className="text-sm text-slate-300 max-w-lg mx-auto">
                {planDetails.description}
              </p>

              {/* Price Display */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="flex flex-col items-start">
                  <span className="text-sm text-slate-400 line-through">
                    {formatCurrencyIdr(planDetails.originalPrice)}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
                      {formatCurrencyIdr(planDetails.price)}
                    </span>
                    <span className="text-xs sm:text-sm text-purple-300 font-semibold">
                      / sekali bayar
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  HEMAT 50%
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="py-8 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Fitur & Fasilitas yang Anda Dapatkan:
              </p>
              <ul className="space-y-3.5">
                {planDetails.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-200">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCtaClick}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 px-8 py-5 text-base sm:text-lg font-extrabold text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:shadow-[0_0_45px_rgba(168,85,247,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/20 group"
                data-testid="pricing-buy-button"
              >
                <MessageCircle className="w-5 h-5 text-emerald-300 group-hover:rotate-12 transition-transform" />
                <span>Beli Akses Lifetime Sekarang</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" /> Garansi Aktivasi
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Akun Dikirim via WhatsApp
                </span>
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default PricingSection;
