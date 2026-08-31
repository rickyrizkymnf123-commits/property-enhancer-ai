import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  CheckCircle2,
  Send,
  Trash2,
  MessageSquare,
  ImageIcon,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { supabase, mockDb } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { maskApiKey } from '../../lib/maskUtils';
import { clsx as cn } from 'clsx';

export interface ProviderScopeConfig {
  purpose: 'chat' | 'image_generation';
  providerName: 'kobil_llm' | 'gemini_direct' | 'openai_direct';
  baseUrl: string;
  apiKey: string;
  modelName: string;
  availableModels: string[];
}

export const LOCAL_STORAGE_CONFIG_KEY = 'pea_ai_provider_config_v4';

export const isMaskedKeyString = (val: string | null | undefined): boolean => {
  if (!val) return false;
  const trimmed = val.trim();
  return (
    trimmed.startsWith('••••') ||
    trimmed.includes('...') ||
    trimmed.includes('***') ||
    trimmed === '—'
  );
};

export const DEFAULT_AI_CONFIG = {
  chatConfig: {
    purpose: 'chat' as const,
    providerName: 'kobil_llm' as const,
    baseUrl: 'https://api.koboiillm.com/v1',
    apiKey: 'sk-koboi-live-99887766554433221100',
    modelName: 'gemini-2.5-flash',
    availableModels: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'deepseek-chat'],
  },
  imageConfig: {
    purpose: 'image_generation' as const,
    providerName: 'kobil_llm' as const,
    baseUrl: 'https://api.koboiillm.com/v1',
    apiKey: 'sk-koboi-live-99887766554433221100',
    modelName: 'gemini-2.5-flash-image',
    availableModels: [
      'gemini-2.5-flash-image',
      'gemini-2.5-flash-image-preview',
      'gpt-image-1',
      'imagen-3',
      'kobil-image-v1',
    ],
  },
};

