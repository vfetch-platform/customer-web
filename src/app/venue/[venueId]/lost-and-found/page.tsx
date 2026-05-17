'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { customerApi, getErrorMessage } from '@/lib/api';
import { Venue } from '@/types';
import SearchItems from '@/components/SearchItems';
import ClaimStatus from '@/components/ClaimStatus';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function LostAndFoundPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const venueId = params.venueId as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tab = searchParams.get('tab');
    return tab === 'status' ? 'status' : tab === 'how' ? 'how' : 'search';
  });
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
        <div className="text-center max-w-md bg-white rounded-2xl p-12 shadow-sm border border-outline-variant/10">
          <span className="material-symbols-outlined text-5xl text-outline mb-4 block">error_outline</span>
          <h1 className="font-headline text-2xl font-bold text-primary mb-3">
            {error || 'Venue not found'}
          </h1>
          <p className="text-on-secondary-container font-body mb-8">
            Please check the URL and try again.
          </p>
          <button
            onClick={fetchVenue}
            className="bg-primary text-white py-3 px-8 rounded-full font-headline font-bold hover:bg-primary-container active:scale-95 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar
        variant="app"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        venueLogo={venue.logo}
        venueName={venue.name}
      />

      {/* Main Content */}
      <div>
        {activeTab === 'search' && <SearchItems venue={venue} />}
        {activeTab === 'status' && <ClaimStatus venue={venue} />}
        {activeTab === 'how' && (
          <main className="pt-28 pb-20 px-6 min-h-screen">
            <div className="max-w-4xl mx-auto">
              <header className="text-center mb-16">
                <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4">How it Works</h1>
                <p className="text-on-secondary-container text-lg max-w-xl mx-auto">Our digital concierge guides you through every step — from reporting a lost item to getting it back safely.</p>
              </header>

              <div className="space-y-6">
                {[
                  { number: '01', title: 'Describe Your Item', description: 'Tell us what you lost — include details like brand, colour, size, and where you last saw it.', icon: 'edit_note' },
                  { number: '02', title: 'AI Matches Your Item', description: 'Our system scans the venue\'s inventory and uses AI matching to identify potential matches.', icon: 'smart_toy' },
                  { number: '03', title: 'Claim & Verify', description: 'Found a match? Submit a claim with your stay details. The venue team will verify and approve.', icon: 'verified' },
                  { number: '04', title: 'Choose Collection', description: 'Pick up in person or choose premium courier delivery straight to your door.', icon: 'local_shipping' },
                  { number: '05', title: 'Reunited', description: 'Complete a small platform fee, and your item is on its way back. Track status in real-time.', icon: 'celebration' },
                ].map((s) => (
                  <div key={s.number} className="bg-white rounded-2xl p-8 shadow-sm border border-outline-variant/10 flex items-start gap-5">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-surface-tint text-xl">{s.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-bold text-surface-tint bg-surface-container rounded-full px-2.5 py-0.5">{s.number}</span>
                        <h3 className="font-headline text-lg font-bold text-primary">{s.title}</h3>
                      </div>
                      <p className="text-on-secondary-container text-sm leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-16">
                <button
                  onClick={() => setActiveTab('search')}
                  className="bg-primary text-white px-10 py-4 rounded-full font-headline font-bold hover:bg-primary-container active:scale-95 transition-all"
                >
                  Start Searching
                </button>
              </div>
            </div>
          </main>
        )}
      </div>

      <Footer venue={venue} />
    </div>
  );
}
