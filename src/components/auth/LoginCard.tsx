import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface LoginCardProps {
  onSuccess?: (targetRoute: string) => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error('Gagal Masuk', 'Mohon masukkan email dan kata sandi Anda.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn(email.trim(), password);

      if (result.error) {
        toast.error('Gagal Masuk', result.error.message || 'Email atau kata sandi tidak valid.');
        return;
      }

      // Check role and entitlement
      if (result.isAdmin) {
        toast.success('Selamat Datang Admin', 'Mengarahkan ke Admin Panel...');
        if (onSuccess) {
          onSuccess('/admin');
        } else {
          navigate('/admin', { replace: true });
        }
      } else if (result.isEntitled) {
        toast.success('Akses Berhasil', 'Selamat datang di Property Enhancer AI');
        if (onSuccess) {
          onSuccess('/app');
        } else {
          navigate('/app', { replace: true });
        }
      } else {
        // User is authenticated in Supabase auth, but has NO active PEA entitlement!
        await signOut();
        toast.error('Akses belum aktif', 'Akun Anda belum memiliki akses aktif Property Enhancer AI. Silakan hubungi admin via WhatsApp.');
        // User stays on /login
      }
    } catch (err: any) {
      toast.error('Terjadi Kesalahan', err?.message || 'Gagal memproses permintaan login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Masuk ke Akun
        </h1>
        <p className="mt-1 font-sans text-sm text-slate-400">
          Akses Eksklusif Property Enhancer AI
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Email Terdaftar
          </label>
          <div className="relative mt-1.5 rounded-lg shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              disabled={isSubmitting}
              className="block w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Kata Sandi
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-purple-400 transition-colors hover:text-purple-300 hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative mt-1.5 rounded-lg shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isSubmitting}
              className="block w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-white"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-950 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
          />
          <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-300">
            Ingat saya di perangkat ini
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all duration-200 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 hover:shadow-purple-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Memverifikasi Akses...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Akun</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Paid-Only Access Notice (STRICTLY NO REGISTRATION LINK) */}
      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-purple-500/20 bg-purple-950/30 p-3.5 text-xs text-slate-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
          <div className="leading-relaxed">
            <p className="font-semibold text-white">Platform Berbayar Eksklusif</p>
            <p className="mt-0.5 text-slate-400">
              Pendaftaran publik ditutup. Akses kredensial dan kuota bulanan diberikan secara otomatis via WhatsApp setelah pembayaran berhasil.
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20ingin%20aktivasi%20akses%20Property%20Enhancer%20AI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Butuh Bantuan atau Aktivasi Akses via WhatsApp?</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginCard;
