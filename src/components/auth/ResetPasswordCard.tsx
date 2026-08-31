import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface ResetPasswordCardProps {
  onSuccess?: () => void;
}

export const ResetPasswordCard: React.FC<ResetPasswordCardProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { updateUserPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      toast.error('Kata Sandi Terlalu Pendek', 'Kata sandi minimal harus 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Konfirmasi Tidak Cocok', 'Kata sandi dan konfirmasi kata sandi tidak sama.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateUserPassword(password);

      if (result.error) {
        toast.error('Gagal Memperbarui', result.error.message || 'Terjadi kesalahan saat memperbarui kata sandi.');
        return;
      }

      setIsSuccess(true);
      toast.success('Kata Sandi Diperbarui', 'Kata sandi Anda berhasil diperbarui.');

      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    } catch (err: any) {
      toast.error('Terjadi Kesalahan', err?.message || 'Gagal memproses pembaruan kata sandi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30">
          <Lock className="h-6 w-6 text-white" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Atur Ulang Kata Sandi
        </h1>
        <p className="mt-1 font-sans text-sm text-slate-400">
          Buat kata sandi baru untuk akun Anda
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white">Kata Sandi Berhasil Diperbarui</h3>
            <p className="text-xs leading-relaxed text-slate-300">
              Sekarang Anda dapat masuk menggunakan kata sandi baru Anda.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:from-purple-500 hover:to-blue-500"
            >
              <span>Masuk Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Kata Sandi Baru
            </label>
            <div className="relative mt-1.5 rounded-lg shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
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

          {/* Confirm New Password */}
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative mt-1.5 rounded-lg shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                disabled={isSubmitting}
                className="block w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-white"
                aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <span>Perbarui Kata Sandi</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <div className="pt-3 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ResetPasswordCard;
