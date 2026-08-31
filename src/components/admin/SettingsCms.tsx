import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type {
  PricingPackageItem,
  TestimonialItem,
  FaqItem,
  BrandingSettings,
} from '../../types/admin.types';
import {
  Sliders,
  DollarSign,
  MessageSquareQuote,
  HelpCircle,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  Check,
  ToggleLeft,
  ToggleRight,
  Star,
  Layers,
} from 'lucide-react';

export const SettingsCms: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pricing' | 'testimonials' | 'faqs' | 'branding'>('pricing');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Pricing State
  const [pricing, setPricing] = useState<PricingPackageItem>({
    id: 'pricing-lifetime-1',
    package_name: 'Lifetime Deal — 100 Foto / Bulan',
    price_idr: 499000,
    original_price_idr: 999000,
    monthly_quota: 100,
    features: [
      '100 Foto AI Setiap Bulan',
      'Reset Kuota Otomatis Setiap 30 Hari',
      '5 Preset AI Khusus Properti (HDR, Twilight, Sky, Lawn, Declutter)',
      'Resolusi Tinggi HD & Bebas Watermark',
      'Bantuan Prioritas via WhatsApp',
    ],
    is_active: true,
  });

  // 2. Testimonials State
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [newTestimonial, setNewTestimonial] = useState<Partial<TestimonialItem>>({
    author_name: '',
    author_role: 'Agent Properti',
    author_company: 'Indo Realty',
    quote: '',
    rating: 5,
    is_active: true,
  });
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);

  // 3. FAQs State
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [newFaq, setNewFaq] = useState<Partial<FaqItem>>({
    question: '',
    answer: '',
    category: 'umum',
    is_active: true,
  });
  const [isAddingFaq, setIsAddingFaq] = useState(false);

  // 4. Branding State
  const [branding, setBranding] = useState<BrandingSettings>({
    app_name: 'Property Enhancer AI',
    tagline: 'Platform AI Peningkat Kualitas Foto Properti #1 di Indonesia',
    support_whatsapp: '628111222333',
    support_email: 'support@propertyenhancer.ai',
    maintenance_mode: false,
    announcement_banner: '',
  });

  // Helper for audit logs
  const logAudit = async (action: string, details: any) => {
    try {
      await (supabase.rpc as any)('log_admin_action', {
        p_action: 'update_settings',
        p_action_type: 'update_settings',
        p_admin_id: user?.id || null,
        p_admin_email: user?.email || 'admin@propertyenhancer.ai',
        p_target_resource: `cms:${action}`,
        p_details: details,
      });
    } catch (err) {
      console.warn('Audit log error:', err);
    }
  };

  // Load initial CMS data
  const loadCmsData = async () => {
    try {
      // 1. Pricing
      const { data: priceData } = await supabase.from('pricing_settings').select('*').limit(1);
      if (priceData && priceData.length > 0) {
        const item = priceData[0];
        setPricing({
          id: item.id,
          package_name: item.package_name || item.plan_name || 'Lifetime Deal',
          price_idr: item.price_idr || 499000,
          original_price_idr: item.original_price_idr || 999000,
          monthly_quota: item.monthly_quota || 100,
          features: Array.isArray(item.features) ? item.features : [],
          is_active: item.is_active ?? true,
        });
      }

      // 2. Testimonials
      const { data: testData } = await supabase.from('testimonials').select('*').order('sort_order');
      if (testData) {
        setTestimonials(
          testData.map((t: any) => ({
            id: t.id,
            author_name: t.author_name || t.name || 'Pengguna',
            author_role: t.author_role || t.role || 'Agen',
            author_company: t.author_company || t.company || '',
            author_avatar_url: t.author_avatar_url || t.avatar_url || '',
            quote: t.quote || t.content || '',
            rating: t.rating || 5,
            is_active: t.is_active ?? true,
            sort_order: t.sort_order || 1,
          }))
        );
      }

      // 3. FAQs
      const { data: faqData } = await supabase.from('faqs').select('*').order('sort_order');
      if (faqData) {
        setFaqs(
          faqData.map((f: any) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            category: f.category || 'umum',
            is_active: f.is_active ?? true,
            sort_order: f.sort_order || 1,
          }))
        );
      }

      // 4. Branding Settings
      const { data: brandData } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('key', 'branding')
        .maybeSingle();

      if (brandData?.value) {
        setBranding((prev) => ({ ...prev, ...brandData.value }));
      }
    } catch (err) {
      console.error('Error loading CMS data:', err);
    }
  };

  useEffect(() => {
    loadCmsData();
  }, []);

  // Save Pricing Package
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase
        .from('pricing_settings')
        .upsert({
          id: pricing.id,
          package_name: pricing.package_name,
          plan_name: pricing.package_name,
          price_idr: pricing.price_idr,
          original_price_idr: pricing.original_price_idr,
          monthly_quota: pricing.monthly_quota,
          features: pricing.features,
          is_active: pricing.is_active,
          updated_at: new Date().toISOString(),
        });

      await logAudit('pricing', {
        package_name: pricing.package_name,
        price_idr: pricing.price_idr,
        monthly_quota: pricing.monthly_quota,
      });

      setFeedback({ type: 'success', message: 'Paket harga Lifetime berhasil diperbarui.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal menyimpan harga: ${err.message || err}` });
    }
  };

  // Add Testimonial
  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.author_name || !newTestimonial.quote) return;
    try {
      const id = `test-${Date.now()}`;
      const record = {
        id,
        author_name: newTestimonial.author_name,
        name: newTestimonial.author_name,
        author_role: newTestimonial.author_role || null,
        role: newTestimonial.author_role || null,
        author_company: newTestimonial.author_company || null,
        company: newTestimonial.author_company || null,
        author_avatar_url: newTestimonial.author_avatar_url || null,
        avatar_url: newTestimonial.author_avatar_url || null,
        quote: newTestimonial.quote,
        content: newTestimonial.quote,
        rating: Number(newTestimonial.rating) || 5,
        is_active: newTestimonial.is_active ?? true,
        sort_order: testimonials.length + 1,
      };

      await supabase.from('testimonials').insert(record);
      await logAudit('testimonial_add', { author: newTestimonial.author_name });

      setNewTestimonial({
        author_name: '',
        author_role: 'Agent Properti',
        author_company: 'Indo Realty',
        quote: '',
        rating: 5,
        is_active: true,
      });
      setIsAddingTestimonial(false);
      setFeedback({ type: 'success', message: 'Testimoni baru berhasil ditambahkan.' });
      loadCmsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal menambah testimoni: ${err.message || err}` });
    }
  };

  // Delete Testimonial
  const handleDeleteTestimonial = async (id: string) => {
    try {
      await supabase.from('testimonials').delete().eq('id', id);
      await logAudit('testimonial_delete', { id });
      setFeedback({ type: 'success', message: 'Testimoni berhasil dihapus.' });
      loadCmsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal menghapus testimoni: ${err.message || err}` });
    }
  };

  // Toggle Testimonial is_active
  const handleToggleTestimonial = async (t: TestimonialItem) => {
    try {
      const nextActive = !t.is_active;
      await supabase.from('testimonials').update({ is_active: nextActive }).eq('id', t.id);
      await logAudit('testimonial_toggle', { id: t.id, is_active: nextActive });
      loadCmsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal mengubah status testimoni: ${err.message || err}` });
    }
  };

  // Add FAQ
  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaq.question || !newFaq.answer) return;
    try {
      const id = `faq-${Date.now()}`;
      const record = {
        id,
        question: newFaq.question,
        answer: newFaq.answer,
        category: newFaq.category || 'umum',
        is_active: newFaq.is_active ?? true,
        sort_order: faqs.length + 1,
      };

      await supabase.from('faqs').insert(record);
      await logAudit('faq_add', { question: newFaq.question });

      setNewFaq({ question: '', answer: '', category: 'umum', is_active: true });
      setIsAddingFaq(false);
      setFeedback({ type: 'success', message: 'FAQ baru berhasil ditambahkan.' });
      loadCmsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal menambah FAQ: ${err.message || err}` });
    }
  };

  // Delete FAQ
  const handleDeleteFaq = async (id: string) => {
    try {
      await supabase.from('faqs').delete().eq('id', id);
      await logAudit('faq_delete', { id });
      setFeedback({ type: 'success', message: 'FAQ berhasil dihapus.' });
      loadCmsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal menghapus FAQ: ${err.message || err}` });
    }
  };

  // Toggle FAQ is_active
  const handleToggleFaq = async (f: FaqItem) => {
    try {
      const nextActive = !f.is_active;
      await supabase.from('faqs').update({ is_active: nextActive }).eq('id', f.id);
      await logAudit('faq_toggle', { id: f.id, is_active: nextActive });
      loadCmsData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal mengubah status FAQ: ${err.message || err}` });
    }
  };

  // Save Branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('admin_settings').upsert({
        id: 'setting-branding-1',
        key: 'branding',
        setting_key: 'branding',
        value: branding,
        setting_value: branding,
        description: 'Pengaturan identitas dan kontak aplikasi',
        updated_by: user?.email || 'admin',
        updated_at: new Date().toISOString(),
      });

      await logAudit('branding', branding);
      setFeedback({ type: 'success', message: 'Pengaturan branding & WhatsApp berhasil disimpan.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal menyimpan branding: ${err.message || err}` });
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-cms-container">
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

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'pricing'
              ? 'border border-purple-500/40 bg-purple-600/20 text-white shadow-lg shadow-purple-500/10'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Paket Harga (Pricing)</span>
        </button>

        <button
          onClick={() => setActiveTab('testimonials')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'testimonials'
              ? 'border border-purple-500/40 bg-purple-600/20 text-white shadow-lg shadow-purple-500/10'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <MessageSquareQuote className="h-4 w-4" />
          <span>Testimoni ({testimonials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'faqs'
              ? 'border border-purple-500/40 bg-purple-600/20 text-white shadow-lg shadow-purple-500/10'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span>FAQ ({faqs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'branding'
              ? 'border border-purple-500/40 bg-purple-600/20 text-white shadow-lg shadow-purple-500/10'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Branding & WhatsApp</span>
        </button>
      </div>

      {/* 1. Pricing CMS */}
      {activeTab === 'pricing' && (
        <form onSubmit={handleSavePricing} className="space-y-6" data-testid="pricing-cms-form">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-5">
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-400" />
              <span>Kelola Paket Lifetime & Kuota</span>
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="package_name" className="block text-xs font-medium text-slate-300">Nama Paket</label>
                <input
                  id="package_name"
                  type="text"
                  value={pricing.package_name}
                  onChange={(e) => setPricing({ ...pricing, package_name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="monthly_quota" className="block text-xs font-medium text-slate-300">Kuota Bulanan (Foto/Bulan)</label>
                <input
                  id="monthly_quota"
                  type="number"
                  value={pricing.monthly_quota}
                  onChange={(e) => setPricing({ ...pricing, monthly_quota: Number(e.target.value) })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="price_idr" className="block text-xs font-medium text-slate-300">Harga Promo (IDR)</label>
                <input
                  id="price_idr"
                  type="number"
                  value={pricing.price_idr}
                  onChange={(e) => setPricing({ ...pricing, price_idr: Number(e.target.value) })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="original_price_idr" className="block text-xs font-medium text-slate-300">Harga Asli (Coret) (IDR)</label>
                <input
                  id="original_price_idr"
                  type="number"
                  value={pricing.original_price_idr || 0}
                  onChange={(e) =>
                    setPricing({ ...pricing, original_price_idr: Number(e.target.value) })
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Fitur Paket (Pisahkan baris demi baris)
              </label>
              <textarea
                rows={5}
                value={pricing.features.join('\n')}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    features: e.target.value.split('\n').filter((l) => l.trim().length > 0),
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-sans text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={pricing.is_active}
                  onChange={(e) => setPricing({ ...pricing, is_active: e.target.checked })}
                  className="rounded border-white/10 bg-slate-950 text-purple-600 focus:ring-purple-500"
                />
                <span>Aktifkan paket harga ini di Landing Page</span>
              </label>

              <button
                type="submit"
                data-testid="btn-save-pricing"
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Paket Harga</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 2. Testimonials CMS */}
      {activeTab === 'testimonials' && (
        <div className="space-y-6" data-testid="testimonials-cms">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-white">Daftar Testimoni Pelanggan</h3>
            <button
              onClick={() => setIsAddingTestimonial(!isAddingTestimonial)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Testimoni</span>
            </button>
          </div>

          {isAddingTestimonial && (
            <form
              onSubmit={handleAddTestimonial}
              className="rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl space-y-4"
            >
              <h4 className="font-heading text-base font-bold text-purple-300">Tambah Testimoni Baru</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-slate-300">Nama Lengkap</label>
                  <input
                    type="text"
                    value={newTestimonial.author_name}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, author_name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Budi Santoso"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300">Peran / Jabatan</label>
                  <input
                    type="text"
                    value={newTestimonial.author_role || ''}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, author_role: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Principal Broker"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300">Perusahaan / Kantor</label>
                  <input
                    type="text"
                    value={newTestimonial.author_company || ''}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, author_company: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Grand Realty"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300">Kutipan Testimoni</label>
                <textarea
                  rows={3}
                  value={newTestimonial.quote}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, quote: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Foto properti saya langsung jernih dan listing laku dalam 3 hari!"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTestimonial(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500"
                >
                  Simpan Testimoni
                </button>
              </div>
            </form>
          )}

          {/* Testimonial List Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {testimonials.map((t) => (
              <div
                key={t.id}
                data-testid={`testimonial-card-${t.id}`}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-4 w-4 ${idx < t.rating ? 'fill-amber-400' : 'text-slate-600'}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleToggleTestimonial(t)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        t.is_active
                          ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                          : 'border border-slate-600/30 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t.is_active ? 'Tampil' : 'Disembunyikan'}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-300 italic leading-relaxed">
                    "{t.quote || t.content}"
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
                  <div>
                    <span className="font-semibold text-xs text-white">{t.author_name || t.name}</span>
                    <span className="text-[11px] text-slate-400 block">
                      {t.author_role || t.role} {t.author_company && `— ${t.author_company}`}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteTestimonial(t.id)}
                    className="p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FAQs CMS */}
      {activeTab === 'faqs' && (
        <div className="space-y-6" data-testid="faqs-cms">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-white">Daftar Tanya Jawab (FAQ)</h3>
            <button
              onClick={() => setIsAddingFaq(!isAddingFaq)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah FAQ</span>
            </button>
          </div>

          {isAddingFaq && (
            <form
              onSubmit={handleAddFaq}
              className="rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl space-y-4"
            >
              <h4 className="font-heading text-base font-bold text-purple-300">Tambah Pertanyaan Baru</h4>
              <div>
                <label className="block text-xs text-slate-300">Pertanyaan (Question)</label>
                <input
                  type="text"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Berapa lama proses enhancement satu foto?"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300">Jawaban (Answer)</label>
                <textarea
                  rows={3}
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Proses peningkatan foto AI berlangsung rata-rata hanya 3-5 detik per foto."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingFaq(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500"
                >
                  Simpan FAQ
                </button>
              </div>
            </form>
          )}

          {/* FAQs List */}
          <div className="space-y-3">
            {faqs.map((f) => (
              <div
                key={f.id}
                data-testid={`faq-item-${f.id}`}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-heading text-sm font-bold text-white">{f.question}</h4>
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">{f.answer}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleFaq(f)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        f.is_active
                          ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                          : 'border border-slate-600/30 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {f.is_active ? 'Tampil' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(f.id)}
                      className="p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Branding & WhatsApp CMS */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="space-y-6" data-testid="branding-cms-form">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-5">
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-purple-400" />
              <span>Identitas Aplikasi & Kontak Bantuan</span>
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">Nama Aplikasi</label>
                <input
                  type="text"
                  value={branding.app_name}
                  onChange={(e) => setBranding({ ...branding, app_name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Tagline / Slogan</label>
                <input
                  type="text"
                  value={branding.tagline}
                  onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Nomor WhatsApp Bantuan Admin (WAHA)</label>
                <input
                  type="text"
                  value={branding.support_whatsapp}
                  onChange={(e) => setBranding({ ...branding, support_whatsapp: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  placeholder="628111222333"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Email Dukungan Pelanggan</label>
                <input
                  type="email"
                  value={branding.support_email}
                  onChange={(e) => setBranding({ ...branding, support_email: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  placeholder="support@propertyenhancer.ai"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-white/5 pt-4">
              <button
                type="submit"
                data-testid="btn-save-branding"
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Pengaturan Branding</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default SettingsCms;
