import React from 'react';
import {
  SunMedium,
  Sunset,
  Sparkles,
  Layers,
  Download,
  Flame,
  LayoutGrid,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  color: string;
  gradient: string;
  tag?: string;
}

export const Features: React.FC = () => {
  const featuresList: FeatureItem[] = [
    {
      id: 'hdr-real-estate',
      title: 'HDR Real Estate',
      description:
        'Koreksi pencahayaan dinamis tinggi untuk menyeimbangkan jendela luar ruangan yang silau dan interior gelap secara sempurna dan alami.',
      icon: SunMedium,
      color: 'text-amber-400',
      gradient: 'from-amber-500/20 to-orange-500/10',
      tag: 'Preset Populer',
    },
    {
      id: 'twilight-sky',
      title: 'Twilight Sky Replacement',
      description:
        'Ubah langit mendung atau kelabu menjadi sunset/dusk keemasan bernuansa mewah yang memikat perhatian pembeli premium.',
      icon: Sunset,
      color: 'text-purple-400',
      gradient: 'from-purple-500/20 to-pink-500/10',
      tag: 'High Conversion',
    },
    {
      id: 'declutter-staging',
      title: 'Declutter & Virtual Staging',
      description:
        'Bersihkan objek dan barang yang berserakan secara cerdas serta pertegas garis estetika arsitektur ruangan secara bersih.',
      icon: Sparkles,
      color: 'text-cyan-400',
      gradient: 'from-cyan-500/20 to-blue-500/10',
      tag: 'AI Smart Clean',
    },
    {
      id: 'interior-brightening',
      title: 'Interior Brightening',
      description:
        'Tingkatkan pencahayaan di sudut-sudut sempit dan redup tanpa menimbulkan bintik noise atau overexposure yang merusak detail material.',
      icon: Flame,
      color: 'text-emerald-400',
      gradient: 'from-emerald-500/20 to-teal-500/10',
      tag: 'Natural Glow',
    },
    {
      id: 'batch-processing',
      title: 'Batch Processing',
      description:
        'Tingkatkan dan percantik hingga puluhan foto properti dalam satu folder sekaligus dengan 1 klik hemat waktu.',
      icon: Layers,
      badge: 'Segera Hadir',
      color: 'text-pink-400',
      gradient: 'from-pink-500/20 to-purple-500/10',
    },
    {
      id: 'high-res-download',
      title: 'High-Res Download',
      description:
        'Unduh hasil foto dalam resolusi tinggi asli (HD & Ultra-HD) tanpa kompresi berlebih, siap tayang di portal properti & media sosial.',
      icon: Download,
      color: 'text-blue-400',
      gradient: 'from-blue-500/20 to-indigo-500/10',
      tag: 'No Watermark',
    },
  ];

  return (
    <section className="relative py-24 bg-slate-950" id="features" data-testid="features-section">
      {/* Background Accent */}
      <div className="pointer-events-none absolute top-1/3 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[140px] rounded-full -z-10" />
      <div className="pointer-events-none absolute bottom-10 right-0 w-[400px] h-[400px] bg-cyan-600/10 blur-[130px] rounded-full -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/50 px-4 py-1.5 backdrop-blur-md">
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
              Preset & Fitur AI Canggih
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Segala yang Anda Butuhkan untuk{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Visual Listing Mewah
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300">
            Dibuat khusus untuk standar fotografer dan agen properti profesional. Dapatkan hasil kelas atas tanpa repot belajar software editing rumit.
          </p>
        </div>

        {/* 6 Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="relative flex flex-col justify-between p-8 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-500/40 hover:bg-slate-900/90 transition-all duration-300 group shadow-xl backdrop-blur-xl hover:-translate-y-1"
                data-testid={`feature-card-${feat.id}`}
              >
                <div>
                  {/* Top Bar with Icon & Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`p-3.5 rounded-2xl bg-gradient-to-br ${feat.gradient} border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className={`w-6 h-6 ${feat.color}`} />
                    </div>

                    {/* Batch Badge or Tag */}
                    {feat.badge ? (
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-pink-950/80 border border-pink-500/40 text-pink-300 shadow-[0_0_12px_rgba(244,114,182,0.3)] animate-pulse"
                        data-testid="badge-segera-hadir"
                      >
                        <Clock className="w-3 h-3" />
                        {feat.badge}
                      </span>
                    ) : feat.tag ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-400">
                        {feat.tag}
                      </span>
                    ) : null}
                  </div>

                  {/* Feature Title */}
                  <h3 className="font-heading text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                    {feat.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                {/* Bottom Decor */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Kualitas AI Otomatis</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default Features;
