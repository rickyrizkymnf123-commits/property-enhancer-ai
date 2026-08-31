import React, { useEffect, useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

export type FaqItem = Database['public']['Tables']['faqs']['Row'];

export interface FAQAccordionProps {
  initialFaqs?: FaqItem[];
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ initialFaqs }) => {
  const defaultFaqs: FaqItem[] = [
    {
      id: 'faq-1',
      question: 'Bagaimana cara kerja kuota 100 foto/bulan pada paket Lifetime?',
      answer:
        'Setiap akun mendapatkan alokasi 100 kredit foto setiap bulan. Sisa kuota akan ter-reset otomatis setiap 30 hari sejak tanggal aktivasi Anda tanpa perlu membayar biaya langganan tambahan lagi.',
      category: 'quota',
      is_active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'faq-2',
      question: 'Format dan ukuran foto apa saja yang didukung?',
      answer:
        'Property Enhancer AI mendukung format JPG, JPEG, PNG, dan WEBP dengan ukuran file hingga 15MB per foto. Hasil foto akan di-render dalam resolusi tinggi asli (HD & Ultra-HD) siap upload ke portal properti.',
      category: 'format',
      is_active: true,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'faq-3',
      question: 'Apakah hasil foto bebas watermark dan boleh digunakan untuk iklan komersial?',
      answer:
        'Ya, 100% bebas watermark. Semua foto yang telah ditingkatkan menjadi hak milik Anda sepenuhnya dan bebas digunakan untuk materi iklan berbayar, media sosial, banner, maupun portal properti seperti Rumah123, Lamudi, dan OLX.',
      category: 'license',
      is_active: true,
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'faq-4',
      question: 'Bagaimana cara aktivasi akun setelah pembayaran dilakukan?',
      answer:
        'Setelah melakukan pemesanan, tim kami akan memproses dan mengaktifkan lisensi akun Anda secara otomatis. Kredensial login (Email dan Password) akan langsung dikirimkan ke nomor WhatsApp Anda dalam hitungan menit.',
      category: 'activation',
      is_active: true,
      sort_order: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'faq-5',
      question: 'Apakah saya bisa mengakses aplikasi dari HP atau tablet?',
      answer:
        'Tentu saja! Aplikasi berbasis web modern dan responsif. Anda dapat login dan meningkatkan foto properti langsung melalui browser Google Chrome, Safari, atau Firefox di smartphone (Android/iOS), iPad, tablet, maupun laptop/PC.',
      category: 'device',
      is_active: true,
      sort_order: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const [faqs, setFaqs] = useState<FaqItem[]>(
    initialFaqs
      ? initialFaqs.filter((f) => f.is_active === true)
      : defaultFaqs.filter((f) => f.is_active === true)
  );

  const [openId, setOpenId] = useState<string | null>('faq-1');

  useEffect(() => {
    if (initialFaqs) {
      setFaqs(initialFaqs.filter((f) => f.is_active === true));
      return;
    }

    let isMounted = true;
    const fetchFaqs = async () => {
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0 && isMounted) {
          setFaqs(data.filter((item: FaqItem) => item.is_active === true));
        }
      } catch (err) {
        // Fallback to default active faqs
      }
    };

    fetchFaqs();
    return () => {
      isMounted = false;
    };
  }, [initialFaqs]);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  const activeFaqs = faqs.filter((f) => f.is_active === true);

  return (
    <section className="relative py-24 bg-slate-950/90" id="faq" data-testid="faq-section">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-4 py-1.5 backdrop-blur-md">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
              Pertanyaan yang Sering Diajukan
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Ada Pertanyaan?{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Kami Punya Jawabannya
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300">
            Pelajari lebih lanjut tentang sistem kuota bulanan, lisensi seumur hidup, dan cara kerja Property Enhancer AI.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="space-y-4" data-testid="faq-accordion-list">
          {activeFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-purple-500/40 bg-slate-900/90 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                    : 'border-white/10 bg-slate-900/40 hover:border-white/20 hover:bg-slate-900/60'
                }`}
                data-testid={`faq-item-${faq.id}`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-2xl"
                  data-testid={`faq-toggle-${faq.id}`}
                >
                  <span className="font-heading text-base sm:text-lg font-bold text-white pr-4">
                    {faq.question}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-200 ${
                      isOpen
                        ? 'rotate-180 bg-purple-500/20 border-purple-400 text-purple-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    className="px-6 pb-6 pt-0 text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/5 mt-1"
                    data-testid={`faq-answer-${faq.id}`}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FAQAccordion;
