'use client';

import React from 'react';

interface NavbarProps {
  variant?: 'landing' | 'app';
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  venueLogo?: string;
  venueName?: string;
}

const NAV_LINKS = [
  { key: 'search', label: 'Find Item' },
  { key: 'status', label: 'Track Status' },
  { key: 'how', label: 'How it Works' },
];

export default function Navbar({ variant = 'landing', activeTab, onTabChange, venueLogo, venueName }: NavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-outline-variant/10">
      <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/favicon-nobg.svg" alt="Vfetch" className="h-6 w-auto" />
          <span className="font-headline font-bold text-lg text-primary tracking-tight">Vfetch</span>
        </div>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {variant === 'app' ? (
            NAV_LINKS.map((link) => (
              <button
                key={link.key}
                onClick={() => onTabChange?.(link.key)}
                className={`font-body text-sm font-medium transition-all duration-200 pb-0.5 ${
                  activeTab === link.key
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-secondary-container hover:text-primary border-b-2 border-transparent'
                }`}
              >
                {link.label}
              </button>
            ))
          ) : (
            <>
              <a href="#" className="font-body text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">Find Item</a>
              <a href="#" className="font-body text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">Track Status</a>
              <a href="#" className="font-body text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">How it Works</a>
            </>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <span className="font-body text-sm font-medium text-on-secondary-container hover:text-primary cursor-pointer transition-colors">Help/Support</span>
          {variant === 'app' && venueLogo && (
            <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/10">
              <img alt={venueName || 'Venue'} className="w-full h-full object-cover" src={venueLogo} />
            </div>
          )}
          {variant === 'app' && (
            <button className="md:hidden p-1">
              <span className="material-symbols-outlined text-primary text-2xl">menu</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile tab bar for app variant */}
      {variant === 'app' && (
        <div className="md:hidden flex border-t border-outline-variant/10">
          {NAV_LINKS.map((link) => (
            <button
              key={link.key}
              onClick={() => onTabChange?.(link.key)}
              className={`flex-1 py-3 text-center text-sm font-body font-medium ${
                activeTab === link.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-secondary-container'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
