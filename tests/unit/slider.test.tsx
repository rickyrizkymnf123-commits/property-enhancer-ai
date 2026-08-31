import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { mockDb, supabase } from '../../src/lib/mockSupabase';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { BeforeAfterSlider } from '../../src/components/studio/BeforeAfterSlider';
import { Navbar } from '../../src/components/landing/Navbar';
import { HeroSection } from '../../src/components/landing/HeroSection';
import { SocialProof } from '../../src/components/landing/SocialProof';
import { Features } from '../../src/components/landing/Features';
import { HowItWorks } from '../../src/components/landing/HowItWorks';
import { GalleryExamples } from '../../src/components/landing/GalleryExamples';
import { PricingSection } from '../../src/components/landing/PricingSection';
import { Testimonials } from '../../src/components/landing/Testimonials';
import { FAQAccordion } from '../../src/components/landing/FAQAccordion';
import { Footer } from '../../src/components/landing/Footer';
import LandingPage from '../../src/pages/LandingPage';

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Landing Page & Before/After Slider Suite (Milestone 3 - R2)', () => {
  beforeEach(() => {
    mockDb.reset();
    supabase.setMockSession(null);
    vi.restoreAllMocks();
  });

  describe('1. BeforeAfterSlider Interactive Component', () => {
    const originalUrl = 'https://mock.storage/original.jpg';
    const enhancedUrl = 'https://mock.storage/enhanced.jpg';

    it('1.1 should render original and enhanced images with proper alt tags and badges', () => {
      render(
        <BeforeAfterSlider
          originalUrl={originalUrl}
          enhancedUrl={enhancedUrl}
          originalAlt="Foto Sebelum"
          enhancedAlt="Foto Sesudah AI"
        />
      );

      const enhancedImg = screen.getByTestId('enhanced-image');
      const originalImg = screen.getByTestId('original-image');

      expect(enhancedImg).toBeInTheDocument();
      expect(enhancedImg).toHaveAttribute('src', enhancedUrl);
      expect(enhancedImg).toHaveAttribute('alt', 'Foto Sesudah AI');

      expect(originalImg).toBeInTheDocument();
      expect(originalImg).toHaveAttribute('src', originalUrl);
      expect(originalImg).toHaveAttribute('alt', 'Foto Sebelum');

      expect(screen.getByTestId('badge-before')).toHaveTextContent('Sebelum');
      expect(screen.getByTestId('badge-after')).toHaveTextContent('Sesudah (AI)');
      expect(screen.getByTestId('slider-handle')).toBeInTheDocument();
    });

    it('1.2 should support custom labels and hide labels when showLabels is false', () => {
      const { rerender } = render(
        <BeforeAfterSlider
          originalUrl={originalUrl}
          enhancedUrl={enhancedUrl}
          beforeLabel="Asli"
          afterLabel="Hasil Studio AI"
        />
      );

      expect(screen.getByTestId('badge-before')).toHaveTextContent('Asli');
      expect(screen.getByTestId('badge-after')).toHaveTextContent('Hasil Studio AI');

      rerender(
        <BeforeAfterSlider
          originalUrl={originalUrl}
          enhancedUrl={enhancedUrl}
          showLabels={false}
        />
      );

      expect(screen.queryByTestId('badge-before')).toBeNull();
      expect(screen.queryByTestId('badge-after')).toBeNull();
    });

    it('1.3 should initialize with custom initialPosition and accessibility attributes', () => {
      render(
        <BeforeAfterSlider
          originalUrl={originalUrl}
          enhancedUrl={enhancedUrl}
          initialPosition={70}
        />
      );

      const slider = screen.getByTestId('before-after-slider');
      expect(slider).toHaveAttribute('role', 'slider');
      expect(slider).toHaveAttribute('aria-valuenow', '70');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');

      const originalContainer = screen.getByTestId('original-image-container');
      expect(originalContainer.style.clipPath).toBe('inset(0 30% 0 0)');
    });

    it('1.4 should respond to keyboard arrow navigation (ArrowLeft, ArrowRight, Home, End)', () => {
      const onPositionChange = vi.fn();
      render(
        <BeforeAfterSlider
          originalUrl={originalUrl}
          enhancedUrl={enhancedUrl}
          initialPosition={50}
          onPositionChange={onPositionChange}
        />
      );

      const slider = screen.getByTestId('before-after-slider');

      // ArrowLeft decreases by 5%
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(slider).toHaveAttribute('aria-valuenow', '45');
      expect(onPositionChange).toHaveBeenCalledWith(45);

      // ArrowRight increases by 5%
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(slider).toHaveAttribute('aria-valuenow', '50');

      // Home key sets to 0%
      fireEvent.keyDown(slider, { key: 'Home' });
      expect(slider).toHaveAttribute('aria-valuenow', '0');

      // End key sets to 100%
      fireEvent.keyDown(slider, { key: 'End' });
      expect(slider).toHaveAttribute('aria-valuenow', '100');
    });

    it('1.5 should handle mouse drag interaction and fire onPositionChange', () => {
      const onPositionChange = vi.fn();
      render(
        <BeforeAfterSlider
          originalUrl={originalUrl}
          enhancedUrl={enhancedUrl}
          initialPosition={50}
          onPositionChange={onPositionChange}
        />
      );

      const slider = screen.getByTestId('before-after-slider');

      // Mock getBoundingClientRect
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 500,
        bottom: 300,
        width: 500,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Mouse down at x=125 (25%)
      fireEvent.mouseDown(slider, { clientX: 125 });
      expect(onPositionChange).toHaveBeenCalledWith(25);
      expect(slider).toHaveAttribute('aria-valuenow', '25');

      // Mouse move on window at x=375 (75%)
      fireEvent.mouseMove(window, { clientX: 375 });
      expect(onPositionChange).toHaveBeenCalledWith(75);
      expect(slider).toHaveAttribute('aria-valuenow', '75');

      // Mouse up stops dragging
      fireEvent.mouseUp(window);
      fireEvent.mouseMove(window, { clientX: 450 });
      // Position remains 75 because mouse is released
      expect(slider).toHaveAttribute('aria-valuenow', '75');
    });

    it('1.6 should handle touch drag interaction', () => {
      const onPositionChange = vi.fn();
      render(
        <BeforeAfterSlider
          originalUrl={originalUrl}
          enhancedUrl={enhancedUrl}
          initialPosition={50}
          onPositionChange={onPositionChange}
        />
      );

      const slider = screen.getByTestId('before-after-slider');

      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Touch start at x=200 (50%)
      fireEvent.touchStart(slider, {
        touches: [{ clientX: 200, clientY: 150 }],
      });

      // Touch move at x=320 (80%)
      fireEvent.touchMove(window, {
        touches: [{ clientX: 320, clientY: 150 }],
      });
      expect(onPositionChange).toHaveBeenCalledWith(80);
      expect(slider).toHaveAttribute('aria-valuenow', '80');

      // Touch end
      fireEvent.touchEnd(window);
      fireEvent.touchMove(window, {
        touches: [{ clientX: 100, clientY: 150 }],
      });
      expect(slider).toHaveAttribute('aria-valuenow', '80');
    });
  });

  describe('2. Navbar & Marketing Navigation', () => {
    it('2.1 should render logo, all navigation links, and login CTA button', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      );

      expect(screen.getByTestId('navbar-logo')).toBeInTheDocument();
      expect(screen.getByTestId('nav-link-fitur')).toHaveTextContent('Fitur');
      expect(screen.getByTestId('nav-link-cara-kerja')).toHaveTextContent('Cara Kerja');
      expect(screen.getByTestId('nav-link-contoh')).toHaveTextContent('Contoh');
      expect(screen.getByTestId('nav-link-harga')).toHaveTextContent('Harga');
      expect(screen.getByTestId('nav-link-faq')).toHaveTextContent('FAQ');

      const loginBtn = screen.getByTestId('navbar-login-button');
      expect(loginBtn).toBeInTheDocument();
      expect(loginBtn).toHaveAttribute('href', '/login');
    });

    it('2.2 should toggle mobile navigation menu when hamburger button is clicked', () => {
      render(
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      );

      const toggle = screen.getByTestId('navbar-mobile-toggle');
      expect(screen.queryByTestId('navbar-mobile-login')).toBeNull();

      fireEvent.click(toggle);
      expect(screen.getByTestId('navbar-mobile-login')).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(screen.queryByTestId('navbar-mobile-login')).toBeNull();
    });
  });

  describe('3. Hero Section with AI Slider Integration', () => {
    it('3.1 should render headline, subheadline, CTAs, and interactive slider', () => {
      render(
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      );

      expect(
        screen.getByRole('heading', {
          name: /tingkatkan kualitas foto properti seketika dengan ai/i,
        })
      ).toBeInTheDocument();

      expect(screen.getByTestId('hero-badge')).toHaveTextContent(
        /ai real estate enhancer #1 di indonesia/i
      );

      expect(screen.getByTestId('hero-cta-pricing')).toBeInTheDocument();
      expect(screen.getByTestId('hero-cta-gallery')).toBeInTheDocument();
      expect(screen.getByTestId('before-after-slider')).toBeInTheDocument();
    });
  });

  describe('4. Social Proof Section', () => {
    it('4.1 should render stats and partner agency trust badges', () => {
      render(<SocialProof />);

      expect(screen.getByText('10.000+')).toBeInTheDocument();
      expect(screen.getByText('Foto Ditingkatkan')).toBeInTheDocument();

      expect(screen.getByText('99.8%')).toBeInTheDocument();
      expect(screen.getByText('Tingkat Kepuasan')).toBeInTheDocument();

      expect(screen.getByText('5x')).toBeInTheDocument();
      expect(screen.getByText('Lebih Cepat Terjual')).toBeInTheDocument();

      expect(screen.getByText('2.500+')).toBeInTheDocument();
      expect(screen.getByText('Agen & Kantor Properti')).toBeInTheDocument();

      expect(screen.getByTestId('agency-badge-0')).toHaveTextContent('Ray White Realty');
      expect(screen.getByTestId('agency-badge-1')).toHaveTextContent('ERA Indonesia');
    });
  });

  describe('5. Features Section & Batch Processing "Segera Hadir" Badge', () => {
    it('5.1 should render 6 feature cards and explicitly display "Segera Hadir" on Batch feature', () => {
      render(<Features />);

      expect(screen.getByTestId('feature-card-hdr-real-estate')).toBeInTheDocument();
      expect(screen.getByTestId('feature-card-twilight-sky')).toBeInTheDocument();
      expect(screen.getByTestId('feature-card-declutter-staging')).toBeInTheDocument();
      expect(screen.getByTestId('feature-card-interior-brightening')).toBeInTheDocument();
      expect(screen.getByTestId('feature-card-batch-processing')).toBeInTheDocument();
      expect(screen.getByTestId('feature-card-high-res-download')).toBeInTheDocument();

      // Check "Segera Hadir" badge on batch feature
      const batchBadge = screen.getByTestId('badge-segera-hadir');
      expect(batchBadge).toBeInTheDocument();
      expect(batchBadge).toHaveTextContent('Segera Hadir');
    });
  });

  describe('6. How It Works 3-Step Guide', () => {
    it('6.1 should render 3 clear sequential workflow steps', () => {
      render(<HowItWorks />);

      expect(screen.getByTestId('how-it-works-step-1')).toHaveTextContent('Unggah Foto Properti');
      expect(screen.getByTestId('how-it-works-step-2')).toHaveTextContent('AI Memproses Seketika');
      expect(screen.getByTestId('how-it-works-step-3')).toHaveTextContent('Unduh Foto Siap Jual');
    });
  });

  describe('7. Examples Gallery with Category Filters', () => {
    it('7.1 should render category filter buttons and switch categories', () => {
      render(<GalleryExamples />);

      expect(screen.getByTestId('filter-btn-all')).toBeInTheDocument();
      expect(screen.getByTestId('filter-btn-living_room')).toBeInTheDocument();
      expect(screen.getByTestId('filter-btn-exterior')).toBeInTheDocument();
      expect(screen.getByTestId('filter-btn-twilight')).toBeInTheDocument();
      expect(screen.getByTestId('filter-btn-bedroom')).toBeInTheDocument();

      // Filter by Twilight
      fireEvent.click(screen.getByTestId('filter-btn-twilight'));
      expect(screen.getByTestId('gallery-item-example-twilight-1')).toBeInTheDocument();
      expect(screen.queryByTestId('gallery-item-example-bedroom-1')).toBeNull();

      // Reset to All
      fireEvent.click(screen.getByTestId('filter-btn-all'));
      expect(screen.getByTestId('gallery-item-example-bedroom-1')).toBeInTheDocument();
    });
  });

  describe('8. Pricing Section (1 Lifetime Access Package)', () => {
    it('8.1 should display Rp 499.000 lifetime price, 100 foto/bulan quota, and CTA', () => {
      const onSelectPlan = vi.fn();
      render(<PricingSection onSelectPlan={onSelectPlan} />);

      expect(screen.getByTestId('pricing-card-lifetime')).toBeInTheDocument();
      expect(screen.getByText(/499\.000/)).toBeInTheDocument();
      expect(screen.getByText(/999\.000/)).toBeInTheDocument();
      expect(screen.getAllByText(/100 Foto AI/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Reset Otomatis 30 Hari/i)[0]).toBeInTheDocument();

      const buyBtn = screen.getByTestId('pricing-buy-button');
      expect(buyBtn).toBeInTheDocument();
      fireEvent.click(buyBtn);
      expect(onSelectPlan).toHaveBeenCalled();
    });
  });

  describe('9. Testimonials Filter (is_active=true)', () => {
    it('9.1 should render only active testimonials and filter out inactive ones', () => {
      const testData = [
        {
          id: 'test-active-1',
          author_name: 'Active Agent 1',
          author_role: 'Agent',
          author_company: 'Agency Alpha',
          author_avatar_url: null,
          quote: 'Pelayanan sangat memuaskan!',
          rating: 5,
          is_active: true,
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-inactive-2',
          author_name: 'Inactive Agent 2',
          author_role: 'Spammer',
          author_company: 'Hidden Agency',
          author_avatar_url: null,
          quote: 'Ini tidak boleh muncul',
          rating: 1,
          is_active: false,
          sort_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      render(<Testimonials initialTestimonials={testData} />);

      expect(screen.getByText('Active Agent 1')).toBeInTheDocument();
      expect(screen.getByText(/pelayanan sangat memuaskan!/i)).toBeInTheDocument();

      // Inactive testimonial must NOT be rendered
      expect(screen.queryByText('Inactive Agent 2')).toBeNull();
      expect(screen.queryByText(/ini tidak boleh muncul/i)).toBeNull();
    });
  });

  describe('10. FAQ Accordion Filter (is_active=true) & Expand/Collapse', () => {
    it('10.1 should render only active FAQs and toggle accordion answer on click', () => {
      const faqData = [
        {
          id: 'faq-act-1',
          question: 'Pertanyaan Aktif 1?',
          answer: 'Jawaban aktif 1 yang terlihat.',
          category: 'general',
          is_active: true,
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'faq-inact-2',
          question: 'Pertanyaan Nonaktif 2?',
          answer: 'Jawaban tersembunyi nonaktif.',
          category: 'secret',
          is_active: false,
          sort_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      render(<FAQAccordion initialFaqs={faqData} />);

      expect(screen.getByText('Pertanyaan Aktif 1?')).toBeInTheDocument();
      expect(screen.queryByText('Pertanyaan Nonaktif 2?')).toBeNull();

      // Toggle accordion to open
      const toggleBtn = screen.getByTestId('faq-toggle-faq-act-1');
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('faq-answer-faq-act-1')).toHaveTextContent('Jawaban aktif 1 yang terlihat.');

      // Toggle again to collapse
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('faq-answer-faq-act-1')).toBeNull();
    });
  });

  describe('11. Footer Section', () => {
    it('11.1 should render brand description, copyright, and placeholder legal links', () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      );

      expect(screen.getByTestId('landing-footer')).toBeInTheDocument();
      expect(screen.getByTestId('legal-link-kebijakan-privasi')).toBeInTheDocument();
      expect(screen.getByTestId('legal-link-syarat-&-ketentuan')).toBeInTheDocument();
      expect(screen.getByTestId('legal-link-lisensi-penggunaan')).toBeInTheDocument();
      expect(screen.getByText(/Hak Cipta Dilindungi Undang-Undang/i)).toBeInTheDocument();
    });
  });

  describe('12. Full LandingPage Assembly & Smart Auth Redirects', () => {
    it('12.1 should render all sections when unauthenticated without redirecting', async () => {
      renderWithProviders(<LandingPage />);

      await waitFor(() => {
        expect(screen.getByTestId('navbar-logo')).toBeInTheDocument();
        expect(screen.getByTestId('hero-section')).toBeInTheDocument();
        expect(screen.getByTestId('social-proof-section')).toBeInTheDocument();
        expect(screen.getByTestId('features-section')).toBeInTheDocument();
        expect(screen.getByTestId('how-it-works-section')).toBeInTheDocument();
        expect(screen.getByTestId('gallery-section')).toBeInTheDocument();
        expect(screen.getByTestId('pricing-section')).toBeInTheDocument();
        expect(screen.getByTestId('testimonials-section')).toBeInTheDocument();
        expect(screen.getByTestId('faq-section')).toBeInTheDocument();
        expect(screen.getByTestId('landing-footer')).toBeInTheDocument();
      });
    });

    it('12.2 should perform smart redirect to /app for logged-in user with active PEA entitlement', async () => {
      const regularUserId = 'user-active-pea-99';
      mockDb.users.set(regularUserId, {
        id: regularUserId,
        email: 'user@realty.com',
        created_at: new Date().toISOString(),
      });
      mockDb.profiles.set(regularUserId, {
        id: regularUserId,
        email: 'user@realty.com',
        full_name: 'Active Agent',
        phone: '628111222333',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockDb.user_roles.set(regularUserId, {
        id: 'role-user-99',
        user_id: regularUserId,
        role: 'user',
        created_at: new Date().toISOString(),
      });
      mockDb.entitlements.set(regularUserId, {
        id: 'ent-user-99',
        user_id: regularUserId,
        product_code: 'PEA',
        status: 'active',
        monthly_quota: 100,
        consumed_quota: 5,
        cycle_start_date: new Date().toISOString(),
        cycle_reset_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Set logged-in session
      supabase.setMockSession({
        access_token: 'mock_jwt_user_99',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_ref_99',
        user: {
          id: regularUserId,
          email: 'user@realty.com',
          created_at: new Date().toISOString(),
        },
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/app" element={<div data-testid="user-app-view">User App Loaded</div>} />
                <Route path="/admin" element={<div data-testid="admin-view">Admin Loaded</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-app-view')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('admin-view')).toBeNull();
    });

    it('12.3 should perform smart redirect to /admin for logged-in Admin user', async () => {
      const adminUserId = 'admin-user-0001-uuid';
      // Admin is seeded in mockDb with 'admin@propertyenhancer.ai'
      supabase.setMockSession({
        access_token: 'mock_jwt_admin_1',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_ref_admin_1',
        user: {
          id: adminUserId,
          email: 'admin@propertyenhancer.ai',
          created_at: new Date().toISOString(),
        },
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/app" element={<div data-testid="user-app-view">User App</div>} />
                <Route path="/admin" element={<div data-testid="admin-view">Admin Panel Loaded</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('admin-view')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('user-app-view')).toBeNull();
    });
  });
});
