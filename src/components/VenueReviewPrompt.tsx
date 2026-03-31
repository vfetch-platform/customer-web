'use client';

import React, { useState } from 'react';
import { Venue } from '@/types';

interface VenueReviewPromptProps {
  venue: Venue;
}

function getReviewUrl(venue: Venue): string {
  if (venue.google_place_id) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(venue.google_place_id)}`;
  }
  if (venue.review_url) {
    return venue.review_url;
  }
  const query = `${venue.name} ${venue.address}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function VenueReviewPrompt({ venue }: VenueReviewPromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const reviewUrl = getReviewUrl(venue);

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] editorial-shadow p-8 md:p-12">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-tertiary-fixed/20 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
            star
          </span>
        </div>
        <h3 className="font-headline text-xl font-bold text-primary">
          Glad you got your item back!
        </h3>
        <p className="text-on-secondary-container text-sm mt-2 max-w-md">
          Help others find <span className="font-bold">{venue.name}</span> by leaving a quick review. It only takes a moment and means a lot to the venue.
        </p>
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 hero-gradient text-white font-headline font-bold py-3 px-8 rounded-full hover:opacity-90 transition-opacity active:scale-95"
        >
          <span className="material-symbols-outlined text-xl">rate_review</span>
          Leave a Google Review
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="mt-3 text-xs text-on-surface-variant hover:text-on-secondary-container transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
