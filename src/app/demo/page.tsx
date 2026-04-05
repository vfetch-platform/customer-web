'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { customerApi } from '@/lib/api';
import Footer from '@/components/landing/Footer';

interface Venue {
  id: string;
  name: string;
  type: string;
  city?: string;
}

export default function LandingPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const data = await customerApi.getVenues();
        const activeVenues = [...data].filter((v, i, self) =>
          i === self.findIndex((t) => t.id === v.id)
        );
        setVenues(activeVenues);
        if (activeVenues.length > 0) setSelectedVenue(activeVenues[0].id);
      } catch {
        setVenues([{ id: 'demo-hotel-123', name: 'Grand Plaza Hotel (Demo)', type: 'hotel' }]);
        setSelectedVenue('demo-hotel-123');
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const handleReportItem = () => {
    if (selectedVenue) router.push(`/venue/${selectedVenue}/lost-and-found`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body text-on-surface">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-7xl mx-auto">
          <span className="font-headline font-bold text-lg text-primary tracking-tight">Vfetch</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="font-body text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">Find Item</a>
            <a href="#" className="font-body text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">Track Status</a>
            <a href="#" className="font-body text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">How it Works</a>
          </div>
          <span className="font-body text-sm font-medium text-on-secondary-container hover:text-primary cursor-pointer transition-colors">Help/Support</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 md:pt-40 pb-16 md:pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left: Text content */}
          <div>
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold text-primary leading-tight mb-6">
              Effortlessly reuniting you with your <span className="text-surface-tint">belongings.</span>
            </h1>
            <p className="text-on-secondary-container text-base md:text-lg leading-relaxed mb-8 max-w-lg">
              Our digital concierge service is here to help reunite you with your belongings. Precision tracking meets high-end care.
            </p>

            {/* Venue selector (inline) */}
            {!loading && venues.length > 1 && (
              <div className="mb-6">
                <select
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                  className="w-full md:w-auto bg-white border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface font-body appearance-none cursor-pointer focus:border-primary focus:outline-none transition-colors capitalize"
                >
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name} {venue.city ? `- ${venue.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-10">
              <button
                onClick={handleReportItem}
                disabled={loading || !selectedVenue}
                className="bg-primary text-white px-8 py-3.5 rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                Report a Lost Item
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
              <button
                onClick={handleReportItem}
                disabled={loading || !selectedVenue}
                className="bg-white text-primary px-8 py-3.5 rounded-full font-headline font-bold text-sm border border-outline-variant/20 hover:bg-surface-container-low active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                Track Status
                <span className="material-symbols-outlined text-lg">radar</span>
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-12">
              <div>
                <p className="font-headline text-3xl md:text-4xl font-bold text-primary">95%</p>
                <p className="text-xs text-on-secondary-container">Items found &amp; returned</p>
              </div>
              <div>
                <p className="font-headline text-3xl md:text-4xl font-bold text-primary">48h</p>
                <p className="text-xs text-on-secondary-container">Average return time</p>
              </div>
            </div>
          </div>

          {/* Right: Image and floating cards */}
          <div className="relative hidden md:block">
            {/* Main hotel image */}
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/5]">
              <img src="/main.jpg" alt="Luxury hotel interior" className="w-full h-full object-cover" />
            </div>

            {/* Floating card: Secure Transfer */}
            <div className="absolute -right-4 top-16 bg-white rounded-2xl p-5 shadow-lg border border-outline-variant/10 w-44">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-primary text-xl">lock</span>
              </div>
              <p className="font-headline font-bold text-sm text-primary">Secure Transfer</p>
            </div>

            {/* Floating card: Active Searches */}
            <div className="absolute -left-4 bottom-32 bg-primary rounded-2xl p-5 shadow-lg w-56 text-white">
              <p className="text-xs font-medium opacity-80 mb-1">Active Searches</p>
              <p className="font-headline text-3xl font-bold">1,204</p>
            </div>

            {/* Floating card: Verified Venues */}
            <div className="absolute -right-4 bottom-12 bg-surface-container-low rounded-2xl p-5 shadow-lg border border-outline-variant/10 w-44">
              <div className="w-10 h-10 rounded-full bg-surface-tint/10 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-surface-tint text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
              <p className="font-headline font-bold text-sm text-primary">Verified Venues</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="bg-surface-container-low py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-surface-tint mb-3">Process</p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4">A seamless journey back to you.</h2>
            <p className="text-on-secondary-container text-sm max-w-lg mx-auto leading-relaxed">
              We combine digital precision with a concierge&apos;s touch to manage the complexities of lost property.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: 'description', title: '1. Quick Report', desc: 'Provide basic details about your item. No complicated forms, just the essentials to help us identify it.' },
              { icon: 'radar', title: '2. Intelligent Matching', desc: 'Our system scans thousands of venue databases instantly to find potential matches for your lost item.' },
              { icon: 'sell', title: '3. Secure Return', desc: 'Choose your preferred collection method or have your item securely couriered back to your doorstep.' },
            ].map((step) => (
              <div key={step.title} className="text-center md:text-left">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-outline-variant/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <span className="material-symbols-outlined text-primary text-xl">{step.icon}</span>
                </div>
                <h3 className="font-headline font-bold text-lg text-primary mb-2">{step.title}</h3>
                <p className="text-on-secondary-container text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status Update Section */}
      <section className="py-20 md:py-28 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="bg-surface-container-low rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
          {/* Left */}
          <div>
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
              Latest Update
            </span>
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-4 leading-tight">
              Peace of mind, delivered in real-time.
            </h2>
            <p className="text-on-secondary-container text-sm leading-relaxed mb-6">
              Every lost item is assigned a dedicated concierge status. Get notifications every step of the way.
            </p>
            <span className="text-sm font-medium text-primary underline underline-offset-4 cursor-pointer hover:text-surface-tint transition-colors">
              Learn more about our security
            </span>
          </div>

          {/* Right: Status tracker mockup */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg">inventory_2</span>
                </div>
                <div>
                  <p className="text-xs text-on-secondary-container">Status Update</p>
                  <p className="font-headline font-bold text-sm text-primary">Leather Wallet</p>
                </div>
              </div>
              <span className="bg-surface-tint/10 text-surface-tint text-xs font-bold px-3 py-1 rounded-full">
                MATCH FOUND
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-surface-container rounded-full mb-4">
              <div className="absolute left-0 top-0 h-2 bg-primary rounded-full" style={{ width: '50%' }} />
            </div>

            <div className="flex justify-between text-[10px] text-on-secondary-container uppercase tracking-wider">
              <span className="text-primary font-bold">Reported</span>
              <span className="text-primary font-bold">Located</span>
              <span>In Transit</span>
              <span>Returned</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
