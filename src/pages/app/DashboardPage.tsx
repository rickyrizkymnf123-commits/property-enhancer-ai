import React, { useState } from 'react';
import AppSidebar from '../../components/shared/AppSidebar';
import Header from '../../components/shared/Header';
import UserDashboardContent from '../../components/dashboard/UserDashboardContent';
import OnboardingTutorial from '../../components/dashboard/OnboardingTutorial';

export const DashboardPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-950 flex" data-testid="dashboard-page">
      {/* Sidebar */}
      <AppSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Dashboard Ringkasan"
          subtitle="Selamat datang di Property Enhancer AI Studio"
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <UserDashboardContent onOpenTutorial={() => setTutorialOpen(true)} />
        </main>
      </div>

      {/* Onboarding Tutorial Modal */}
      <OnboardingTutorial
        isOpen={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
