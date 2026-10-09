'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  LayoutDashboard,
  Bot,
  PlusCircle,
  ExternalLink,
  Activity,
  Zap,
} from 'lucide-react';

interface MobileMenuProps {
  customLinks?: Array<{ name: string; href: string; icon?: React.ReactNode }>;
}

export default function MobileMenu({ customLinks }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navItems = [
    {
      name: 'Overview',
      href: '/',
      icon: <Home size={18} />,
      badge: null,
    },
    {
      name: 'API Marketplace',
      href: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      badge: 'Live APIs',
    },
    {
      name: 'Agentic AI Chat',
      href: '/chat',
      icon: <Bot size={18} />,
      badge: '$0.0001 USDC',
      highlight: true,
    },
    {
      name: 'Deposit / Add Funds',
      href: '/add-funds',
      icon: <PlusCircle size={18} />,
      badge: 'Gateway',
    },
  ];

  return (
    <div className="sm:hidden">
      {/* Hamburger Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close menu' : 'Open navigation menu'}
        className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 border cursor-pointer ${
          isOpen
            ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            : 'bg-slate-900/80 border-slate-700/70 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800'
        }`}
      >
        {isOpen ? <X size={20} className="animate-in spin-in-90 duration-200" /> : <Menu size={20} />}
      </button>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-start">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Drawer Content */}
          <div className="relative w-full bg-[#0A0D12] border-b border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-4 duration-200 z-10">
            {/* Header in Drawer */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-black/40">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5"
              >
                <img
                  src="/nanoapigateway_logo.png"
                  alt="Logo"
                  className="w-7 h-7 rounded-lg object-cover shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                />
                <span className="font-bold text-white tracking-tight text-base">
                  NanoAPI<span className="text-cyan-400">Gateway</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Links List */}
            <div className="p-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 px-3 mb-2">
                Navigation
              </div>

              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-xl font-medium text-sm transition-all border ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
                        : item.highlight
                        ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30 text-yellow-300 hover:border-yellow-500/60'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-cyan-400' : item.highlight ? 'text-yellow-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          item.highlight
                            ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Custom extra links if provided */}
              {customLinks && customLinks.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 mt-3 space-y-2">
                  {customLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-slate-300 bg-slate-900/40 border border-slate-800 hover:bg-slate-800 hover:text-white"
                    >
                      {link.icon}
                      <span>{link.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Network & Live Status Info */}
            <div className="p-4 pt-2 border-t border-slate-800/80 bg-black/60 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 px-1">
                Network Status
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  Arc Mainnet (5042)
                </span>
                <a
                  href="https://explorer.arc.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] flex items-center gap-1 underline"
                >
                  Explorer <ExternalLink size={11} />
                </a>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <Zap size={13} className="text-cyan-400" />
                  Circle Gateway
                </span>
                <span className="font-mono text-[11px] text-emerald-400 font-bold">
                  Domain 26 / 6
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
