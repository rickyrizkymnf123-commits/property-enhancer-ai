import React, { useEffect, useState } from 'react';
import { Star, MessageSquareQuote, Building, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

export type TestimonialItem = Database['public']['Tables']['testimonials']['Row'];

export interface TestimonialsProps {
  initialTestimonials?: TestimonialItem[];
}

export const Testimonials: React.FC<TestimonialsProps> = ({
  initialTestimonials,
}) => {
  const defaultTestimonials: TestimonialItem[] = [
    {
      id: 'test-1',
      author_name: 'Rian Hidayat',
      author_role: 'Principal Agent',
      author_company: 'Grand Realty Jakarta',
      author_avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      quote:
        'Foto properti yang gelap berubah menjadi terang alami dan memikat dalam 5 detik. Listing saya laku 2x lebih cepat dan calon buyer lebih percaya!',
      rating: 5,
      is_active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'test-2',
      author_name: 'Dewi Kartika',
      author_role: 'Senior Property Consultant',
      author_company: 'ERA Prime Surabaya',
      author_avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      quote:
        'Preset Twilight Sky luar biasa! Foto rumah yang awalnya biasa saja saat mendung jadi terlihat seperti villa mewah di Bali. Sangat hemat waktu dibanding hire fotografer mahal.',
      rating: 5,
      is_active: true,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'test-3',
      author_name: 'Budi Santoso',
      author_role: 'Property Developer & Marketer',
      author_company: 'Cipta Graha Land',
      author_avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      quote:
        'Paket Lifetime Rp 499.000 adalah investasi terbaik kami. Kuota 100 foto/bulan sangat pas untuk kebutuhan promosi puluhan unit perumahan kami.',
      rating: 5,
      is_active: true,
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    initialTestimonials
      ? initialTestimonials.filter((t) => t.is_active === true)
      : defaultTestimonials.filter((t) => t.is_active === true)
  );

  useEffect(() => {
    if (initialTestimonials) {
      setTestimonials(initialTestimonials.filter((t) => t.is_active === true));
      return;
    }

    let isMounted = true;
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0 && isMounted) {
          // Double verify is_active filter
          setTestimonials(data.filter((item: TestimonialItem) => item.is_active === true));
        }
      } catch (err) {
        // Fallback to default active items
      }
    };

    fetchTestimonials();
    return () => {
      isMounted = false;
    };
  }, [initialTestimonials]);

  // Render only items that have is_active === true
  const activeTestimonials = testimonials.filter((t) => t.is_active === true);

  return (
    <section className="relative py-24 border-t border-white/10 bg-slate-950/70 backdrop-blur-md" id="testimonials" data-testid="testimonials-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-950/50 px-4 py-1.5 backdrop-blur-md">
            <MessageSquareQuote className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-pink-200">
              Kisah Sukses Agen
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Dipercaya Oleh Para Agen &{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Top Marketer Properti
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300">
            Dengarkan langsung pengalaman mereka yang telah mengubah cara memasarkan properti menggunakan Property Enhancer AI.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8" data-testid="testimonials-grid">
          {activeTestimonials.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between p-8 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-500/40 hover:bg-slate-900/90 transition-all duration-300 shadow-xl backdrop-blur-xl group"
              data-testid={`testimonial-card-${item.id}`}
            >
              <div>
                {/* Rating Stars */}
                <div className="flex items-center gap-1 mb-6" aria-label={`Rating ${item.rating} bintang`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < (item.rating || 5)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed italic mb-8">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <img
                  src={
                    item.author_avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                  }
                  alt={item.author_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-400/50"
                  onError={(e) => {
                    // Fallback to avatar placeholder if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="flex flex-col">
                  <span className="font-heading font-bold text-white text-sm">
                    {item.author_name}
                  </span>
                  <span className="text-xs text-purple-300 font-medium">
                    {item.author_role || 'Property Agent'}
                  </span>
                  {item.author_company && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3" />
                      {item.author_company}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