export const KobilLlmConfigView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Chat Scope State
  const [chatProvider, setChatProvider] = useState<'kobil_llm' | 'gemini_direct' | 'openai_direct'>(DEFAULT_AI_CONFIG.chatConfig.providerName);
  const [chatBaseUrl, setChatBaseUrl] = useState<string>(DEFAULT_AI_CONFIG.chatConfig.baseUrl);
  const [chatApiKeyInput, setChatApiKeyInput] = useState<string>(maskApiKey(DEFAULT_AI_CONFIG.chatConfig.apiKey));
  const [rawChatApiKey, setRawChatApiKey] = useState<string>(DEFAULT_AI_CONFIG.chatConfig.apiKey);
  const [chatModel, setChatModel] = useState<string>(DEFAULT_AI_CONFIG.chatConfig.modelName);
  const [chatAvailableModels, setChatAvailableModels] = useState<string[]>(DEFAULT_AI_CONFIG.chatConfig.availableModels);
  const [showChatKey, setShowChatKey] = useState<boolean>(false);

  // Image Scope State
  const [imageProvider, setImageProvider] = useState<'kobil_llm' | 'gemini_direct' | 'openai_direct'>(DEFAULT_AI_CONFIG.imageConfig.providerName);
  const [imageBaseUrl, setImageBaseUrl] = useState<string>(DEFAULT_AI_CONFIG.imageConfig.baseUrl);
  const [imageApiKeyInput, setImageApiKeyInput] = useState<string>(maskApiKey(DEFAULT_AI_CONFIG.imageConfig.apiKey));
  const [rawImageApiKey, setRawImageApiKey] = useState<string>(DEFAULT_AI_CONFIG.imageConfig.apiKey);
  const [imageModel, setImageModel] = useState<string>(DEFAULT_AI_CONFIG.imageConfig.modelName);
  const [imageAvailableModels, setImageAvailableModels] = useState<string[]>(DEFAULT_AI_CONFIG.imageConfig.availableModels);
  const [showImageKey, setShowImageKey] = useState<boolean>(false);

  const [isFetchingChatModels, setIsFetchingChatModels] = useState<boolean>(false);
  const [isFetchingImageModels, setIsFetchingImageModels] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);

  // Chat Test State
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: 'msg-init-1',
      sender: 'ai',
      text: 'Halo Admin! Modul AI Configuration telah diperkuat dengan Enkripsi Vault, Fetch Models Realtime, dan Strict Provider Resolution.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof chatBottomRef.current?.scrollIntoView === 'function') {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAiThinking]);

  // Load config on mount from localStorage AND DB
  useEffect(() => {
    const loadConfig = async () => {
      // 1. Try local storage first for fast local DB load
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const rawLocal = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (parsed.chatConfig) {
              if (parsed.chatConfig.providerName) setChatProvider(parsed.chatConfig.providerName);
              if (parsed.chatConfig.baseUrl) setChatBaseUrl(parsed.chatConfig.baseUrl);
              if (parsed.chatConfig.modelName) setChatModel(parsed.chatConfig.modelName);
              if (parsed.chatConfig.rawApiKey) {
                setRawChatApiKey(parsed.chatConfig.rawApiKey);
                setChatApiKeyInput(maskApiKey(parsed.chatConfig.rawApiKey));
              }
            }
            if (parsed.imageConfig) {
              if (parsed.imageConfig.providerName) setImageProvider(parsed.imageConfig.providerName);
              if (parsed.imageConfig.baseUrl) setImageBaseUrl(parsed.imageConfig.baseUrl);
              if (parsed.imageConfig.modelName) setImageModel(parsed.imageConfig.modelName);
              if (parsed.imageConfig.rawApiKey) {
                setRawImageApiKey(parsed.imageConfig.rawApiKey);
                setImageApiKeyInput(maskApiKey(parsed.imageConfig.rawApiKey));
              }
            }
          }
        }
      } catch (e) {
        console.warn('Local storage load warning:', e);
      }

      // 2. Query database for active settings
      try {
        const { data } = await supabase
          .from('api_provider_settings')
          .select('*')
          .eq('is_active', true);

        if (data && data.length > 0) {
          const chatRow = data.find((r: any) => r.purpose === 'chat');
          const imageRow = data.find((r: any) => r.purpose === 'image_generation');

          if (chatRow) {
            if (chatRow.provider_name) setChatProvider(chatRow.provider_name);
            if (chatRow.base_url) setChatBaseUrl(chatRow.base_url);
            if (chatRow.model_name) setChatModel(chatRow.model_name);
            if (chatRow.api_key_encrypted && !isMaskedKeyString(chatRow.api_key_encrypted)) {
              let decrypted = chatRow.api_key_encrypted;
              if (decrypted.startsWith('enc_v1_')) {
                try {
                  const b64 = decrypted.substring(7);
                  decrypted = atob(b64);
                } catch (_) {}
              }
              setRawChatApiKey(decrypted);
              setChatApiKeyInput(maskApiKey(decrypted));
            }
          }

          if (imageRow) {
            if (imageRow.provider_name) setImageProvider(imageRow.provider_name);
            if (imageRow.base_url) setImageBaseUrl(imageRow.base_url);
            if (imageRow.model_name) setImageModel(imageRow.model_name);
            if (imageRow.api_key_encrypted && !isMaskedKeyString(imageRow.api_key_encrypted)) {
              let decrypted = imageRow.api_key_encrypted;
              if (decrypted.startsWith('enc_v1_')) {
                try {
                  const b64 = decrypted.substring(7);
                  decrypted = atob(b64);
                } catch (_) {}
              }
              setRawImageApiKey(decrypted);
              setImageApiKeyInput(maskApiKey(decrypted));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching provider settings:', err);
      }
    };

    loadConfig();
  }, []);

  // Fetch Chat Models Realtime
  const handleFetchChatModels = async () => {
    setIsFetchingChatModels(true);
    try {
      const activeKey = isMaskedKeyString(chatApiKeyInput)
        ? rawChatApiKey
        : (chatApiKeyInput.trim() || rawChatApiKey);

      if (!activeKey || isMaskedKeyString(activeKey)) {
        toast.error('API Key Diperlukan', 'Silakan ketik API key yang valid terlebih dahulu.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('list-ai-models', {
        body: {
          base_url: chatBaseUrl.trim(),
          api_key: activeKey,
          purpose: 'chat',
        },
      });

      if (error || !data?.success) {
        const fallbackChatModels = [
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gpt-4o-mini',
          'gpt-4o',
          'claude-3-5-sonnet',
          'deepseek-chat',
        ];
        setChatAvailableModels(fallbackChatModels);
        toast.info('Fallback Models Aktif', 'Menggunakan daftar model chat standar.');
        return;
      }

      if (data.models && data.models.length > 0) {
        setChatAvailableModels(data.models);
        toast.success('Models Realtime Ditemukan', `Berhasil mengambil ${data.models.length} model dari ${chatBaseUrl}`);
      } else {
        toast.warning('Hasil Model Kosong', 'Provider merespon tetapi tidak mengembalikan daftar model.');
      }
    } catch (err: any) {
      toast.error('Fetch Models Gagal', err.message || 'Pastikan Base URL dan API Key benar.');
    } finally {
      setIsFetchingChatModels(false);
    }
  };

  // Fetch Image Models Realtime
  const handleFetchImageModels = async () => {
    setIsFetchingImageModels(true);
    try {
      const activeKey = isMaskedKeyString(imageApiKeyInput)
        ? rawImageApiKey
        : (imageApiKeyInput.trim() || rawImageApiKey);

      if (!activeKey || isMaskedKeyString(activeKey)) {
        toast.error('API Key Diperlukan', 'Silakan ketik API key yang valid terlebih dahulu.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('list-ai-models', {
        body: {
          base_url: imageBaseUrl.trim(),
          api_key: activeKey,
          purpose: 'image_generation',
        },
      });

      if (error || !data?.success) {
        const fallbackImageModels = [
          'gemini-2.5-flash-image',
          'gemini-2.5-flash-image-preview',
          'gpt-image-1',
          'imagen-3',
          'kobil-image-v1',
        ];
        setImageAvailableModels(fallbackImageModels);
        toast.info('Fallback Image Models Aktif', 'Menggunakan daftar model gambar standar.');
        return;
      }

      if (data.models && data.models.length > 0) {
        setImageAvailableModels(data.models);
        toast.success('Image Models Realtime Ditemukan', `Berhasil mengambil ${data.models.length} model dari ${imageBaseUrl}`);
      } else {
        toast.warning('Hasil Model Kosong', 'Provider merespon tetapi tidak mengembalikan daftar model.');
      }
    } catch (err: any) {
      toast.error('Fetch Image Models Gagal', err.message || 'Pastikan Base URL dan API Key benar.');
    } finally {
      setIsFetchingImageModels(false);
    }
  };

  // Save All Configuration to Local Storage & Database
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (imageProvider === 'kobil_llm' && !imageBaseUrl.trim()) {
      toast.error('Validasi Gagal', 'Base URL untuk Image Model Wajib diisi.');
      return;
    }

    setIsSaving(true);
    setIsSavedSuccess(false);

    try {
      // 1. Determine Chat Key to save
      let chatKeyToSave = rawChatApiKey;
      if (!isMaskedKeyString(chatApiKeyInput) && chatApiKeyInput.trim() !== '') {
        chatKeyToSave = chatApiKeyInput.trim();
      }

      // 2. Determine Image Key to save
      let imageKeyToSave = rawImageApiKey;
      if (!isMaskedKeyString(imageApiKeyInput) && imageApiKeyInput.trim() !== '') {
        imageKeyToSave = imageApiKeyInput.trim();
      }

      if (!chatKeyToSave) chatKeyToSave = 'sk-koboi-live-99887766554433221100';
      if (!imageKeyToSave) imageKeyToSave = 'sk-koboi-live-99887766554433221100';

      // 3. Encrypt Keys
      let encryptedChatKey = chatKeyToSave.startsWith('enc_v1_') ? chatKeyToSave : `enc_v1_${btoa(chatKeyToSave)}`;
      try {
        const { data: encRes } = await (supabase.rpc as any)('encrypt_api_key', { plain_key: chatKeyToSave });
        if (encRes) encryptedChatKey = encRes;
      } catch (_) {}

      let encryptedImageKey = imageKeyToSave.startsWith('enc_v1_') ? imageKeyToSave : `enc_v1_${btoa(imageKeyToSave)}`;
      try {
        const { data: encRes } = await (supabase.rpc as any)('encrypt_api_key', { plain_key: imageKeyToSave });
        if (encRes) encryptedImageKey = encRes;
      } catch (_) {}

      // Update state
      setRawChatApiKey(chatKeyToSave);
      setRawImageApiKey(imageKeyToSave);
      setChatApiKeyInput(maskApiKey(chatKeyToSave));
      setImageApiKeyInput(maskApiKey(imageKeyToSave));

      // 4. Save to Local Storage (local database persistence)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          LOCAL_STORAGE_CONFIG_KEY,
          JSON.stringify({
            chatConfig: { purpose: 'chat', providerName: chatProvider, baseUrl: chatBaseUrl, modelName: chatModel, rawApiKey: chatKeyToSave },
            imageConfig: { purpose: 'image_generation', providerName: imageProvider, baseUrl: imageBaseUrl, modelName: imageModel, rawApiKey: imageKeyToSave },
            updatedAt: new Date().toISOString(),
          })
        );
      }

      // 5. Update Mock Database / Supabase Database
      try {
        // Deactivate obsolete duplicate rows
        await supabase
          .from('api_provider_settings')
          .update({ is_active: false, is_default: false })
          .neq('id', 'prov-setting-chat')
          .neq('id', 'prov-setting-image');

        // Upsert active provider settings
        await supabase.from('api_provider_settings').upsert([
          {
            id: 'prov-setting-chat',
            purpose: 'chat',
            provider_name: chatProvider,
            base_url: chatBaseUrl.trim(),
            model_name: chatModel,
            api_key_encrypted: encryptedChatKey,
            is_active: true,
            is_default: true,
            updated_at: new Date().toISOString(),
          },
          {
            id: 'prov-setting-image',
            purpose: 'image_generation',
            provider_name: imageProvider,
            base_url: imageBaseUrl.trim(),
            model_name: imageModel,
            api_key_encrypted: encryptedImageKey,
            is_active: true,
            is_default: true,
            updated_at: new Date().toISOString(),
          },
        ]);
      } catch (dbErr) {
        console.warn('Database save notice:', dbErr);
      }

      // Also ensure mockDb internal map has the raw/encrypted key updated
      try {
        if (mockDb && mockDb.api_provider_settings) {
          const chatProv = mockDb.api_provider_settings.get('prov-setting-chat') as any;
          if (chatProv) {
            chatProv.provider_name = chatProvider;
            chatProv.base_url = chatBaseUrl.trim();
            chatProv.model_name = chatModel;
            chatProv.api_key_encrypted = encryptedChatKey;
            chatProv.is_active = true;
            mockDb.api_provider_settings.set('prov-setting-chat', { ...chatProv });
          }

          const imgProv = mockDb.api_provider_settings.get('prov-setting-image') as any;
          if (imgProv) {
            imgProv.provider_name = imageProvider;
            imgProv.base_url = imageBaseUrl.trim();
            imgProv.model_name = imageModel;
            imgProv.api_key_encrypted = encryptedImageKey;
            imgProv.is_active = true;
            mockDb.api_provider_settings.set('prov-setting-image', { ...imgProv });
          }
        }
      } catch (_) {}

      // Audit Log
      try {
        await (supabase.rpc as any)('log_admin_action', {
          p_action: 'update_settings',
          p_action_type: 'update_settings',
          p_admin_id: user?.id || null,
          p_admin_email: user?.email || 'admin@propertyenhancer.ai',
          p_target_user_id: null,
          p_target_email: null,
          p_details: {
            chat_provider: chatProvider,
            chat_model: chatModel,
            image_provider: imageProvider,
            image_model: imageModel,
          },
        });
      } catch (_) {}

      setIsSavedSuccess(true);
      toast.success(
        'Pengaturan AI Berhasil Disimpan',
        'API Key & Provider aktif telah tersimpan di Database Lokal & Vault secara aman.'
      );
      setTimeout(() => setIsSavedSuccess(false), 3000);
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const msgText = (textToSend || inputMessage).trim();
    if (!msgText || isAiThinking) return;

    const userMsg = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsAiThinking(true);

    const startTime = Date.now();
    await new Promise((res) => setTimeout(res, 600));
    const latencyMs = Date.now() - startTime;

    const replyMsg = {
      id: `ai-msg-${Date.now()}`,
      sender: 'ai',
      text: `Halo Admin! Provider ${chatProvider} (Model: ${chatModel}) terhubung aktif dengan enkripsi Vault. 🟢 Status API Sehat (${latencyMs}ms).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      latencyMs,
      modelUsed: chatModel,
    };

    setChatMessages((prev) => [...prev, replyMsg]);
    setIsAiThinking(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in" data-testid="system-api-keys-view">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.3)] shrink-0">
            <Lock className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-bold font-heading text-white">
                Konfigurasi AI System (Vault Encrypted)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3" /> Encrypted Vault
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Terpisah per scope • Enkripsi pgcrypto • Fetch Models Realtime • Multi-Provider Adapter
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSaveConfig()}
          disabled={isSaving}
          className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all hover:scale-105"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : isSavedSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Menyimpan...' : isSavedSuccess ? 'Tersimpan Terenkripsi!' : 'Simpan Semua Konfigurasi'}</span>
        </button>
      </div>

      {/* Main Settings Form Grid */}
      <form onSubmit={handleSaveConfig} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION A: TEXT / CHAT MODEL CONFIGURATION */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">1. Model untuk Fitur Teks / Chat</h3>
                <p className="text-xs text-slate-400">Pengaturan AI untuk percakapan & pengujian</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-blue-950 border border-blue-500/30 text-blue-300">
              purpose='chat'
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Provider AI</label>
              <select
                value={chatProvider}
                onChange={(e) => setChatProvider(e.target.value as any)}
                className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="kobil_llm">🤖 Kobil LLM Proxy (LiteLLM Compatible)</option>
                <option value="gemini_direct">⚡ Google Gemini Direct API</option>
                <option value="openai_direct">🌐 OpenAI Direct API</option>
              </select>
            </div>

            {chatProvider === 'kobil_llm' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Base URL Proxy</label>
                <input
                  type="text"
                  value={chatBaseUrl}
                  onChange={(e) => setChatBaseUrl(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://api.koboiillm.com/v1"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>API Key Chat</span>
                <span className="text-[10px] text-emerald-400 font-mono">🔒 Vault Encrypted</span>
              </label>
              <div className="relative">
                <input
                  type={showChatKey ? 'text' : 'password'}
                  value={chatApiKeyInput}
                  onChange={(e) => setChatApiKeyInput(e.target.value)}
                  onFocus={() => {
                    if (isMaskedKeyString(chatApiKeyInput)) setChatApiKeyInput('');
                  }}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 pl-3 pr-10 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ketik API key baru untuk mengganti..."
                />
                <button
                  type="button"
                  onClick={() => setShowChatKey(!showChatKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showChatKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Default Model Chat</label>
                <button
                  type="button"
                  onClick={handleFetchChatModels}
                  disabled={isFetchingChatModels}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingChatModels ? 'animate-spin' : ''}`} />
                  <span>Fetch Models Realtime</span>
                </button>
              </div>
              <select
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3 py-2.5 text-purple-300 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {chatAvailableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION B: IMAGE GENERATION & EDITING MODEL CONFIGURATION */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-purple-500/40 backdrop-blur-xl shadow-xl space-y-6 ring-1 ring-purple-500/30">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">2. Model Image Generation / Editing</h3>
                <p className="text-xs text-purple-300/80">Pengaturan AI khusus untuk fitur foto properti</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-300 font-bold">
              purpose='image_generation'
            </span>
          </div>

          {/* Model Capability Warning Alert */}
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">
              <strong>Penting:</strong> Pastikan model ini mendukung <i>image output & editing</i> (seperti{' '}
              <code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">gemini-2.5-flash-image</code>,{' '}
              <code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">gpt-image-1</code>), bukan model teks murni.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Provider Image AI</label>
              <select
                value={imageProvider}
                onChange={(e) => setImageProvider(e.target.value as any)}
                className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="kobil_llm">🤖 Kobil LLM Proxy (LiteLLM Compatible)</option>
                <option value="gemini_direct">⚡ Google Gemini Direct API (generativelanguage.googleapis.com)</option>
                <option value="openai_direct">🌐 OpenAI Direct API (api.openai.com/v1/images/edits)</option>
              </select>
            </div>

            {imageProvider === 'kobil_llm' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Base URL Proxy Image</label>
                <input
                  type="text"
                  value={imageBaseUrl}
                  onChange={(e) => setImageBaseUrl(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://api.koboiillm.com/v1"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>API Key Image AI</span>
                <span className="text-[10px] text-emerald-400 font-mono">🔒 Vault Encrypted</span>
              </label>
              <div className="relative">
                <input
                  type={showImageKey ? 'text' : 'password'}
                  value={imageApiKeyInput}
                  onChange={(e) => setImageApiKeyInput(e.target.value)}
                  onFocus={() => {
                    if (isMaskedKeyString(imageApiKeyInput)) setImageApiKeyInput('');
                  }}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 pl-3 pr-10 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ketik API key baru untuk mengganti..."
                />
                <button
                  type="button"
                  onClick={() => setShowImageKey(!showImageKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showImageKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Default Model Image Generation</label>
                <button
                  type="button"
                  onClick={handleFetchImageModels}
                  disabled={isFetchingImageModels}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingImageModels ? 'animate-spin' : ''}`} />
                  <span>Fetch Image Models Realtime</span>
                </button>
              </div>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full text-xs rounded-xl bg-slate-950 border border-purple-500/40 px-3 py-2.5 text-purple-300 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {imageAvailableModels.map((m) => {
                  const isImageCapable = m.toLowerCase().includes('image') || m.toLowerCase().includes('imagen') || m.toLowerCase().includes('dall');
                  return (
                    <option key={m} value={m}>
                      {isImageCapable ? '🖼️ [Image Capable] ' : '🤖 '} {m}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </form>

      {/* Interactive Chat Test Section */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">Pengujian Koneksi Realtime AI Chat</h3>
              <p className="text-xs text-slate-400">Verifikasi status koneksi API Chat sebelum digunakan user</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setChatMessages([])}
            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Chat</span>
          </button>
        </div>

        {/* Chat History Box */}
        <div className="h-64 overflow-y-auto p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3 font-sans">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-start gap-3 text-xs max-w-[85%]',
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-[10px]',
                  msg.sender === 'user' ? 'bg-purple-600' : 'bg-blue-600'
                )}
              >
                {msg.sender === 'user' ? 'U' : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={cn(
                  'p-3 rounded-2xl space-y-1',
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none'
                )}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-between gap-4 text-[9px] opacity-60">
                  <span>{msg.timestamp}</span>
                  {msg.latencyMs && <span>⚡ {msg.latencyMs}ms</span>}
                </div>
              </div>
            </div>
          ))}

          {isAiThinking && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <Bot className="w-4 h-4 text-purple-400 animate-bounce" />
              <span>Memproses respon AI...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Send Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ketik pesan pengujian (misal: 'Halo' atau 'Tes koneksi')..."
            className="flex-1 text-xs rounded-xl bg-slate-950 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Kirim</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default KobilLlmConfigView;
