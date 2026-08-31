import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navbar } from '../components/landing/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { SocialProof } from '../components/landing/SocialProof';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { GalleryExamples } from '../components/landing/GalleryExamples';
import { PricingSection } from '../components/landing/PricingSection';
import { Testimonials } from '../components/landing/Testimonials';
import { FAQAccordion } from '../components/landing/FAQAccordion';
import { Footer } from '../components/landing/Footer';

export const LandingPage: React.FC = () => {
  const { user, isAdmin, isEntitled, isLoading } = useAuth();
  const navigate = useNavigate();

  // Smart redirect: logged-in users redirected to /admin or /app
  useEffect(() => {
    if (!isLoading && user) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isEntitled) {
        navigate('/app', { replace: true });
      }
    }
  }, [user, isAdmin, isEntitled, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Marketing Navbar */}
      <Navbar />

      {/* Main Content Sections */}
      <main>
        <HeroSection />
        <SocialProof />
        <Features />
        <HowItWorks />
        <GalleryExamples />
        <PricingSection />
        <Testimonials />
        <FAQAccordion />
      </main>

      {/* Footer with Legal Links */}
      <Footer />
    </div>
  );
};

export default LandingPage;
