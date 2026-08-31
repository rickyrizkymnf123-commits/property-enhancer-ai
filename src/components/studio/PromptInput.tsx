import React from 'react';
import { Sparkles, MessageSquarePlus, Sunset, SunDim, Sofa, Home, Wand2, Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PromptTemplate {
  id: string;
  title: string;
  category: string;
  promptText: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'twilight',
    title: 'Mode Senja / Night (Twilight)',
    category: 'Eksterior',
    promptText: 'Ubah suasana foto menjadi senja hari (twilight) dengan warna langit kecokelatan keunguan dan lampu taman/interior pendar hangat.',
    icon: Sunset,
  },
  {
    id: 'interior-bright',
    title: 'Interior Cerah & Mewah',
    category: 'Interior',
    promptText: 'Tingkatkan pencahayaan lampu ruangan, hilangkan bayangan gelap, dan jadikan suasana interior tampak cerah dan luas.',
    icon: SunDim,
  },
  {
    id: 'furniture-staging',
    title: 'Staging Furnitur Modern',
    category: 'Staging',
    promptText: 'Tambahkan penataan furnitur bergaya modern minimalis, karpet lembut, dan dekorasi lampu gantung yang elegan.',
    icon: Sofa,
  },
  {
    id: 'hdr-real-estate',
    title: 'Enhancement Properti HDR',
    category: 'Universal',
    promptText: 'Tingkatkan ketajaman tekstur dinding dan lantai, seimbangkan kontras pencahayaan HDR, dan perjelas detail sudut ruangan.',
    icon: Home,
  },
];

export interface PromptInputProps {
  prompt: string;
  onChangePrompt: (newPrompt: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  onChangePrompt,
  disabled = false,
  className = '',
}) => {
  const handleSelectTemplate = (templatePrompt: string) => {
    if (disabled) return;
    onChangePrompt(templatePrompt);
  };

  return (
    <div className={cn('space-y-4', className)} data-testid="prompt-input-container">
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <label htmlFor="custom-prompt-input" className="text-sm font-bold text-white flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" />
          <span>2. Tulis Instruksi Prompt AI</span>
        </label>
        <span className="text-xs text-slate-400 font-mono">
          {prompt.length} / 500 karakter
        </span>
      </div>

      {/* Main Textarea */}
      <div className="relative rounded-2xl shadow-inner">
        <textarea
          id="custom-prompt-input"
          value={prompt}
          disabled={disabled}
          maxLength={500}
          onChange={(e) => onChangePrompt(e.target.value)}
          placeholder="Contoh: Ubah gambar ini menjadi suasana mode malam hari (twilight), tambahkan pencahayaan hangat di interior dan langit kebiruan..."
          rows={4}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs font-sans text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="prompt-textarea"
        />

        {prompt && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChangePrompt('')}
            className="absolute top-3 right-3 text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900 border border-white/10 transition-colors"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* Prompt Template Chips */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Rekomendasi Prompt Instan:</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PROMPT_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            const isSelected = prompt === tmpl.promptText;

            return (
              <button
                key={tmpl.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectTemplate(tmpl.promptText)}
                className={cn(
                  'p-3 rounded-xl text-left border transition-all duration-200 flex items-start gap-2.5 group',
                  disabled
                    ? 'opacity-50 cursor-not-allowed bg-slate-900/30 border-white/5'
                    : isSelected
                    ? 'bg-purple-950/70 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-slate-950/60 border-white/10 hover:border-purple-500/40 hover:bg-slate-900/80 text-slate-300'
                )}
                data-testid={`prompt-template-${tmpl.id}`}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors',
                    isSelected ? 'bg-purple-600 text-white' : 'bg-white/5 text-purple-400 group-hover:bg-purple-500/20'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate group-hover:text-purple-300">
                    {tmpl.title}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {tmpl.promptText}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
