import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { ApiProviderConfig } from '../../types/admin.types';
import {
  Cpu,
  Check,
  Zap,
  Sparkles,
  Shield,
  Activity,
  AlertCircle,
  Clock,
  Settings2,
  CheckCircle2,
} from 'lucide-react';

export interface ApiProviderSwitchProps {
  providers: ApiProviderConfig[];
  onProviderChanged: () => void;
}

const PROVIDER_METADATA: Record<
  string,
  {
    name: string;
    description: string;
    badge: string;
    defaultModel: string;
    latencyMs: number;
    color: string;
  }
> = {
  lovable: {
    name: 'Lovable AI Gateway (Recommended)',
    description: 'High-speed multi-model gateway with automatic fallback to Gemini 2.5 Flash Image.',
    badge: 'DEFAULT GATEWAY',
    defaultModel: 'google/gemini-2.5-flash-image',
    latencyMs: 820,
    color: 'from-purple-600 to-cyan-500',
  },
  openai: {
    name: 'OpenAI Direct (DALL-E 3)',
    description: 'High fidelity photorealistic rendering via OpenAI Image Generation endpoints.',
    badge: 'OPENAI API',
    defaultModel: 'dall-e-3',
    latencyMs: 1650,
    color: 'from-emerald-600 to-teal-500',
  },
  gemini: {
    name: 'Google Gemini Direct',
    description: 'Direct integration with Google Generative AI Imagen & Gemini 1.5 Flash Vision.',
    badge: 'GOOGLE AI',
    defaultModel: 'gemini-1.5-flash',
    latencyMs: 910,
    color: 'from-blue-600 to-indigo-500',
  },
  replicate: {
    name: 'Replicate SDXL',
    description: 'Fine-tuned Stable Diffusion XL pipeline optimized for architectural staging.',
    badge: 'REPLICATE CLOUD',
    defaultModel: 'stability-ai/sdxl',
    latencyMs: 2400,
    color: 'from-amber-600 to-orange-500',
  },
};

export const ApiProviderSwitch: React.FC<ApiProviderSwitchProps> = ({
  providers,
  onProviderChanged,
}) => {
  const { user } = useAuth();
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeProvider = providers.find((p) => p.is_default || p.is_active)?.provider_name || 'lovable';

  const handleSwitchProvider = async (targetProvider: string) => {
    if (activeProvider === targetProvider) return;
    setIsSwitching(targetProvider);
    setFeedback(null);

    try {
      // 1. Update all providers in database: set target as default/active, others as non-default
      for (const prov of providers) {
        const isTarget = prov.provider_name === targetProvider;
        await supabase
          .from('api_provider_settings')
          .update({
            is_default: isTarget,
            is_active: isTarget,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prov.id);
      }

      // 2. Mandatory Audit Logging
      await supabase.rpc('log_admin_action', {
        p_action: 'switch_provider',
        p_action_type: 'switch_provider',
        p_admin_id: user?.id || null,
        p_admin_email: user?.email || 'admin@propertyenhancer.ai',
        p_target_resource: `provider:${targetProvider}`,
        p_details: {
          previous_provider: activeProvider,
          new_provider: targetProvider,
        },
      });

      setFeedback({
        type: 'success',
        message: `Provider AI berhasil dialihkan ke "${PROVIDER_METADATA[targetProvider]?.name || targetProvider}".`,
      });
      onProviderChanged();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Gagal mengalihkan provider: ${err.message || err}`,
      });
    } finally {
      setIsSwitching(null);
    }
  };

  const providerKeys = ['lovable', 'openai', 'gemini', 'replicate'];

  return (
    <div className="space-y-6" data-testid="api-provider-switch">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-950/40 text-emerald-200'
              : 'border border-red-500/30 bg-red-950/40 text-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs underline hover:opacity-80">
            Tutup
          </button>
        </div>
      )}

      {/* Active Provider Highlight Card */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 to-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                  Active AI Gateway
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-white">
                {PROVIDER_METADATA[activeProvider]?.name || activeProvider}
              </h3>
              <p className="text-xs text-slate-400">
                Model: <span className="font-mono text-purple-200">{PROVIDER_METADATA[activeProvider]?.defaultModel}</span> | Latensi Rata-rata: ~{PROVIDER_METADATA[activeProvider]?.latencyMs}ms
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-right">
            <span className="text-[11px] font-medium text-slate-400">Routing Mode</span>
            <div className="font-heading text-sm font-bold text-purple-300">Single Gateway Active</div>
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {providerKeys.map((key) => {
          const meta = PROVIDER_METADATA[key] || {
            name: key,
            description: 'AI Image Provider',
            badge: key.toUpperCase(),
            defaultModel: 'standard',
            latencyMs: 1000,
            color: 'from-purple-600 to-blue-600',
          };
          const isSelected = activeProvider === key;
          const isPending = isSwitching === key;

          return (
            <div
              key={key}
              data-testid={`provider-card-${key}`}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 backdrop-blur-xl transition-all duration-300 ${
                isSelected
                  ? 'border-purple-500/50 bg-slate-900/80 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30'
                  : 'border-white/10 bg-slate-900/40 hover:border-white/20 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-white/10 bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    {meta.badge}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-purple-400">
                      <CheckCircle2 className="h-4 w-4" /> Aktif
                    </span>
                  )}
                </div>

                <h4 className="mt-3 font-heading text-base font-bold text-white">{meta.name}</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{meta.description}</p>

                <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-purple-400" />
                    <span className="font-mono text-[11px] text-slate-300">{meta.defaultModel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>~{meta.latencyMs}ms</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-white/5 pt-4">
                <button
                  onClick={() => handleSwitchProvider(key)}
                  disabled={isSelected || isPending}
                  data-testid={`btn-switch-${key}`}
                  className={`w-full rounded-xl py-2.5 text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-purple-500/20 text-purple-300 cursor-default'
                      : 'bg-white/10 text-white hover:bg-purple-600 hover:shadow-lg hover:shadow-purple-500/20'
                  }`}
                >
                  {isPending ? 'Mengalihkan...' : isSelected ? 'Provider Aktif Saat Ini' : `Alihkan ke ${key.toUpperCase()}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApiProviderSwitch;
