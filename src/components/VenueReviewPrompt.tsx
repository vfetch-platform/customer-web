'use client';

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
  const reviewUrl = getReviewUrl(venue);

  return (
    <div className="overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-br from-white via-white to-green-50/70 shadow-sm">
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 ring-1 ring-green-100">
            <span className="material-symbols-outlined text-[24px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
          </div>

          <div className="max-w-2xl">
            <p className="font-headline text-lg font-bold text-primary md:text-xl">
              If this has felt seamless so far, a quick review would mean a lot.
            </p>
            <p className="mt-1.5 text-sm italic leading-relaxed text-on-secondary-container md:text-[15px]">
              A quick Google review for <span className="font-semibold text-primary">{venue.name}</span> builds trust and recognises the team for making this process feel easy. It takes less than a minute.
            </p>
          </div>
        </div>

        <div className="md:shrink-0">
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full hero-gradient px-6 py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 transition-opacity active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">rate_review</span>
            Leave a Google Review
          </a>
        </div>
      </div>
    </div>
  );
}
