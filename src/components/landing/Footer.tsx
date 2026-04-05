'use client';

import React from 'react';
import { Venue } from '@/types';

interface FooterProps {
  venue?: Venue;
}


export default function Footer({ venue }: FooterProps) {
  return (
    <footer className="bg-white w-full border-t border-outline-variant/10 mt-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 px-6 md:px-12 py-12 md:py-16 max-w-7xl mx-auto">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-headline font-bold text-lg text-primary mb-3">Vfetch</h3>
          <p className="text-sm text-on-secondary-container leading-relaxed">
            {venue
              ? '"Your Digital Concierge."'
              : 'Providing high-end lost property solutions for premium venues and their guests.'}
          </p>
          {!venue && (
            <p className="text-xs text-on-secondary-container/60 mt-4">
              &copy; {new Date().getFullYear()} Vfetch. Your Digital Concierge.
            </p>
          )}
          {venue && (
            <p className="text-xs text-on-secondary-container/60 mt-4">
              &copy; {new Date().getFullYear()} Vfetch. All rights reserved.
            </p>
          )}
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-headline font-semibold text-sm text-primary mb-4">Legal</h4>
          <ul className="space-y-2.5 text-sm text-on-secondary-container">
            <li><span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span></li>
            <li><span className="hover:text-primary cursor-pointer transition-colors">Terms</span></li>
          </ul>
        </div>

        {/* Social / Stay Connected */}
        <div>
          <h4 className="font-headline font-semibold text-sm text-primary mb-4">
            {venue ? 'Social' : 'Stay Connected'}
          </h4>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center cursor-pointer hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary text-lg">share</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center cursor-pointer hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary text-lg">mail</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-6 md:px-12 pb-6 max-w-7xl mx-auto border-t border-outline-variant/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-on-secondary-container/50">
          &copy; {new Date().getFullYear()} Vfetch. Your Digital Concierge.
        </p>
        <div className="flex items-center gap-4 text-xs text-on-secondary-container/50">
          <span className="material-symbols-outlined text-sm">language</span>
          <span>English (US)</span>
        </div>
      </div>
    </footer>
  );
}
