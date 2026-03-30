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
  const [activeTab, setActiveTab] = useState<'search' | 'status'>('search');
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
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <img src="/favicon-nobg.svg" alt="VFetch" className="h-8 w-auto" />
            <div className="hidden md:flex gap-6">
              <button
                onClick={() => setActiveTab('search')}
                className={`font-headline font-bold tracking-tight transition-all duration-200 ${
                  activeTab === 'search'
                    ? 'text-surface-tint border-b-2 border-surface-tint pb-1'
                    : 'text-on-secondary-container hover:text-primary'
                }`}
              >
                Find Item
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`font-headline font-bold tracking-tight transition-all duration-200 ${
                  activeTab === 'status'
                    ? 'text-surface-tint border-b-2 border-surface-tint pb-1'
                    : 'text-on-secondary-container hover:text-primary'
                }`}
              >
                Track Status
              </button>
              <span className="text-on-secondary-container font-headline font-bold tracking-tight cursor-default">
                How it Works
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-on-secondary-container hover:opacity-80 transition-all duration-200 font-headline font-bold tracking-tight">
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
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 text-center text-sm font-headline font-bold ${
              activeTab === 'search'
                ? 'text-surface-tint border-b-2 border-surface-tint'
                : 'text-on-secondary-container'
            }`}
          >
            Find Item
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-3 text-center text-sm font-headline font-bold ${
              activeTab === 'status'
                ? 'text-surface-tint border-b-2 border-surface-tint'
                : 'text-on-secondary-container'
            }`}
          >
            Track Status
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div>
        {activeTab === 'search' && <SearchItems venue={venue} />}
        {activeTab === 'status' && <ClaimStatus venue={venue} />}
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
                <li><span className="opacity-70 cursor-default">Collection Hours</span></li>
              )}
              <li><span className="opacity-70 cursor-default">Contact Venue</span></li>
              <li><span className="opacity-70 cursor-default">Privacy Policy</span></li>
              <li><span className="opacity-70 cursor-default">Terms of Service</span></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="font-headline font-bold text-lg mb-6">Support</h4>
            <p className="opacity-70">Need immediate assistance? Our 24/7 concierge desk is here to help.</p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">phone_in_talk</span>
              </div>
              <span className="font-bold">{venue.phone || 'Contact Venue'}</span>
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
