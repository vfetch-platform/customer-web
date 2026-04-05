'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { customerApi, getErrorMessage } from '@/lib/api';
import { Venue } from '@/types';
import SearchItems from '@/components/SearchItems';
import ClaimStatus from '@/components/ClaimStatus';

export default function LostAndFoundPage() {
  const params = useParams();
  const venueId = params.venueId as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'status' | 'how'>('search');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await customerApi.getVenue(venueId);
      setVenue(response.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      console.error('Error fetching venue:', err);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    if (venueId) {
      fetchVenue();
    }
  }, [venueId, fetchVenue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-surface-tint border-t-transparent animate-spin" />
          <p className="font-body text-on-secondary-container text-sm">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="text-center max-w-md bg-surface-container-lowest rounded-[2rem] p-12 editorial-shadow">
          <span className="material-symbols-outlined text-6xl text-outline mb-4 block">error_outline</span>
          <h1 className="font-headline text-2xl font-bold text-primary mb-3">
            {error || 'Venue not found'}
          </h1>
          <p className="text-on-secondary-container font-body mb-8">
            Please check the URL and try again.
          </p>
          <button
            onClick={fetchVenue}
            className="bg-gradient-to-r from-primary to-primary-container text-white py-3 px-8 rounded-full font-headline font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Glassmorphic Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#f3faff]/80 backdrop-blur-md shadow-[0px_24px_48px_rgba(7,30,39,0.06)]">
        <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-7xl mx-auto">
          {/* Logo + Nav links */}
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2.5">
              <img src="/favicon-nobg.svg" alt="VFetch" className="h-8 w-auto" />
              <span className="font-headline font-extrabold text-lg text-primary tracking-tight">VFetch</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {([
                { key: 'search' as const, label: 'Find Item' },
                { key: 'status' as const, label: 'Track Status' },
                { key: 'how' as const, label: 'How it Works' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`font-body font-semibold text-sm tracking-tight transition-all duration-200 pb-1 ${
                    activeTab === tab.key
                      ? 'text-surface-tint border-b-2 border-surface-tint'
                      : 'text-on-secondary-container hover:text-primary border-b-2 border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {/* Right side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => document.getElementById('footer-support')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-on-secondary-container hover:text-primary transition-all duration-200 font-body font-semibold text-sm"
            >
              Support
            </button>
            {venue.logo && (
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/10">
                <img
                  alt={`${venue.name} logo`}
                  className="w-full h-full object-cover"
                  src={venue.logo}
                />
              </div>
            )}
          </div>
        </div>
        {/* Mobile tab bar */}
        <div className="md:hidden flex border-t border-outline-variant/10">
          {([
            { key: 'search' as const, label: 'Find Item' },
            { key: 'status' as const, label: 'Track Status' },
            { key: 'how' as const, label: 'How it Works' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-center text-sm font-body font-semibold ${
                activeTab === tab.key
                  ? 'text-surface-tint border-b-2 border-surface-tint'
                  : 'text-on-secondary-container'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div>
        {activeTab === 'search' && <SearchItems venue={venue} />}
        {activeTab === 'status' && <ClaimStatus venue={venue} />}
        {activeTab === 'how' && (
          <main className="pt-32 pb-20 px-6 min-h-screen">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <header className="text-center mb-16">
                <h1 className="font-headline text-5xl font-extrabold text-primary tracking-tight mb-4">How it Works</h1>
                <p className="text-on-secondary-container text-lg max-w-xl mx-auto font-body">Our digital concierge guides you through every step — from reporting a lost item to getting it back safely.</p>
              </header>

              {/* Steps */}
              <div className="space-y-6">
                {[
                  {
                    number: '01',
                    title: 'Describe Your Item',
                    description: 'Tell us what you lost — include details like brand, colour, size, and where you last saw it. The more specific, the better our AI can match.',
                    icon: 'edit_note',
                  },
                  {
                    number: '02',
                    title: 'AI Matches Your Item',
                    description: 'Our system scans the venue\'s inventory of found items and uses AI matching to identify potential matches. You\'ll see results ranked by confidence.',
                    icon: 'smart_toy',
                  },
                  {
                    number: '03',
                    title: 'Claim & Verify',
                    description: 'Found a match? Submit a claim with your stay details. The venue team will verify your identity and approve the claim.',
                    icon: 'verified',
                  },
                  {
                    number: '04',
                    title: 'Choose Collection',
                    description: 'Pick up in person during venue collection hours, or choose premium courier delivery straight to your door via our logistics partners.',
                    icon: 'local_shipping',
                  },
                  {
                    number: '05',
                    title: 'Reunited',
                    description: 'Complete a small platform fee, and your item is on its way back to you. Track the status in real-time from this portal.',
                    icon: 'celebration',
                  },
                ].map((s) => (
                  <div key={s.number} className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-10 editorial-shadow flex items-start gap-6">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-surface-tint text-2xl">{s.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-surface-tint bg-surface-container rounded-full px-2.5 py-0.5 font-headline">{s.number}</span>
                        <h3 className="font-headline text-xl font-bold text-primary">{s.title}</h3>
                      </div>
                      <p className="text-on-secondary-container font-body leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center mt-16">
                <button
                  onClick={() => setActiveTab('search')}
                  className="hero-gradient text-white px-12 py-4 rounded-full font-headline font-bold text-lg shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95 duration-200"
                >
                  Start Searching
                </button>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#dbf1fe] w-full rounded-t-[2rem] mt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-12 py-16 max-w-7xl mx-auto font-body text-sm leading-relaxed text-primary">
          <div className="space-y-6">
            <img src="/favicon-nobg.svg" alt="VFetch" className="h-7 w-auto" />
            <p className="opacity-70 max-w-xs">
              Connecting lost treasures with their rightful owners through smart concierge technology.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-headline font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {venue.collection_hours && (
                <li><button onClick={() => { setActiveTab('status'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="opacity-70 hover:opacity-100 hover:text-surface-tint transition-all">Collection Hours</button></li>
              )}
              {venue.phone && (
                <li><a href={`tel:${venue.phone}`} className="opacity-70 hover:opacity-100 hover:text-surface-tint transition-all">Contact Venue</a></li>
              )}
              {!venue.phone && venue.email && (
                <li><a href={`mailto:${venue.email}`} className="opacity-70 hover:opacity-100 hover:text-surface-tint transition-all">Contact Venue</a></li>
              )}
              <li><button onClick={() => { setActiveTab('how'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="opacity-70 hover:opacity-100 hover:text-surface-tint transition-all">How it Works</button></li>
              <li><button onClick={() => { setActiveTab('search'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="opacity-70 hover:opacity-100 hover:text-surface-tint transition-all">Find Item</button></li>
            </ul>
          </div>
          <div id="footer-support" className="space-y-6">
            <h4 className="font-headline font-bold text-lg mb-6">Support</h4>
            <p className="opacity-70">Need immediate assistance? Our 24/7 concierge desk is here to help.</p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">phone_in_talk</span>
              </div>
              {venue.phone ? (
                <a href={`tel:${venue.phone}`} className="font-bold hover:text-surface-tint transition-colors">{venue.phone}</a>
              ) : (
                <span className="font-bold">Contact Venue</span>
              )}
            </div>
          </div>
        </div>
        <div className="px-12 pb-12 max-w-7xl mx-auto border-t border-primary/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="opacity-50 text-xs text-primary">© {new Date().getFullYear()} VFetch Hospitality. All rights reserved.</p>
          <div className="flex gap-6 opacity-50">
            <span className="material-symbols-outlined cursor-pointer hover:opacity-100 transition-opacity text-primary">language</span>
            <span className="material-symbols-outlined cursor-pointer hover:opacity-100 transition-opacity text-primary">verified_user</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
