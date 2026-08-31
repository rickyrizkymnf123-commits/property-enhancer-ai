import React from 'react';
import { UploadCloud, Cpu, Download, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Unggah Foto Properti',
      description:
        'Tarik dan lepas atau unggah foto properti dari HP, drone, atau kamera dalam format JPG, PNG, atau WEBP tanpa penurunan kualitas awal.',
      icon: UploadCloud,
      color: 'text-purple-400',
      gradient: 'from-purple-500/20 to-purple-600/10',
      badge: 'Langkah 1',
    },
    {
      step: '02',
      title: 'AI Memproses Seketika',
      description:
        'Pilih preset yang diinginkan (HDR Real Estate, Twilight Sky, atau Declutter). AI cerdas menganalisis dan memperindah foto dalam 5 detik.',
      icon: Cpu,
      color: 'text-cyan-400',
      gradient: 'from-cyan-500/20 to-blue-600/10',
      badge: 'Langkah 2',
    },
    {
      step: '03',
      title: 'Unduh Foto Siap Jual',
      description:
        'Bandingkan detail sebelum dan sesudah dengan slider interaktif, lalu unduh foto resolusi tinggi bebas watermark untuk listing Anda.',
      icon: Download,
      color: 'text-pink-400',
      gradient: 'from-pink-500/20 to-purple-600/10',
      badge: 'Langkah 3',
    },
  ];

  return (
    <section className="relative py-24 border-t border-white/10 bg-slate-950/80 backdrop-blur-md" id="how-it-works" data-testid="how-it-works-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-4 py-1.5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
              Alur Kerja Super Cepat
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Cara Kerja dalam{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              3 Langkah Sederhana
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300">
            Dari foto mentah biasa menjadi materi promosi mewah bernilai miliaran hanya dengan 3 ketukan mudah.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative flex flex-col p-8 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all duration-300 shadow-xl backdrop-blur-xl group"
                data-testid={`how-it-works-step-${idx + 1}`}
              >
                {/* Step Number Top-Right */}
                <div className="absolute top-6 right-6 font-mono text-4xl font-extrabold text-white/10 group-hover:text-cyan-400/20 transition-colors">
                  {item.step}
                </div>

                {/* Icon Container */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} border border-white/10 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`w-7 h-7 ${item.color}`} />
                </div>

                {/* Step Badge */}
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{item.badge}</span>
                </div>

                {/* Title */}
                <h3 className="font-heading text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
