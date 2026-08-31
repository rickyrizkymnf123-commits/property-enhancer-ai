import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { KobilLlmConfigView } from '../../components/admin/KobilLlmConfigView';
import { ApiProviderSwitch } from '../../components/admin/ApiProviderSwitch';
import { Bot, Cpu, Sparkles, SlidersHorizontal } from 'lucide-react';

export const AdminProvidersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kobil' | 'gateway'>('kobil');
  const [providers, setProviders] = useState<ApiProviderConfig[]>([]);

  const fetchProviders = async () => {
    const { data } = await supabase.from('api_provider_settings').select('*');
    if (data) setProviders(data as ApiProviderConfig[]);
  };

  React.useEffect(() => {
    fetchProviders();
  }, []);

  return (
    <AdminLayout
      title="Konfigurasi AI Central (Kobil LLM)"
      subtitle="Atur Base URL, API Key, dan Default Model untuk seluruh AI Edge Functions."
      actions={
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 p-1 backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('kobil')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'kobil'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Kobil LLM API</span>
          </button>

          <button
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'gateway'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Provider Gateway Switch</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {activeTab === 'kobil' ? (
          <KobilLlmConfigView />
        ) : (
          <ApiProviderSwitch providers={providers} onProviderChanged={fetchProviders} />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProvidersPage;
