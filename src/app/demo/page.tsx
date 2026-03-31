'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { customerApi } from '@/lib/api';

interface Venue {
    id: string;
    name: string;
    type: string;
    city?: string;
}

export default function DemoPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
        try {
            const data = await customerApi.getVenues();
            const activeVenues = [
                ...data
            ].filter((v, i, self) =>
                // Deduplicate by ID just in case
                i === self.findIndex((t) => t.id === v.id)
            );

            setVenues(activeVenues);
            if (activeVenues.length > 0) {
                setSelectedVenue(activeVenues[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch venues:", error);
            // Fallback if API fails completely
            setVenues([
                { id: 'demo-hotel-123', name: 'Grand Plaza Hotel (Demo)', type: 'hotel' }
            ]);
            setSelectedVenue('demo-hotel-123');
        } finally {
            setLoading(false);
        }
    };

    fetchVenues();
  }, []);

  const handleVisitDemo = () => {
    if (selectedVenue) {
        router.push(`/venue/${selectedVenue}/lost-and-found`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-body text-on-surface">
      <main className="flex-grow flex items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-surface-container rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-tertiary-fixed rounded-full blur-[100px] opacity-20" />
        </div>

        <div className="w-full max-w-[1100px] grid md:grid-cols-2 bg-surface-container-lowest rounded-3xl editorial-shadow overflow-hidden z-10 ghost-border">
          {/* Left Side: Visual/Branding */}
          <div className="hidden md:flex flex-col justify-between p-12 hero-gradient text-white relative overflow-hidden">
            <div className="z-10">
              <div className="flex items-center gap-2 mb-12">
                <span className="material-symbols-outlined text-tertiary-fixed text-3xl">verified_user</span>
                <span className="font-headline font-extrabold text-2xl tracking-tight">VFetch</span>
              </div>
              <h1 className="font-headline text-4xl font-bold leading-tight mb-6">
                Reclaiming what&apos;s yours, with concierge care.
              </h1>
              <p className="text-surface-container font-body text-lg leading-relaxed max-w-sm">
                Access your secure portal to track lost items, manage claims, and connect with our hospitality partners.
              </p>
            </div>

            <div className="z-10 mt-auto">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">support_agent</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Need assistance?</p>
                  <p className="text-xs text-surface-container/80">Our concierge is available 24/7</p>
                </div>
              </div>
            </div>

            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          </div>

          {/* Right Side: Venue Selection */}
          <div className="p-8 md:p-16 flex flex-col justify-center bg-surface-container-lowest">
            <div className="mb-10 text-center md:text-left">
              <div className="md:hidden flex justify-center mb-6">
                <span className="font-headline font-extrabold text-3xl text-primary tracking-tight">VFetch</span>
              </div>
              <h2 className="font-headline text-2xl font-bold text-primary">Lost & Found</h2>
              <p className="text-on-secondary-container mt-2">Select your venue to begin searching for your items.</p>
            </div>

            <div className="space-y-6">
              {/* Venue Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-secondary-container px-1" htmlFor="venue">
                  Select Venue
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg group-focus-within:text-surface-tint">location_on</span>
                  {loading ? (
                    <div className="w-full pl-12 pr-4 py-4 rounded-xl bg-surface-container-low animate-pulse h-[56px]" />
                  ) : (
                    <select
                      id="venue"
                      value={selectedVenue}
                      onChange={(e) => setSelectedVenue(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 focus:bg-surface-container-lowest border-b-2 border-b-outline-variant/30 focus:border-b-surface-tint transition-all text-on-surface font-body appearance-none cursor-pointer capitalize"
                    >
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name} ({venue.type?.replace('_', ' ') || 'Venue'}) {venue.city ? `- ${venue.city}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Feature List */}
              <div className="p-5 rounded-xl bg-surface-container-low space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-on-secondary-container">What you can do</p>
                <ul className="space-y-2.5">
                  {[
                    { icon: 'search', text: 'Search for lost items with AI-powered matching' },
                    { icon: 'assignment_turned_in', text: 'Submit a claim for found items' },
                    { icon: 'fact_check', text: 'Check claim status with a Claim ID' },
                    { icon: 'local_shipping', text: 'Choose collection methods (pickup, courier)' },
                  ].map(({ icon, text }) => (
                    <li key={icon} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-surface-tint text-lg mt-0.5">{icon}</span>
                      <span className="text-sm text-on-surface-variant">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleVisitDemo}
                disabled={loading || !selectedVenue}
                className="w-full py-4 hero-gradient text-white rounded-full font-headline font-bold text-lg shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enter Lost &amp; Found
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-8 w-full bg-surface border-t border-outline-variant/15">
          <div className="flex items-center gap-6 mb-4 md:mb-0">
            <span className="font-headline font-semibold text-primary">VFetch</span>
            <p className="font-body text-sm text-on-secondary-container">&copy; 2024 VFetch Hospitality Systems. Secure Concierge Portal.</p>
          </div>
          <div className="flex gap-8">
            <a className="font-body text-sm text-on-secondary-container hover:text-surface-tint transition-colors" href="#">Privacy Policy</a>
            <a className="font-body text-sm text-on-secondary-container hover:text-surface-tint transition-colors" href="#">Terms of Service</a>
            <a className="font-body text-sm text-on-secondary-container hover:text-surface-tint transition-colors" href="#">Accessibility</a>
            <a className="font-body text-sm text-on-secondary-container hover:text-surface-tint transition-colors" href="#">Cookie Settings</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
