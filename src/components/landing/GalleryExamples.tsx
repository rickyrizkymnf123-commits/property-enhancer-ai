import React, { useState } from 'react';
import { Sparkles, Eye, SlidersHorizontal } from 'lucide-react';
import { BeforeAfterSlider } from '../studio/BeforeAfterSlider';

export interface GalleryItem {
  id: string;
  category: 'living_room' | 'exterior' | 'twilight' | 'bedroom';
  title: string;
  description: string;
  originalUrl: string;
  enhancedUrl: string;
}

export const GalleryExamples: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Semua Kategori' },
    { id: 'living_room', label: 'Living Room' },
    { id: 'exterior', label: 'Exterior' },
    { id: 'twilight', label: 'Twilight Sky' },
    { id: 'bedroom', label: 'Bedroom' },
  ];

  const galleryItems: GalleryItem[] = [
    {
      id: 'example-living-1',
      category: 'living_room',
      title: 'Modern Minimalist Living Room',
      description: 'Pencahayaan jendela seimbang, detail furnitur kayu tajam tanpa backlight silau.',
      originalUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=70&sat=-40&bri=-30',
      enhancedUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=95',
    },
    {
      id: 'example-exterior-1',
      category: 'exterior',
      title: 'Luxury Villa Facade & Garden',
      description: 'Langit biru cerah, rumput hijau segar, dan kontras fasad rumah dipertegas.',
      originalUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=70&sat=-30&bri=-20',
      enhancedUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=95',
    },
    {
      id: 'example-twilight-1',
      category: 'twilight',
      title: 'Twilight Dusk Atmosphere',
      description: 'Transformasi langit siang redup menjadi nuansa sunset senja eksklusif.',
      originalUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=70&sat=-50&bri=-20',
      enhancedUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=95',
    },
    {
      id: 'example-bedroom-1',
      category: 'bedroom',
      title: 'Master Suite Brightening',
      description: 'Pencahayaan lembut hangat, tekstur seprai dan pencahayaan lampu tidur tampak premium.',
      originalUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=70&sat=-40&bri=-30',
      enhancedUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=95',
    },
  ];

  const filteredItems = activeCategory === 'all'
    ? galleryItems
    : galleryItems.filter((item) => item.category === activeCategory);

  return (
    <section className="relative py-24 bg-slate-950/90" id="gallery" data-testid="gallery-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/50 px-4 py-1.5 backdrop-blur-md">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
              Galeri Hasil AI Nyata
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Lihat Perbedaannya{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Sebelum & Sesudah
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300">
            Geser slider pada setiap contoh di bawah ini untuk melihat ketajaman dan peningkatan warna instan dari preset AI kami.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12" data-testid="gallery-category-filters">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/40 scale-105'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
              }`}
              data-testid={`filter-btn-${cat.id}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Showcase Grid of Before/After Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-3xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl group hover:border-purple-500/30 transition-all p-4"
              data-testid={`gallery-item-${item.id}`}
            >
              <div className="relative mb-4">
                <BeforeAfterSlider
                  originalUrl={item.originalUrl}
                  enhancedUrl={item.enhancedUrl}
                  originalAlt={`Sebelum: ${item.title}`}
                  enhancedAlt={`Sesudah: ${item.title}`}
                  aspectRatio="16/9"
                  initialPosition={50}
                />
              </div>

              <div className="px-2 pb-2">
                <h3 className="font-heading text-lg font-bold text-white mb-1">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default GalleryExamples;
