import React from 'react';
import { Sparkles, SunDim, Sunset, Sparkle, Eraser, Trees } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PresetItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const PRESET_OPTIONS: PresetItem[] = [
  {
    id: 'HDR_BALANCED',
    name: 'HDR Real Estate',
    category: 'Universal',
    description: 'Pencahayaan seimbang, tajam, dan kontras natural untuk foto ruangan & bangunan.',
    icon: Sparkles,
    badge: 'Paling Populer',
  },
  {
    id: 'TWILIGHT',
    name: 'Twilight Sky',
    category: 'Eksterior',
    description: 'Ubah foto siang menjadi senja mewah dengan langit dramatis & pendar lampu hangat.',
    icon: Sunset,
    badge: 'Dramatis',
  },
  {
    id: 'INTERIOR_BRIGHT',
    name: 'Interior Brightening',
    category: 'Interior',
    description: 'Mencerahkan ruangan gelap, meratakan bayangan jendela, dan menonjolkan tekstur ruangan.',
    icon: SunDim,
    badge: 'Rekomendasi',
  },
  {
    id: 'DECLUTTER',
    name: 'Declutter',
    category: 'Staging',
    description: 'Hapus barang berantakan, bersihkan lantai, dan buat ruangan terlihat rapi & luas.',
    icon: Eraser,
  },
  {
    id: 'SKY_ENHANCE',
    name: 'Sky Replacement',
    category: 'Eksterior',
    description: 'Ganti langit mendung/kelabu dengan langit biru cerah berbintang alami.',
    icon: Sparkle,
  },
];

export interface PresetSelectorProps {
  selectedPreset: string;
  onSelectPreset: (presetId: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPreset,
  onSelectPreset,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={cn('space-y-3', className)} data-testid="preset-selector">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Pilih Preset AI Enhancement</span>
        </label>
        <span className="text-xs text-slate-400">
          Preset terpilih: <strong className="text-purple-300 font-semibold">{PRESET_OPTIONS.find(p => p.id === selectedPreset)?.name || selectedPreset}</strong>
        </span>
      </div>

      {/* Grid of Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRESET_OPTIONS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          const Icon = preset.icon;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPreset(preset.id)}
              className={cn(
                'relative p-3.5 rounded-2xl text-left transition-all duration-200 border flex flex-col justify-between group overflow-hidden',
                disabled
                  ? 'opacity-50 cursor-not-allowed bg-slate-900/40 border-white/5'
                  : isSelected
                  ? 'bg-gradient-to-br from-purple-950/80 via-slate-900 to-blue-950/70 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)] ring-1 ring-purple-500/50'
                  : 'bg-slate-900/60 border-white/10 hover:border-purple-500/40 hover:bg-slate-900/90 shadow-sm'
              )}
              data-testid={`preset-card-${preset.id.toLowerCase()}`}
            >
              {/* Active Indicator Glow Corner */}
              {isSelected && (
                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-purple-500/30 to-transparent pointer-events-none" />
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                        : 'bg-slate-800 text-slate-300 group-hover:text-purple-300 group-hover:bg-slate-800/90'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {preset.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full border tracking-wide uppercase',
                        isSelected
                          ? 'bg-purple-500/20 text-purple-200 border-purple-400/40'
                          : 'bg-slate-800 text-slate-400 border-white/5'
                      )}
                    >
                      {preset.badge}
                    </span>
                  )}
                </div>

                <div className="font-semibold text-sm text-white mb-1 group-hover:text-purple-200 transition-colors">
                  {preset.name}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">{preset.category}</span>
                <span
                  className={cn(
                    'font-semibold transition-colors',
                    isSelected ? 'text-purple-400' : 'text-slate-400 group-hover:text-slate-300'
                  )}
                >
                  {isSelected ? '✓ Terpilih' : 'Pilih Preset'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PresetSelector;
