'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import ErrorBanner from '@/components/ErrorBanner';
import { Item } from '@/types';
import { DESCRIPTION_TRUNCATION_THRESHOLD, HIGH_MATCH_SCORE_THRESHOLD, RECENT_LOSS_HOURS_THRESHOLD } from '@/constants/search';

interface MatchedItemsViewProps {
  matchedItems: Item[];
  loading: boolean;
  error: string | null;
  claimId: string | null;
  formEmail: string;
  checkoutDate?: string;
  onClaimItem: (item: Item) => void;
  onSearchAgain: () => void;
  onDismissError: () => void;
}

export default function MatchedItemsView({
  matchedItems, loading, error, claimId, formEmail, checkoutDate,
  onClaimItem, onSearchAgain, onDismissError,
}: MatchedItemsViewProps) {
  const claimSuccessRef = useRef<HTMLDivElement>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [photoModalItem, setPhotoModalItem] = useState<Item | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (claimId && claimSuccessRef.current) {
      claimSuccessRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [claimId]);

  const openPhotoModal = (item: Item, index: number = 0) => {
    setPhotoModalItem(item);
    setPhotoIndex(index);
  };
  const closePhotoModal = () => { setPhotoModalItem(null); setPhotoIndex(0); };
  const nextPhoto = () => {
    if (!photoModalItem?.images) return;
    setPhotoIndex((p) => (p + 1) % photoModalItem.images.length);
  };
  const prevPhoto = () => {
    if (!photoModalItem?.images) return;
    setPhotoIndex((p) => (p - 1 + photoModalItem.images.length) % photoModalItem.images.length);
  };
  const handleModalKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!photoModalItem) return;
    if (e.key === 'Escape') { e.preventDefault(); closePhotoModal(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nextPhoto(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prevPhoto(); }
  };

  return (
    <div>
      {/* Header */}
      <header className="mb-12">
        <h1 className="font-headline font-bold text-4xl md:text-5xl text-primary tracking-tight mb-3">
          Potential Matches
        </h1>
        <p className="text-on-secondary-container text-lg max-w-2xl leading-relaxed">
          {matchedItems.length > 0
            ? 'Based on your description, here are items found at the venue. Review and claim yours.'
            : 'No items found matching your description.'}
        </p>
      </header>

      {error && <ErrorBanner message={error} variant="error" onDismiss={onDismissError} className="mb-8" />}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
              <div className="h-64 bg-surface-container-high" />
              <div className="p-6 space-y-3">
                <div className="h-3 bg-surface-container-high rounded w-1/4" />
                <div className="h-5 bg-surface-container-high rounded w-3/4" />
                <div className="h-3 bg-surface-container-high rounded w-1/2" />
                <div className="h-12 bg-surface-container-high rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No matches */}
      {!loading && matchedItems.length === 0 && (() => {
        const isRecentLoss = (() => {
          if (!checkoutDate) return false;
          const checkout = new Date(checkoutDate);
          const now = new Date();
          const hoursDiff = (now.getTime() - checkout.getTime()) / (1000 * 60 * 60);
          return hoursDiff < RECENT_LOSS_HOURS_THRESHOLD;
        })();
        return (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-outline">
                {isRecentLoss ? 'schedule' : 'search_off'}
              </span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-primary mb-3">
              {isRecentLoss ? 'Your item may not be listed yet' : "We couldn't find your item"}
            </h3>
             <p className="text-on-secondary-container mb-8 max-w-md mx-auto">
               {isRecentLoss
                 ? "If your item was recently handed in, it may not have been logged yet. Please check back in a few hours. Venue staff update the lost and found inventory regularly."
                 : "We couldn't find a match for your item just yet. If you can, try searching again with a few more details like the colour, brand, or size."}
             </p>
            {isRecentLoss && (
              <p className="text-xs text-on-secondary-container/60 mb-6 max-w-sm mx-auto">
                We&apos;ll search the latest inventory each time you search.
              </p>
            )}
            <button onClick={onSearchAgain}
              className="bg-primary text-white py-3.5 px-8 rounded-full font-headline font-bold hover:bg-primary/90 active:scale-95 transition-all">
              {isRecentLoss ? 'Search Again Later' : 'Try Another Search'}
            </button>
          </div>
        );
      })()}

      {/* Grid */}
      {!loading && matchedItems.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {matchedItems.map((item) => {
              const matchScore = item.match_score ?? item.similarity_score;
              const isHighMatch = matchScore !== undefined && matchScore >= HIGH_MATCH_SCORE_THRESHOLD;
              return (
                <div key={item.id} className="group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]">
                  {item.images && item.images.length > 0 && (
                    <div className="relative h-64 overflow-hidden">
                      <Image src={item.images[0]} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); openPhotoModal(item, 0); }}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                        aria-label="View photos">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-on-surface text-sm font-medium px-4 py-2 rounded-full shadow transition-opacity">
                          View Photos ({item.images.length})
                        </span>
                      </button>
                      {matchScore && (
                        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full font-headline font-bold text-xs shadow-sm flex items-center gap-1.5 ${
                          isHighMatch ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-white text-on-surface'
                        }`}>
                          <span className="material-symbols-outlined text-[16px]" style={isHighMatch ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                            {isHighMatch ? 'verified' : 'check_circle'}
                          </span>
                          {Math.round(matchScore)}% Match
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-6 flex-grow flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-secondary-container/60 mb-1">{item.category}</span>
                    <h3 className="font-headline font-bold text-xl text-primary mb-2 line-clamp-2">{item.title}</h3>
                    {item.description && (
                      <div className="mb-3">
                        <p className={`text-on-secondary-container text-sm ${expandedDescriptions[item.id] ? '' : 'line-clamp-3'}`}>{item.description}</p>
                        {item.description.length > DESCRIPTION_TRUNCATION_THRESHOLD && (
                          <button type="button"
                            onClick={() => setExpandedDescriptions((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="mt-1 text-xs font-medium text-surface-tint hover:underline">
                            {expandedDescriptions[item.id] ? 'Show Less' : 'Show More'}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="space-y-2 mb-6 text-sm text-on-secondary-container">
                      {item.location_found && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-surface-tint">location_on</span>
                          <span>{item.location_found}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-surface-tint">calendar_today</span>
                        <span>Found {new Date(item.date_found).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <button onClick={() => onClaimItem(item)} disabled={loading || !!claimId}
                      className="mt-auto w-full py-3.5 bg-primary text-white rounded-xl font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      This is mine
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-16 flex flex-col items-center">
            <div className="w-full max-w-2xl bg-surface-container rounded-2xl p-8 text-center">
              <p className="text-on-secondary-container mb-4">Don&apos;t see your item? Our concierge team is constantly cataloging new items.</p>
              <button onClick={onSearchAgain}
                className="px-8 py-3 bg-secondary-container text-on-secondary-container rounded-full font-headline font-bold text-sm hover:bg-surface-container-high transition-colors active:scale-95">
                None of these are mine
              </button>
            </div>
          </div>
        </>
      )}

      {/* Claim success */}
      {claimId && (
        <div ref={claimSuccessRef} className="mt-12 relative overflow-hidden rounded-2xl bg-white shadow-sm border border-outline-variant/10 p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <div className="w-12 h-12 bg-tertiary-fixed/20 rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-headline text-xl font-bold text-primary mb-2">Claim Submitted!</h3>
              <p className="text-on-secondary-container text-sm leading-relaxed mb-4">
                We&apos;ve received your claim. An email with full details will be sent to
                {formEmail ? <span className="font-semibold"> {formEmail}</span> : ' your address'} shortly.
              </p>
              <div className="bg-surface-container-low rounded-xl p-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-outline font-medium mb-0.5">Claim ID</p>
                    <p className="font-headline text-lg font-bold text-primary tracking-wide select-all break-all">{claimId}</p>
                  </div>
                  <button type="button" onClick={() => navigator.clipboard.writeText(claimId || '')}
                    className="px-4 py-2 text-sm font-headline font-bold rounded-full bg-primary text-white hover:bg-primary-container active:scale-95 transition-all">
                    Copy ID
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="font-bold text-primary mb-1">What Happens Next</p>
                  <p className="text-on-secondary-container text-xs leading-snug">Venue staff review & match your details.</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="font-bold text-primary mb-1">Email Updates</p>
                  <p className="text-on-secondary-container text-xs leading-snug">We email you on status changes.</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="font-bold text-primary mb-1">Keep This ID</p>
                  <p className="text-on-secondary-container text-xs leading-snug">Use it to check status or verify pickup.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-label={photoModalItem.title + ' photos'} onKeyDown={handleModalKey}>
          <div className="absolute inset-0 bg-primary/70 backdrop-blur-sm" onClick={closePhotoModal} />
          <div className="relative max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <h4 className="font-headline text-lg font-bold text-primary truncate pr-4">{photoModalItem.title}</h4>
              <button onClick={closePhotoModal} className="text-outline hover:text-primary transition-colors rounded-full p-1" aria-label="Close">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="relative bg-on-surface flex items-center justify-center" style={{ minHeight: '420px' }}>
              {photoModalItem.images?.map((img, idx) => (
                <Image key={idx} src={img} fill
                  alt={`${photoModalItem.title} image ${idx + 1} of ${photoModalItem.images?.length}`}
                  className={`object-contain transition-opacity duration-500 ${idx === photoIndex ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden={idx !== photoIndex} />
              ))}
              {photoModalItem.images && photoModalItem.images.length > 1 && (
                <>
                  <button type="button" onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-on-surface rounded-full w-10 h-10 flex items-center justify-center shadow"
                    aria-label="Previous photo">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button type="button" onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-on-surface rounded-full w-10 h-10 flex items-center justify-center shadow"
                    aria-label="Next photo">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-2">
                    {photoModalItem.images.map((_, i) => (
                      <button key={i} type="button" onClick={() => setPhotoIndex(i)} aria-label={`Go to photo ${i + 1}`}
                        className={`h-2.5 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white shadow' : 'w-2.5 bg-white/50 hover:bg-white'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 flex items-center justify-between text-sm text-on-secondary-container">
              <span>Photo {photoIndex + 1} of {photoModalItem.images?.length || 1}</span>
              <button onClick={closePhotoModal} className="text-surface-tint hover:underline font-headline font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
