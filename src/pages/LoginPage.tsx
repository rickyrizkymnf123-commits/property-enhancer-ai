import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { LoginCard } from '../components/auth/LoginCard';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { user, isAdmin, isEntitled, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user is already authenticated and has active session, redirect appropriately
  useEffect(() => {
    if (!isLoading && user) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isEntitled) {
        const from = (location.state as any)?.from?.pathname || '/app';
        navigate(from, { replace: true });
      }
    }
  }, [user, isAdmin, isEntitled, isLoading, navigate, location]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 selection:bg-purple-500 selection:text-white">
      {/* Background Neon Glowing Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-purple-600/20 blur-[128px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/20 blur-[128px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[150px]" />

      {/* Brand Header */}
      <div className="relative z-10 mb-8 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-4 py-1.5 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-purple-200">
            Property Enhancer AI
          </span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full flex justify-center">
        <LoginCard />
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-12 text-center text-xs text-slate-500 font-sans">
        &copy; {new Date().getFullYear()} Property Enhancer AI. Hak Cipta Dilindungi Undang-Undang.
      </footer>
    </div>
  );
};

export default LoginPage;
