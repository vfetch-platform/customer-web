'use client';

import React from 'react';
import { SearchFormData, ITEM_CATEGORIES } from '@/constants/search';

interface SubmissionConfirmationProps {
  formData: SearchFormData;
  queryId: string;
  onGoToTracking: () => void;
  onSubmitAnother: () => void;
}

export default function SubmissionConfirmation({ formData, queryId, onGoToTracking, onSubmitAnother }: SubmissionConfirmationProps) {
  const categoryLabel = ITEM_CATEGORIES.find((c) => c.key === formData.category)?.label || formData.category || 'Item';
  const trackingId = `VF-${queryId.slice(0, 4).toUpperCase()}-${queryId.slice(4, 7).toUpperCase()}`;

  return (
    <main className="pt-28 pb-20 px-6 max-w-3xl mx-auto">
      {/* Success Icon & Heading */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-3">
          Thank you! We&apos;ve received your report.
        </h1>
        <p className="text-on-secondary-container text-sm max-w-lg mx-auto leading-relaxed">
          Our team will begin the search immediately. You&apos;ll receive updates via email and SMS at each stage of the recovery process.
        </p>
      </div>

      {/* Tracking ID + Item Summary Card */}
      <div className="flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 mb-10">
        {/* Left: Tracking ID */}
        <div className="bg-primary text-white p-6 md:p-8 md:w-64 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">Tracking ID</p>
            <p className="font-headline text-2xl font-bold tracking-wide">{trackingId}</p>
          </div>
          <div className="flex items-center gap-2 mt-6 text-xs opacity-70">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>Keep this for your records</span>
          </div>
        </div>

        {/* Right: Item Summary */}
        <div className="bg-white flex-1 p-6 md:p-8 flex gap-5">
          {/* Photo thumbnail */}
          {formData.photos.length > 0 && (
            <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
              <img src={URL.createObjectURL(formData.photos[0])} alt="Reported item" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60 mb-0.5">Reported Item</p>
                <h3 className="font-headline font-bold text-lg text-primary leading-tight">
                  {formData.itemDescription.length > 40
                    ? formData.itemDescription.slice(0, 40).trim() + '...'
                    : formData.itemDescription || categoryLabel}
                </h3>
              </div>
              <span className="bg-surface-tint/10 text-surface-tint text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                Searching
              </span>
            </div>
            <div className="flex gap-6 text-xs text-on-secondary-container mt-3">
              {formData.lastSeenLocation && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-secondary-container/60">Lost Location</p>
                  <p className="font-medium text-primary">{formData.lastSeenLocation}</p>
                </div>
              )}
              {formData.checkinDate && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-secondary-container/60">Date Lost</p>
                  <p className="font-medium text-primary">
                    {new Date(formData.checkoutDate || formData.checkinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
            {formData.itemDescription && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-wider text-on-secondary-container/60">Key Features</p>
                <p className="text-xs text-on-secondary-container italic leading-relaxed line-clamp-2">{formData.itemDescription}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What happens next? */}
      <div className="bg-surface-container-low rounded-2xl p-6 md:p-8 mb-10">
        <h2 className="font-headline text-xl font-bold text-primary mb-6">What happens next?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              num: '1',
              title: 'Venue Verification',
              desc: "We reach out to the venue's lost and found department and security team immediately.",
            },
            {
              num: '2',
              title: 'Manual Matching',
              desc: 'Our concierges manually verify physical descriptions against found item databases.',
            },
            {
              num: '3',
              title: 'Secure Retrieval',
              desc: 'Once found, we coordinate a secure handover or doorstep delivery to your location.',
            },
          ].map((step) => (
            <div key={step.num}>
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-headline font-bold text-sm mb-3">
                {step.num}
              </div>
              <h3 className="font-headline font-bold text-sm text-primary mb-1.5">{step.title}</h3>
              <p className="text-xs text-on-secondary-container leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onGoToTracking}
          className="bg-primary text-white px-8 py-3.5 rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">grid_view</span>
          Go to Status Tracking
        </button>
        <button
          onClick={onSubmitAnother}
          className="text-on-secondary-container text-sm font-medium hover:text-primary transition-colors"
        >
          Submit another report
        </button>
      </div>
    </main>
  );
}
