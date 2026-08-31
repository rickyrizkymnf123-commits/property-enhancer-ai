import React from 'react';
import { Sparkles, MessageCircle, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { name: 'Fitur', href: '#features' },
    { name: 'Cara Kerja', href: '#how-it-works' },
    { name: 'Contoh Hasil', href: '#gallery' },
    { name: 'Harga', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
  ];

  const legalLinks = [
    { name: 'Kebijakan Privasi', href: '#privacy' },
    { name: 'Syarat & Ketentuan', href: '#terms' },
    { name: 'Lisensi Penggunaan', href: '#license' },
  ];

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const id = href.substring(1);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="border-t border-white/10 bg-slate-950 text-slate-400 py-16" data-testid="landing-footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-12 border-b border-white/10">
          
          {/* Col 1: Brand Info (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 p-0.5 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <div className="flex h-full w-full items-center justify-center rounded-[9px] bg-slate-950">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                </div>
              </div>
              <span className="font-heading text-lg font-extrabold tracking-tight text-white">
                Property Enhancer <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
              </span>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Platform kecerdasan buatan terdepan untuk meningkatkan kualitas foto properti seketika. Solusi tepat bagi agen dan pengembang properti di seluruh Indonesia.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Sistem Operasional 100% Aktif
              </span>
            </div>
          </div>

          {/* Col 2: Navigasi (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
              Navigasi Cepat
            </h4>
            <ul className="space-y-2.5 text-sm">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    onClick={(e) => handleScroll(e, link.href)}
                    className="hover:text-purple-300 transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                  Masuk ke Akun →
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Dukungan (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
              Legal & Kontak
            </h4>
            <ul className="space-y-2.5 text-sm">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    onClick={(e) => handleScroll(e, link.href)}
                    className="hover:text-purple-300 transition-colors"
                    data-testid={`legal-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>

            <div className="pt-3 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span>support@propertyenhancer.ai</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Priority Support (24/7)</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Jakarta, Indonesia</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {currentYear} Property Enhancer AI. Hak Cipta Dilindungi Undang-Undang.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Dibuat untuk standar visual real estate terbaik.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
