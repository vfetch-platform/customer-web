'use client';

import { Venue } from '@/types';

interface VenueLocationCardProps {
  venue: Venue;
  showMap?: boolean;
  showHours?: boolean;
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function VenueLocationCard({ venue, showMap = true, showHours = true }: VenueLocationCardProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mapSrc = venue.google_place_id && apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=place_id:${encodeURIComponent(venue.google_place_id)}`
    : apiKey
      ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(venue.address)}`
      : `https://maps.google.com/maps?q=${encodeURIComponent(venue.address)}&output=embed`;

  const todayName = new Date()
    .toLocaleDateString('en-GB', { weekday: 'long' })
    .toLowerCase();

  const orderedDays = DAY_ORDER.filter((day) => venue.collection_hours?.[day]);

  return (
    <div className="space-y-4">
      {/* Map + address card */}
      {showMap && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
          <iframe
            title="Venue location"
            src={mapSrc}
            className="w-full h-48 border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <div className="p-5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-primary text-lg">location_on</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60 mb-0.5">
                Venue Address
              </p>
              <p className="font-headline font-bold text-primary leading-snug">
                {venue.address?.split(',')[0] || venue.name}
              </p>
              <p className="text-xs text-on-secondary-container mt-0.5">
                {venue.address?.split(',').slice(1).join(',').trim() || ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collection hours */}
      {showHours && orderedDays.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-lg">schedule</span>
            </div>
            <h4 className="font-headline font-bold text-primary">Collection Hours</h4>
          </div>
          <div className="space-y-2">
            {orderedDays.map((day) => {
              const hours = venue.collection_hours![day];
              const isToday = todayName === day;
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                    isToday ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`capitalize font-medium ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                  {hours.closed ? (
                    <span className="text-outline text-xs font-medium">Closed</span>
                  ) : (
                    <span className={`font-headline font-bold text-sm ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                      {hours.open} – {hours.close}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
