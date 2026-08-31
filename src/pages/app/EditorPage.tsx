import React, { useState } from 'react';
import AppSidebar from '../../components/shared/AppSidebar';
import Header from '../../components/shared/Header';
import PhotoUploader from '../../components/studio/PhotoUploader';
import PromptInput from '../../components/studio/PromptInput';
import RealtimeStatusBadge from '../../components/studio/RealtimeStatusBadge';
import BeforeAfterSlider from '../../components/studio/BeforeAfterSlider';
import ImageZoomViewer from '../../components/studio/ImageZoomViewer';
import { useRealtimeEnhancement } from '../../hooks/useRealtimeEnhancement';
import { useQuota } from '../../hooks/useQuota';
import { useProjects } from '../../hooks/useProjects';
import {
  Wand2,
  Sparkles,
  Download,
  Maximize2,
  RotateCcw,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const EditorPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>(
    'Ubah foto ini menjadi suasana twilight / mode malam hari dengan pencahayaan interior yang hangat dan dramatis.'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  const { isExhausted, remainingQuota, monthlyQuota, formattedResetDate, refreshQuota } = useQuota();
  const { projects } = useProjects();
  const {
    status,
    enhancedUrl,
    originalUrl,
    errorMessage,
    isProcessing,
    startEnhancement,
    reset: resetEnhancement,
  } = useRealtimeEnhancement();

  const handleFileSelect = (file: File | null, url: string | null) => {
    setSelectedFile(file);
    setPreviewUrl(url);
    if (!file) {
      resetEnhancement();
    }
  };

  const handleEnhance = async () => {
    if (!selectedFile || isExhausted || isProcessing || !customPrompt.trim()) return;

    await startEnhancement({
      file: selectedFile,
      preset: customPrompt.trim(),
      projectId: selectedProjectId || null,
    });

    await refreshQuota();
  };

  const handleProcessNew = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    resetEnhancement();
  };

  const handleDownload = () => {
    const url = enhancedUrl || previewUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `property_enhanced_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const effectiveOriginalUrl = previewUrl || originalUrl || '';
  const isDone = status === 'done' && !!enhancedUrl;

  return (
    <div className="min-h-screen bg-slate-950 flex" data-testid="editor-page">
      {/* Sidebar */}
      <AppSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="AI Image Enhancement Studio"
          subtitle="Tingkatkan kualitas visual foto properti dalam hitungan detik"
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Quota Exhausted Alert Banner */}
          {isExhausted && (
            <div
              className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(239,68,68,0.2)] animate-in fade-in"
              data-testid="editor-quota-warning"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-200">
                    Batas Kuota Bulanan Tercapai (0/{monthlyQuota} Tersisa)
                  </h4>
                  <p className="text-xs text-red-300/80 mt-0.5">
                    Tombol AI Enhance dinonaktifkan. Kuota 100 foto Anda akan direset otomatis pada{' '}
                    <strong className="text-white font-mono">{formattedResetDate}</strong>.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 font-bold shrink-0">
                Reset: {formattedResetDate}
              </span>
            </div>
          )}

          {/* Result View or Studio Workspace */}
          {isDone ? (
            /* Enhancement Done Result Comparison View */
            <div
              className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.2)] space-y-6 animate-in zoom-in-95"
              data-testid="editor-result-view"
            >
              {/* Header result bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-heading text-white">
                      Foto Berhasil Ditingkatkan!
                    </h3>
                    <p className="text-xs text-slate-400">
                      Prompt: <span className="text-purple-300 font-semibold max-w-md inline-block truncate align-bottom">"{customPrompt}"</span> • Geser slider untuk melihat perbandingan
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <RealtimeStatusBadge status="done" />
                </div>
              </div>

              {/* Interactive Before/After Slider */}
              <div className="w-full max-w-4xl mx-auto" data-testid="editor-slider-container">
                <BeforeAfterSlider
                  originalUrl={effectiveOriginalUrl}
                  enhancedUrl={enhancedUrl!}
                  originalAlt="Foto Sebelum"
                  enhancedAlt="Foto Sesudah AI"
                  aspectRatio="16/9"
                />
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleProcessNew}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition-colors"
                  data-testid="btn-process-new"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Proses Foto Baru</span>
                </button>

                <div className="flex items-center gap-3">
                  {/* Zoom Preview Modal Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
                    data-testid="btn-zoom-preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Periksa Resolusi Tinggi (Zoom)</span>
                  </button>

                  {/* Download Enhanced HD Button */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all hover:scale-105"
                    data-testid="btn-download-result"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Foto HD</span>
                  </button>
                </div>
              </div>

              {/* High Res Zoom Viewer Modal */}
              <ImageZoomViewer
                isOpen={isZoomOpen}
                onClose={() => setIsZoomOpen(false)}
                imageUrl={enhancedUrl!}
                title={`Hasil AI: ${customPrompt}`}
                onDownload={handleDownload}
              />
            </div>
          ) : (
            /* Active Studio Workspace (Upload + Presets + Action) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Photo Dropzone & Live Status (2 cols on lg) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                        <span>1. Unggah Foto Properti</span>
                      </h3>
                      <p className="text-xs text-slate-400">Pilih foto ruangan atau eksterior properti</p>
                    </div>

                    <RealtimeStatusBadge status={status} errorMessage={errorMessage} />
                  </div>

                  {/* Photo Uploader */}
                  <PhotoUploader
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile}
                    previewUrl={previewUrl}
                    disabled={isProcessing}
                  />

                  {/* Optional Project Assignment Dropdown */}
                  {projects.length > 0 && (
                    <div className="pt-2 flex items-center gap-3">
                      <FolderKanban className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex-1">
                        <select
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          disabled={isProcessing}
                          className="w-full text-xs rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          data-testid="project-select-dropdown"
                        >
                          <option value="">(Opsional) Tanpa Proyek</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              📁 {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Prompt Input */}
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-xl">
                  <PromptInput
                    prompt={customPrompt}
                    onChangePrompt={setCustomPrompt}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {/* Right Column: Execution Summary & Action Card */}
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-6 sticky top-24">
                  <div>
                    <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Ringkasan Proses AI</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Konfigurasi rendering foto properti</p>
                  </div>

                  {/* Summary Checklist */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                      <span className="text-slate-400">File Foto</span>
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {selectedFile ? selectedFile.name : '—'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                      <span className="text-slate-400">Instruksi Prompt</span>
                      <span className="font-medium text-purple-300 line-clamp-2 text-[11px] leading-relaxed">
                        "{customPrompt || 'Belum diisi'}"
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
                      <span className="text-slate-400">Sisa Kuota</span>
                      <span className={cn('font-mono font-bold', isExhausted ? 'text-red-400' : 'text-emerald-400')}>
                        {remainingQuota}/{monthlyQuota}
                      </span>
                    </div>
                  </div>

                  {/* Primary AI Enhance Button */}
                  <button
                    type="button"
                    onClick={handleEnhance}
                    disabled={!selectedFile || isExhausted || isProcessing || !customPrompt.trim()}
                    className={cn(
                      'w-full py-3.5 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-xl',
                      !selectedFile || isExhausted
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                        : isProcessing
                        ? 'bg-purple-900/80 text-purple-200 cursor-wait border border-purple-500/40 animate-pulse'
                        : 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-[1.02]'
                    )}
                    data-testid="enhance-button"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-purple-300" />
                        <span>AI Sedang Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        <span>Tingkatkan dengan AI</span>
                      </>
                    )}
                  </button>

                  {/* Exhausted Helper text */}
                  {isExhausted && (
                    <p className="text-[11px] text-red-400 text-center leading-relaxed" data-testid="exhausted-help-text">
                      Tombol nonaktif karena kuota bulanan Anda ({monthlyQuota}/{monthlyQuota}) telah habis. Reset pada {formattedResetDate}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default EditorPage;
