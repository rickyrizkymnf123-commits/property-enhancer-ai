import React, { useState, useEffect, useCallback } from 'react';
import AppSidebar from '../../components/shared/AppSidebar';
import Header from '../../components/shared/Header';
import BeforeAfterSlider from '../../components/studio/BeforeAfterSlider';
import ImageZoomViewer from '../../components/studio/ImageZoomViewer';
import RealtimeStatusBadge from '../../components/studio/RealtimeStatusBadge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import type { ImageRecord } from '../../types/database.types';
import {
  Images,
  FolderKanban,
  Search,
  Download,
  Trash2,
  Maximize2,
  CheckSquare,
  Square,
  SlidersHorizontal,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const GalleryPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { user } = useAuth();
  const { projects } = useProjects();

  const [images, setImages] = useState<ImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<ImageRecord | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  const fetchImages = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (selectedProjectId !== 'all') {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setImages(data as ImageRecord[]);
      }
    } catch (err) {
      console.error('Error fetching gallery images:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedProjectId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Filter by search query
  const filteredImages = images.filter((img) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      img.preset.toLowerCase().includes(q) ||
      img.id.toLowerCase().includes(q) ||
      (img.status && img.status.toLowerCase().includes(q))
    );
  });

  const toggleSelectImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedImageIds.size === filteredImages.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(filteredImages.map((img) => img.id)));
    }
  };

  const handleSingleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmDelete = window.confirm('Hapus foto ini secara permanen dari galeri?');
    if (!confirmDelete) return;

    try {
      await supabase.from('images').delete().eq('id', id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      setSelectedImageIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (previewImage?.id === id) {
        setPreviewImage(null);
      }
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImageIds.size === 0) return;
    const confirmDelete = window.confirm(
      `Hapus ${selectedImageIds.size} foto yang dipilih secara permanen?`
    );
    if (!confirmDelete) return;

    try {
      const idsToDelete = Array.from(selectedImageIds);
      for (const id of idsToDelete) {
        await supabase.from('images').delete().eq('id', id);
      }
      setImages((prev) => prev.filter((img) => !selectedImageIds.has(img.id)));
      setSelectedImageIds(new Set());
    } catch (err) {
      console.error('Error deleting images:', err);
    }
  };

  const handleBulkDownload = () => {
    const selected = filteredImages.filter((img) => selectedImageIds.has(img.id));
    for (const img of selected) {
      const url = img.enhanced_url || img.original_url;
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `property_${img.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex" data-testid="gallery-page">
      {/* Sidebar */}
      <AppSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Galeri Foto Properti"
          subtitle="Arsip dan koleksi foto properti yang telah ditingkatkan"
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Controls Bar: Search, Project Filter, Bulk Actions */}
          <div className="p-4 md:p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
            {/* Left Controls: Search & Project Filter */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari preset atau ID foto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="gallery-search-input"
                />
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="text-xs rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  data-testid="gallery-project-filter"
                >
                  <option value="all">Semua Proyek ({images.length})</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      📁 {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Controls: Bulk Selection & Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {filteredImages.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
                  data-testid="gallery-select-all"
                >
                  {selectedImageIds.size === filteredImages.length && filteredImages.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Pilih Semua ({selectedImageIds.size})</span>
                </button>
              )}

              {selectedImageIds.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleBulkDownload}
                    className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    data-testid="bulk-download-btn"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh ({selectedImageIds.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    data-testid="bulk-delete-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus ({selectedImageIds.size})</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Photos Grid */}
          {isLoading ? (
            <div className="text-center py-20 text-slate-400">Memuat galeri foto...</div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-slate-900/30 space-y-3">
              <Images className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-300">Tidak ada foto ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedProjectId !== 'all'
                  ? 'Coba sesuaikan filter atau kata kunci pencarian Anda.'
                  : 'Mulai tingkatkan foto properti pertama Anda di AI Studio.'}
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              data-testid="gallery-grid"
            >
              {filteredImages.map((img) => {
                const isSelected = selectedImageIds.has(img.id);
                const displayUrl = img.enhanced_url || img.original_url;

                return (
                  <div
                    key={img.id}
                    onClick={() => setPreviewImage(img)}
                    className={cn(
                      'group relative rounded-2xl overflow-hidden bg-slate-900/90 border transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.01]',
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                        : 'border-white/10 hover:border-purple-500/40'
                    )}
                    data-testid={`gallery-item-${img.id}`}
                  >
                    {/* Thumbnail Image */}
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-950 relative">
                      <img
                        src={displayUrl}
                        alt="Foto Properti"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />

                      {/* Top Bar on Card */}
                      <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-auto">
                        {/* Select Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectImage(img.id, e)}
                          className={cn(
                            'p-1.5 rounded-lg backdrop-blur-md border transition-all',
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-400'
                              : 'bg-black/50 text-white/70 border-white/20 hover:text-white'
                          )}
                          title="Pilih foto"
                        >
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Single Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleSingleDelete(img.id, e)}
                            className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 backdrop-blur-md transition-all shadow-md"
                            title="Hapus Foto"
                            data-testid={`delete-photo-${img.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <RealtimeStatusBadge status={img.status} showDetails={false} />
                        </div>
                      </div>

                      {/* Bottom Info Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-end justify-between">
                        <div>
                          <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                            {img.preset}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(img.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        </div>

                        <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Photo Preview & Inspection Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in"
          data-testid="gallery-preview-modal"
        >
          <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-purple-500/30 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white">
                    Detail Foto: {previewImage.preset}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {previewImage.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Before / After Slider if enhancedUrl is available */}
            {previewImage.enhanced_url ? (
              <div className="w-full">
                <BeforeAfterSlider
                  originalUrl={previewImage.original_url}
                  enhancedUrl={previewImage.enhanced_url}
                  originalAlt="Sebelum"
                  enhancedAlt="Sesudah AI"
                  aspectRatio="16/9"
                />
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-white/10 aspect-[16/9] flex items-center justify-center">
                <img
                  src={previewImage.original_url}
                  alt="Original"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-xs text-slate-400 font-mono">
                Waktu:{' '}
                {new Date(previewImage.created_at).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSingleDelete(previewImage.id)}
                  className="px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  data-testid="modal-delete-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Foto</span>
                </button>

                {previewImage.enhanced_url && (
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Zoom HD</span>
                  </button>
                )}

                <a
                  href={previewImage.enhanced_url || previewImage.original_url}
                  download={`property_${previewImage.id}.png`}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Foto</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Viewer */}
      {previewImage?.enhanced_url && (
        <ImageZoomViewer
          isOpen={isZoomOpen}
          onClose={() => setIsZoomOpen(false)}
          imageUrl={previewImage.enhanced_url}
          title={`Zoom HD: ${previewImage.preset}`}
        />
      )}
    </div>
  );
};

export default GalleryPage;
