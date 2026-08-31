import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface ForgotPasswordCardProps {
  onSuccess?: () => void;
}

export const ForgotPasswordCard: React.FC<ForgotPasswordCardProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { resetPasswordForEmail } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Email Diperlukan', 'Mohon masukkan alamat email akun Anda.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPasswordForEmail(email.trim());

      if (result.error) {
        toast.error('Gagal Mengirim Tautan', result.error.message || 'Terjadi kesalahan saat mengirim tautan pemulihan.');
        return;
      }

      setIsSubmitted(true);
      toast.success('Tautan Terkirim', 'Instruksi pemulihan kata sandi telah dikirim ke email Anda.');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      toast.error('Terjadi Kesalahan', err?.message || 'Gagal memproses pemulihan kata sandi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30">
          <KeyRound className="h-6 w-6 text-white" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Lupa Kata Sandi?
        </h1>
        <p className="mt-1 font-sans text-sm text-slate-400">
          Masukkan email terdaftar untuk menerima tautan pemulihan
        </p>
      </div>

      {isSubmitted ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white">Email Pemulihan Terkirim</h3>
            <p className="text-xs leading-relaxed text-slate-300">
              Kami telah mengirimkan tautan reset kata sandi ke{' '}
              <span className="font-medium text-purple-300">{email}</span>. Silakan periksa folder inbox atau spam Anda.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:from-purple-500 hover:to-blue-500"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Halaman Masuk</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recovery-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email Terdaftar
            </label>
            <div className="relative mt-1.5 rounded-lg shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="recovery-email"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all duration-200 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 hover:shadow-purple-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Mengirim Tautan...</span>
              </>
            ) : (
              <>
                <span>Kirim Tautan Pemulihan</span>
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

export default ForgotPasswordCard;
