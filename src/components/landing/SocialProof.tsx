import React from 'react';
import { Image, ThumbsUp, TrendingUp, Users, Award, Building2 } from 'lucide-react';

export const SocialProof: React.FC = () => {
  const stats = [
    {
      label: 'Foto Ditingkatkan',
      value: '10.000+',
      icon: Image,
      description: 'Diproses secara otomatis oleh AI',
      color: 'text-purple-400',
      glow: 'shadow-purple-500/20',
    },
    {
      label: 'Tingkat Kepuasan',
      value: '99.8%',
      icon: ThumbsUp,
      description: 'Agen properti sangat puas',
      color: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
    },
    {
      label: 'Lebih Cepat Terjual',
      value: '5x',
      icon: TrendingUp,
      description: 'Rata-rata kecepatan closing listing',
      color: 'text-cyan-400',
      glow: 'shadow-cyan-500/20',
    },
    {
      label: 'Agen & Kantor Properti',
      value: '2.500+',
      icon: Users,
      description: 'Menggunakan platform di seluruh Indonesia',
      color: 'text-pink-400',
      glow: 'shadow-pink-500/20',
    },
  ];

  const agencies = [
    'Ray White Realty',
    'ERA Indonesia',
    'Century 21 Prima',
    'Brighton Real Estate',
    'Keller Williams Indo',
    'Knight Frank Partners',
  ];

  return (
    <section className="relative py-16 border-y border-white/10 bg-slate-950/60 backdrop-blur-md" id="social-proof" data-testid="social-proof-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="flex flex-col items-center sm:items-start p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.05] transition-all duration-300 group shadow-lg"
                data-testid={`stat-card-${idx}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl bg-slate-900 border border-white/10 ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </span>
                </div>
                <div className={`font-heading text-3xl sm:text-4xl font-extrabold tracking-tight ${stat.color} my-1`}>
                  {stat.value}
                </div>
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Agency Trust Bar */}
        <div className="mt-14 pt-10 border-t border-white/10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
            Dipercaya oleh agen & kantor properti terkemuka di Indonesia
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-75">
            {agencies.map((agency, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-slate-400 hover:text-purple-300 transition-colors font-medium text-sm tracking-wide"
                data-testid={`agency-badge-${i}`}
              >
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>{agency}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default SocialProof;
