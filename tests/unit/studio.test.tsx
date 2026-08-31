import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { mockDb, supabase, realtimeMultiplexer } from '../../src/lib/mockSupabase';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';

// Components under test
import { PhotoUploader } from '../../src/components/studio/PhotoUploader';
import { PresetSelector } from '../../src/components/studio/PresetSelector';
import { RealtimeStatusBadge } from '../../src/components/studio/RealtimeStatusBadge';
import { ImageZoomViewer } from '../../src/components/studio/ImageZoomViewer';
import { BeforeAfterSlider } from '../../src/components/studio/BeforeAfterSlider';
import { MaskedKeyDisplay } from '../../src/components/shared/MaskedKeyDisplay';
import { UserDashboardContent } from '../../src/components/dashboard/UserDashboardContent';
import { maskApiKey, formatCycleResetDate } from '../../src/lib/maskUtils';
import EditorPage from '../../src/pages/app/EditorPage';
import DashboardPage from '../../src/pages/app/DashboardPage';
import SettingsPage from '../../src/pages/app/SettingsPage';

function renderWithProviders(ui: React.ReactElement, { route = '/app/editor' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Studio & User Dashboard Suite (Milestone 4 - R3)', () => {
  const testUserId = 'test-user-m4-uuid';

  beforeEach(() => {
    mockDb.reset();
    vi.restoreAllMocks();

    // Seed test user with profile & active PEA entitlement
    mockDb.users.set(testUserId, {
      id: testUserId,
      email: 'agent@propertystudio.com',
      created_at: new Date().toISOString(),
    });

    mockDb.profiles.set(testUserId, {
      id: testUserId,
      email: 'agent@propertystudio.com',
      full_name: 'Budi Agent Properti',
      phone: '628123456789',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    mockDb.user_roles.set(testUserId, {
      id: `role-${testUserId}`,
      user_id: testUserId,
      role: 'user',
      created_at: new Date().toISOString(),
    });

    mockDb.entitlements.set(testUserId, {
      id: `ent-${testUserId}`,
      user_id: testUserId,
      product_code: 'PEA',
      status: 'active',
      monthly_quota: 100,
      consumed_quota: 10,
      cycle_start_date: new Date().toISOString(),
      cycle_reset_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Set active mock session
    supabase.setMockSession({
      access_token: `mock_jwt_${testUserId}`,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: `mock_ref_${testUserId}`,
      user: {
        id: testUserId,
        email: 'agent@propertystudio.com',
        created_at: new Date().toISOString(),
      },
    });

    // Mock URL.createObjectURL
    if (typeof window.URL.createObjectURL === 'undefined') {
      window.URL.createObjectURL = vi.fn((blob: Blob) => `blob:mock-url-${Math.random()}`);
    }
  });

  // =========================================================================
  // Test Domain 1: Single Photo Upload Validation (JPG/PNG/WEBP <= 15MB)
  // =========================================================================
  describe('1. Single Photo Upload Validation', () => {
    it('1.1 should accept valid JPEG file under 15MB and invoke onFileSelect', () => {
      const onFileSelect = vi.fn();
      render(<PhotoUploader onFileSelect={onFileSelect} />);

      const file = new File(['mock jpeg binary content'], 'living_room.jpg', {
        type: 'image/jpeg',
      });
      // 2MB size
      Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 });

      const input = screen.getByTestId('photo-file-input');
      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).toHaveBeenCalled();
      const [passedFile, previewUrl] = onFileSelect.mock.calls[0];
      expect(passedFile.name).toBe('living_room.jpg');
      expect(previewUrl).toBeDefined();
      expect(screen.queryByTestId('upload-error-alert')).toBeNull();
    });

    it('1.2 should accept valid PNG file under 15MB', () => {
      const onFileSelect = vi.fn();
      render(<PhotoUploader onFileSelect={onFileSelect} />);

      const file = new File(['mock png binary content'], 'pool_exterior.png', {
        type: 'image/png',
      });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 });

      const input = screen.getByTestId('photo-file-input');
      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).toHaveBeenCalled();
      expect(onFileSelect.mock.calls[0][0].name).toBe('pool_exterior.png');
    });

    it('1.3 should accept valid WEBP file under 15MB', () => {
      const onFileSelect = vi.fn();
      render(<PhotoUploader onFileSelect={onFileSelect} />);

      const file = new File(['mock webp content'], 'bedroom.webp', {
        type: 'image/webp',
      });
      Object.defineProperty(file, 'size', { value: 1.5 * 1024 * 1024 });

      const input = screen.getByTestId('photo-file-input');
      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).toHaveBeenCalled();
      expect(onFileSelect.mock.calls[0][0].name).toBe('bedroom.webp');
    });

    it('1.4 should reject unsupported file format (e.g. PDF) with Indonesian error message', () => {
      const onFileSelect = vi.fn();
      render(<PhotoUploader onFileSelect={onFileSelect} />);

      const file = new File(['mock pdf content'], 'contract.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(file, 'size', { value: 500 * 1024 });

      const input = screen.getByTestId('photo-file-input');
      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).toHaveBeenCalledWith(null, null);
      const alert = screen.getByTestId('upload-error-alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/format file tidak didukung.*jpg, png, atau webp/i);
    });

    it('1.5 should reject oversized file (> 15MB) with maximum size error message', () => {
      const onFileSelect = vi.fn();
      render(<PhotoUploader onFileSelect={onFileSelect} />);

      const file = new File(['huge raw file content'], 'high_res_villa.jpg', {
        type: 'image/jpeg',
      });
      // 18MB size (exceeds 15MB limit)
      Object.defineProperty(file, 'size', { value: 18 * 1024 * 1024 });

      const input = screen.getByTestId('photo-file-input');
      fireEvent.change(input, { target: { files: [file] } });

      expect(onFileSelect).toHaveBeenCalledWith(null, null);
      const alert = screen.getByTestId('upload-error-alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/melebihi batas maksimal 15MB/i);
    });

    it('1.6 should render preview details and allow removing selected file', () => {
      const onFileSelect = vi.fn();
      const testFile = new File(['data'], 'balcony.jpg', { type: 'image/jpeg' });
      Object.defineProperty(testFile, 'size', { value: 1024 * 1024 });

      render(
        <PhotoUploader
          onFileSelect={onFileSelect}
          selectedFile={testFile}
          previewUrl="blob:mock-balcony-preview"
        />
      );

      expect(screen.getByTestId('preview-container')).toBeInTheDocument();
      expect(screen.getByText('balcony.jpg')).toBeInTheDocument();
      expect(screen.getByTestId('photo-preview-image')).toHaveAttribute(
        'src',
        'blob:mock-balcony-preview'
      );

      const removeBtn = screen.getByTestId('remove-photo-btn');
      fireEvent.click(removeBtn);
      expect(onFileSelect).toHaveBeenCalledWith(null, null);
    });
  });

  // =========================================================================
  // Test Domain 2: Quota Exhaustion & Cycle Reset Date Guard
  // =========================================================================
  describe('2. Quota Exhaustion Guard & Reset Date Countdown', () => {
    it('2.1 should display active remaining quota and enable Enhance button when quota is available', async () => {
      renderWithProviders(<EditorPage />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-page')).toBeInTheDocument();
      });

      // User has 10 consumed out of 100 -> 90 remaining
      const enhanceBtn = screen.getByTestId('enhance-button');
      expect(enhanceBtn).toBeInTheDocument();
      // Button disabled because no photo is uploaded yet
      expect(enhanceBtn).toBeDisabled();
      expect(screen.queryByTestId('editor-quota-warning')).toBeNull();
    });

    it('2.2 should strictly DISABLE Enhance button and render warning banner when quota is exhausted (100/100)', async () => {
      // Set quota to exhausted
      const resetIso = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
      mockDb.entitlements.set(testUserId, {
        id: `ent-${testUserId}`,
        user_id: testUserId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 100, // 100% consumed
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: resetIso,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      renderWithProviders(<EditorPage />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-quota-warning')).toBeInTheDocument();
      });

      const warningBanner = screen.getByTestId('editor-quota-warning');
      expect(warningBanner).toHaveTextContent(/batas kuota bulanan tercapai/i);
      expect(warningBanner).toHaveTextContent(/reset:/i);

      const enhanceBtn = screen.getByTestId('enhance-button');
      expect(enhanceBtn).toBeDisabled();
      expect(screen.getByTestId('exhausted-help-text')).toHaveTextContent(
        /kuota bulanan anda \(100\/100\) telah habis/i
      );
    });

    it('2.3 formatCycleResetDate utility calculates human readable countdown', () => {
      const targetDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const formatted = formatCycleResetDate(targetDate);
      expect(formatted).toContain('5 hari lagi');

      expect(formatCycleResetDate(null)).toBe('—');
      expect(formatCycleResetDate('invalid-date')).toBe('—');
    });
  });

  // =========================================================================
  // Test Domain 3: Realtime Status Badge & State Transitions
  // =========================================================================
  describe('3. Realtime Status Transitions (queued -> processing -> done / failed)', () => {
    it('3.1 should render queued status badge with amber indicator', () => {
      render(<RealtimeStatusBadge status="queued" />);
      const badge = screen.getByTestId('status-badge-queued');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Dalam Antrean AI');
    });

    it('3.2 should render processing status badge with blue spinner', () => {
      render(<RealtimeStatusBadge status="processing" />);
      const badge = screen.getByTestId('status-badge-processing');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('AI Sedang Memproses');
    });

    it('3.3 should render done status badge with emerald checkmark', () => {
      render(<RealtimeStatusBadge status="done" />);
      const badge = screen.getByTestId('status-badge-done');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Selesai Ditingkatkan');
    });

    it('3.4 should render failed status badge with error message', () => {
      render(<RealtimeStatusBadge status="failed" errorMessage="Koneksi AI Gateway Terputus" />);
      const badge = screen.getByTestId('status-badge-failed');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/gagal: koneksi ai gateway terputus/i);
    });

    it('3.5 should handle live Realtime status transitions via postgres_changes', async () => {
      renderWithProviders(<EditorPage />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-page')).toBeInTheDocument();
      });

      // Simulate an image insert event on Realtime channel
      const activeImgId = 'img-live-test-1';
      realtimeMultiplexer.emit('images', 'INSERT', {
        id: activeImgId,
        user_id: testUserId,
        preset: 'HDR_BALANCED',
        status: 'queued',
        original_url: 'https://mock.storage/raw.jpg',
        enhanced_url: null,
        created_at: new Date().toISOString(),
      });

      // Transition to processing
      realtimeMultiplexer.emit('images', 'UPDATE', {
        id: activeImgId,
        user_id: testUserId,
        preset: 'HDR_BALANCED',
        status: 'processing',
        original_url: 'https://mock.storage/raw.jpg',
        enhanced_url: null,
        updated_at: new Date().toISOString(),
      });

      // Transition to done
      realtimeMultiplexer.emit('images', 'UPDATE', {
        id: activeImgId,
        user_id: testUserId,
        preset: 'HDR_BALANCED',
        status: 'done',
        original_url: 'https://mock.storage/raw.jpg',
        enhanced_url: 'https://mock.storage/enhanced.png',
        updated_at: new Date().toISOString(),
      });

      await waitFor(() => {
        expect(screen.getByTestId('editor-result-view')).toBeInTheDocument();
      });

      expect(screen.getByTestId('editor-slider-container')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Test Domain 4: ImageZoomViewer & BeforeAfterSlider Integration
  // =========================================================================
  describe('4. ImageZoomViewer & BeforeAfterSlider Integration', () => {
    const rawUrl = 'https://mock.storage/raw_property.jpg';
    const hdUrl = 'https://mock.storage/enhanced_property.png';

    it('4.1 should render BeforeAfterSlider with responsive divider and keyboard controls', () => {
      const onPositionChange = vi.fn();
      render(
        <BeforeAfterSlider
          originalUrl={rawUrl}
          enhancedUrl={hdUrl}
          initialPosition={50}
          onPositionChange={onPositionChange}
        />
      );

      const slider = screen.getByTestId('before-after-slider');
      expect(slider).toBeInTheDocument();
      expect(screen.getByTestId('original-image')).toHaveAttribute('src', rawUrl);
      expect(screen.getByTestId('enhanced-image')).toHaveAttribute('src', hdUrl);

      // Keyboard arrow left
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(slider).toHaveAttribute('aria-valuenow', '45');
      expect(onPositionChange).toHaveBeenCalledWith(45);

      // Keyboard arrow right
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(slider).toHaveAttribute('aria-valuenow', '50');
    });

    it('4.2 ImageZoomViewer opens modal and handles zoom in (+), zoom out (-), reset (1:1), fit', () => {
      const onClose = vi.fn();
      const onDownload = vi.fn();

      const { rerender } = render(
        <ImageZoomViewer
          imageUrl={hdUrl}
          isOpen={true}
          onClose={onClose}
          onDownload={onDownload}
        />
      );

      expect(screen.getByTestId('zoom-viewer-modal')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-scale-text')).toHaveTextContent('100%');

      // Zoom In
      const zoomInBtn = screen.getByTestId('zoom-in-btn');
      fireEvent.click(zoomInBtn);
      expect(screen.getByTestId('zoom-scale-text')).toHaveTextContent('125%');

      fireEvent.click(zoomInBtn);
      expect(screen.getByTestId('zoom-scale-text')).toHaveTextContent('150%');

      // Zoom Out
      const zoomOutBtn = screen.getByTestId('zoom-out-btn');
      fireEvent.click(zoomOutBtn);
      expect(screen.getByTestId('zoom-scale-text')).toHaveTextContent('125%');

      // Reset to 1:1
      const resetBtn = screen.getByTestId('zoom-reset-btn');
      fireEvent.click(resetBtn);
      expect(screen.getByTestId('zoom-scale-text')).toHaveTextContent('100%');

      // Download button
      const downloadBtn = screen.getByTestId('zoom-download-btn');
      fireEvent.click(downloadBtn);
      expect(onDownload).toHaveBeenCalled();

      // Close button
      const closeBtn = screen.getByTestId('zoom-close-btn');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('4.3 ImageZoomViewer handles Escape key to close modal', () => {
      const onClose = vi.fn();
      render(
        <ImageZoomViewer
          imageUrl={hdUrl}
          isOpen={true}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Test Domain 5: Client-Side API Key Masking ("sk-...ab12")
  // =========================================================================
  describe('5. Client-Side API Key Masking Format ("sk-...ab12")', () => {
    it('5.1 maskApiKey formats OpenAI key to sk-...suffix', () => {
      const openAiKey = 'sk-proj-999888777666555444333222111000ab12';
      const masked = maskApiKey(openAiKey);
      expect(masked).toBe('sk-...ab12');
      expect(masked).not.toContain('999888777');
    });

    it('5.2 maskApiKey formats standard API keys preserving 3-char prefix and 4-char suffix', () => {
      const geminiKey = 'AIzaSyD1234567890XYZ89';
      expect(maskApiKey(geminiKey)).toBe('AIz...YZ89');

      const replicateKey = 'r8_abcdef1234567890zz99';
      expect(maskApiKey(replicateKey)).toBe('r8_...zz99');
    });

    it('5.3 maskApiKey handles short keys (< 8 chars), empty, or null inputs safely', () => {
      expect(maskApiKey('sk-12')).toBe('****');
      expect(maskApiKey('')).toBe('****');
      expect(maskApiKey(null)).toBe('****');
      expect(maskApiKey(undefined)).toBe('****');
    });

    it('5.4 MaskedKeyDisplay renders masked text, supports reveal toggle and copy to clipboard', async () => {
      const onCopy = vi.fn();
      const rawKey = 'sk-proj-sec-99887766ab12';

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <MaskedKeyDisplay
          apiKey={rawKey}
          providerName="OpenAI"
          keyName="Personal Key"
          onCopy={onCopy}
        />
      );

      const valueEl = screen.getByTestId('masked-key-value');
      expect(valueEl).toHaveTextContent('sk-...ab12');

      // Click Reveal Button
      const revealBtn = screen.getByTestId('toggle-reveal-key-btn');
      fireEvent.click(revealBtn);
      expect(valueEl).toHaveTextContent(rawKey);

      // Click Copy Button
      const copyBtn = screen.getByTestId('copy-key-btn');
      fireEvent.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith(rawKey);
      expect(onCopy).toHaveBeenCalled();

      // Click Hide Button
      fireEvent.click(revealBtn);
      expect(valueEl).toHaveTextContent('sk-...ab12');
    });
  });

  // =========================================================================
  // Test Domain 6: PresetSelector Component
  // =========================================================================
  describe('6. PresetSelector Component', () => {
    it('6.1 should render all 4 core presets and allow selection', () => {
      const onSelectPreset = vi.fn();
      render(
        <PresetSelector
          selectedPreset="HDR_BALANCED"
          onSelectPreset={onSelectPreset}
        />
      );

      expect(screen.getByTestId('preset-card-hdr_balanced')).toBeInTheDocument();
      expect(screen.getByTestId('preset-card-twilight')).toBeInTheDocument();
      expect(screen.getByTestId('preset-card-interior_bright')).toBeInTheDocument();
      expect(screen.getByTestId('preset-card-declutter')).toBeInTheDocument();

      // Click Twilight preset
      fireEvent.click(screen.getByTestId('preset-card-twilight'));
      expect(onSelectPreset).toHaveBeenCalledWith('TWILIGHT');

      // Click Declutter preset
      fireEvent.click(screen.getByTestId('preset-card-declutter'));
      expect(onSelectPreset).toHaveBeenCalledWith('DECLUTTER');
    });
  });

  // =========================================================================
  // Test Domain 7: UserDashboardContent & Metrics Integration
  // =========================================================================
  describe('7. UserDashboardContent & Metrics Integration', () => {
    it('7.1 should render metrics cards (Total Foto, Total Proyek, Diproses Hari Ini, Sisa Kuota)', async () => {
      // Seed some images and projects for test user
      mockDb.images.set('img-d1', {
        id: 'img-d1',
        user_id: testUserId,
        project_id: null,
        batch_id: null,
        original_url: 'raw1.jpg',
        enhanced_url: 'enh1.png',
        preset: 'HDR_BALANCED',
        status: 'done',
        error_message: null,
        file_size: 100,
        mime_type: 'image/jpeg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.projects.set('proj-d1', {
        id: 'proj-d1',
        user_id: testUserId,
        name: 'Villa Sanur',
        description: 'Sanur Bali Villa',
        address: 'Jl. Danau Tamblingan No. 8',
        cover_image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      renderWithProviders(<DashboardPage />, { route: '/app' });

      await waitFor(() => {
        expect(screen.getByTestId('stat-total-foto')).toBeInTheDocument();
        expect(screen.getByTestId('stat-total-proyek')).toBeInTheDocument();
        expect(screen.getByTestId('stat-diproses-hari-ini')).toBeInTheDocument();
        expect(screen.getByTestId('stat-sisa-kuota')).toBeInTheDocument();
      });

      expect(screen.getByTestId('stat-total-foto-count')).toHaveTextContent('1');
      expect(screen.getByTestId('stat-total-proyek-count')).toHaveTextContent('1');
      expect(screen.getByTestId('stat-today-count')).toHaveTextContent('1');
      expect(screen.getByTestId('stat-sisa-kuota-value')).toHaveTextContent('90');
    });
  });
});
