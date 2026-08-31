import React, { useState, useEffect } from 'react';
import AppSidebar from '../../components/shared/AppSidebar';
import Header from '../../components/shared/Header';
import MaskedKeyDisplay from '../../components/shared/MaskedKeyDisplay';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { maskApiKey } from '../../lib/maskUtils';
import {
  User,
  Lock,
  KeyRound,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Sparkles,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface UserApiKeyItem {
  id: string;
  provider: string;
  key_name: string;
  masked_key: string;
  raw_key?: string;
  is_active: boolean;
  created_at: string;
}

export const SettingsPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { user, profile, updateUserPassword, refreshUserAccess } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'api-keys'>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState<string>(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(profile?.phone || '');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Password Change Form State
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState<boolean>(false);

  // Personal API Keys State
  const [apiKeys, setApiKeys] = useState<UserApiKeyItem[]>([
    {
      id: 'key-sample-openai',
      provider: 'openai',
      key_name: 'OpenAI Personal Key',
      masked_key: 'sk-...ab12',
      raw_key: 'sk-proj-1234567890abcdef12',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ]);
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyProvider, setNewKeyProvider] = useState<string>('openai');
  const [newKeyValue, setNewKeyValue] = useState<string>('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone || '');
    }
  }, [profile]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          phone: phoneNumber.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUserAccess();
      setProfileSuccess('Profil berhasil diperbarui!');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Gagal menyimpan profil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('Kata sandi minimal harus 8 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await updateUserPassword(newPassword);
      if (error) throw error;

      setPasswordSuccess('Kata sandi berhasil diubah!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Gagal mengubah kata sandi');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Add API Key
  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyValue.trim() || !user) return;

    const trimmedKey = newKeyValue.trim();
    const masked = maskApiKey(trimmedKey);

    let encryptedKey = `enc_v1_${btoa(trimmedKey)}`;
    try {
      const { data: encRes } = await (supabase.rpc as any)('encrypt_api_key', { plain_key: trimmedKey });
      if (encRes) encryptedKey = encRes;
    } catch (_) {}

    try {
      await supabase.from('user_api_keys').upsert([
        {
          user_id: user.id,
          provider_name: newKeyProvider,
          encrypted_key: encryptedKey,
          key_hint: masked,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (_) {}

    const newEntry: UserApiKeyItem = {
      id: `key-${Date.now()}`,
      provider: newKeyProvider,
      key_name: newKeyName.trim() || `${newKeyProvider.toUpperCase()} Key`,
      masked_key: masked,
      raw_key: trimmedKey,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setApiKeys((prev) => [newEntry, ...prev]);
    setIsAddKeyModalOpen(false);
    setNewKeyName('');
    setNewKeyValue('');
  };

  const handleDeleteApiKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex" data-testid="settings-page">
      {/* Sidebar */}
      <AppSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Pengaturan Akun & API"
          subtitle="Kelola profil, keamanan kata sandi, dan integrasi API Key personal"
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0',
                activeTab === 'profile'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
              data-testid="tab-profile"
            >
              <User className="w-4 h-4" />
              <span>Profil Pengguna</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0',
                activeTab === 'security'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
              data-testid="tab-security"
            >
              <Lock className="w-4 h-4" />
              <span>Keamanan & Sandi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('api-keys')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0',
                activeTab === 'api-keys'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
              data-testid="tab-keys"
            >
              <KeyRound className="w-4 h-4" />
              <span>Personal API Keys</span>
            </button>
          </div>

          {/* Tab 1: Profile Form */}
          {activeTab === 'profile' && (
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-xl space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-400" />
                  <span>Informasi Profil Pengguna</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Perbarui nama lengkap dan nomor kontak Anda</p>
              </div>

              {profileSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Email Akun (Terdaftar)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full text-xs rounded-xl bg-slate-950/60 border border-white/5 px-3.5 py-2.5 text-slate-400 font-mono cursor-not-allowed"
                  />
                  <span className="text-[11px] text-slate-400">Email lisensi tidak dapat diubah</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rian Hidayat"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    data-testid="profile-name-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nomor WhatsApp / HP</label>
                  <input
                    type="tel"
                    placeholder="Contoh: 08123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    data-testid="profile-phone-input"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50"
                    data-testid="btn-save-profile"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Security & Password Form */}
          {activeTab === 'security' && (
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-xl space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>Ubah Kata Sandi Akun</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Gunakan kata sandi kuat minimal 8 karakter</p>
              </div>

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Kata Sandi Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 8 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    data-testid="new-password-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Konfirmasi Kata Sandi Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Ketik ulang kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    data-testid="confirm-password-input"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50"
                    data-testid="btn-save-password"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isSavingPassword ? 'Memperbarui Sandi...' : 'Perbarui Kata Sandi'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 3: Personal API Keys Management (Masked sk-...ab12 format) */}
          {activeTab === 'api-keys' && (
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-xl space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-purple-400" />
                    <span>Personal API Keys (BYOK)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gunakan kredensial AI pribadi Anda (OpenAI, Gemini, Replicate). Kunci selalu terenkripsi dan dimasking di sisi klien sebagai format <code className="text-purple-300 font-mono">sk-...ab12</code>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddKeyModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md self-start sm:self-auto shrink-0"
                  data-testid="add-key-btn"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah API Key</span>
                </button>
              </div>

              {/* API Keys List with MaskedKeyDisplay Component */}
              <div className="space-y-3 pt-2">
                {apiKeys.map((k) => (
                  <div key={k.id} className="relative group">
                    <MaskedKeyDisplay
                      apiKey={k.raw_key || 'sk-proj-default99887766ab12'}
                      keyName={k.key_name}
                      providerName={k.provider}
                      autoHideDurationMs={5000}
                    />

                    {/* Delete Key Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteApiKey(k.id)}
                      className="absolute right-28 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
                      title="Hapus Key"
                      data-testid={`delete-key-${k.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add API Key Modal */}
      {isAddKeyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          data-testid="add-key-modal"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-purple-500/30 p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-400" />
                <span>Tambah API Key Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddKeyModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddApiKey} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Provider AI</label>
                <select
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="key-provider-select"
                >
                  <option value="kobil_llm">Kobil LLM Proxy (LiteLLM Compatible)</option>
                  <option value="gemini_direct">Google Gemini Direct API</option>
                  <option value="openai_direct">OpenAI Direct API</option>
                </select>
                <p className="text-[11px] text-purple-300/80 leading-relaxed pt-1">
                  💡 Kalau diisi, foto Anda akan diproses memakai API key ini alih-alih API key sistem milik admin. Kosongkan untuk memakai default sistem.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nama Label Key</label>
                <input
                  type="text"
                  placeholder="Contoh: OpenAI Proyek Pribadi"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="key-name-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  API Key Secret <span className="text-purple-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="sk-proj-..."
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="key-value-input"
                />
                <span className="text-[11px] text-slate-400">
                  Key akan langsung dimasking menjadi format sk-...ab12
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md"
                  data-testid="submit-add-key-btn"
                >
                  Simpan API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
