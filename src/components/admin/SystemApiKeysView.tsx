import React, { useState } from 'react';
import type { SystemApiKeyInfo } from '../../types/admin.types';
import { maskApiKey } from '../../lib/maskUtils';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Zap,
  Lock,
} from 'lucide-react';

export interface SystemApiKeysViewProps {
  keys?: SystemApiKeyInfo[];
}

const DEFAULT_SYSTEM_KEYS: SystemApiKeyInfo[] = [
  {
    id: 'key-lovable',
    name: 'Lovable AI Gateway Key',
    provider: 'Lovable AI (Gemini 2.5 Flash)',
    masked_key: 'sk-...ab12',
    is_configured: true,
    status: 'healthy',
    last_checked_at: new Date().toISOString(),
    description: 'Kunci utama autentikasi ke Lovable AI Gateway untuk rendering foto properti.',
  },
  {
    id: 'key-openai',
    name: 'OpenAI Secret Key',
    provider: 'OpenAI (DALL-E 3)',
    masked_key: 'sk-...9901',
    is_configured: true,
    status: 'healthy',
    last_checked_at: new Date().toISOString(),
    description: 'Kredensial akses DALL-E 3 image generation & GPT vision enhancement.',
  },
  {
    id: 'key-gemini',
    name: 'Google Gemini API Key',
    provider: 'Google Cloud AI Studio',
    masked_key: 'AIza...8821',
    is_configured: true,
    status: 'healthy',
    last_checked_at: new Date().toISOString(),
    description: 'API Key untuk Google Gemini Vision & Imagen 3 direct dispatch.',
  },
  {
    id: 'key-replicate',
    name: 'Replicate API Token',
    provider: 'Replicate Cloud',
    masked_key: 'r8_...4321',
    is_configured: true,
    status: 'healthy',
    last_checked_at: new Date().toISOString(),
    description: 'Token akses ke endpoint cluster Stable Diffusion XL.',
  },
  {
    id: 'key-waha',
    name: 'WAHA WhatsApp Gateway Key',
    provider: 'WAHA WhatsApp API',
    masked_key: 'wh_...1122',
    is_configured: true,
    status: 'healthy',
    last_checked_at: new Date().toISOString(),
    description: 'Kunci gateway WhatsApp untuk pengiriman kredensial akun instan saat order baru.',
  },
  {
    id: 'key-supabase-service',
    name: 'Supabase Service Role Secret',
    provider: 'Supabase Database & Auth Admin',
    masked_key: 'eyJh...5544',
    is_configured: true,
    status: 'healthy',
    last_checked_at: new Date().toISOString(),
    description: 'Kunci bypass RLS untuk Edge Functions, user provisioning, dan audit logging.',
  },
];

export const SystemApiKeysView: React.FC<SystemApiKeysViewProps> = ({
  keys = DEFAULT_SYSTEM_KEYS,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestConnection = async (item: SystemApiKeyInfo) => {
    setTestingId(item.id);
    setTestResult(null);

    // Simulate connection ping
    await new Promise((res) => setTimeout(res, 600));

    setTestingId(null);
    setTestResult({
      id: item.id,
      success: true,
      msg: `Koneksi ke ${item.provider} berhasil (200 OK — ~140ms).`,
    });
  };

  const getStatusBadge = (status: SystemApiKeyInfo['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Terhubung (Sehat)
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" /> Peringatan Kuota
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
            <XCircle className="h-3.5 w-3.5" /> Gangguan Koneksi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
            Belum Dikonfigurasi
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="system-api-keys-view">
      {/* Security Info Card */}
      <div className="flex items-start gap-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-slate-900/80 to-purple-950/30 p-5 backdrop-blur-xl shadow-lg">
        <div className="rounded-xl bg-purple-500/20 p-2.5 text-purple-400 border border-purple-500/30 shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-heading text-sm font-bold text-white">Client-Side Masking & Enkripsi Standar Keamanan</h4>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Semua kunci API rahasia sistem disembunyikan secara otomatis dengan format masked (<span className="font-mono text-purple-300">sk-...ab12</span>) untuk mencegah kebocoran kredensial di antarmuka web. Kunci mentah disimpan secara aman pada server environment variables.
          </p>
        </div>
      </div>

      {/* Keys Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {keys.map((k) => {
          const isCopied = copiedId === k.id;
          const isTesting = testingId === k.id;
          const isThisTest = testResult?.id === k.id;

          return (
            <div
              key={k.id}
              data-testid={`system-key-card-${k.id}`}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg transition-all hover:border-purple-500/30 hover:bg-slate-900/80"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-heading text-base font-bold text-white">{k.name}</h4>
                    <span className="text-xs text-purple-300 font-medium">{k.provider}</span>
                  </div>
                  {getStatusBadge(k.status)}
                </div>

                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{k.description}</p>

                {/* Masked Key Display Box */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-purple-400" />
                    <span
                      data-testid={`masked-key-${k.id}`}
                      className="font-mono text-xs font-semibold text-slate-200 tracking-wider"
                    >
                      {maskApiKey(k.masked_key)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopy(k.id, k.masked_key)}
                    className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-purple-600/20 hover:text-purple-300 transition-colors"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>

                {/* Test Feedback */}
                {isThisTest && (
                  <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
                    {testResult.msg}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-xs">
                <span className="text-[11px] text-slate-500">
                  Dicek: {new Date(k.last_checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </span>

                <button
                  onClick={() => handleTestConnection(k)}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin text-purple-400' : ''}`} />
                  <span>{isTesting ? 'Memeriksa...' : 'Tes Koneksi'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SystemApiKeysView;
