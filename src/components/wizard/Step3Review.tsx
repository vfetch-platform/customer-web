'use client';

import React from 'react';
import { SearchFormData, ITEM_CATEGORIES } from '@/constants/search';

interface Step3ReviewProps {
  formData: SearchFormData;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: (step: number) => void;
}

export default function Step3Review({ formData, loading, error, onSubmit, onBack, onEditStep }: Step3ReviewProps) {
  const categoryLabel = ITEM_CATEGORIES.find((c) => c.key === formData.category)?.label || formData.category || 'Not specified';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-2">Review &amp; Search</h1>
        <p className="text-on-secondary-container text-sm">
          Please review the details below before we search the venue's lost and found.
        </p>
      </div>

      {/* Personal Details Summary */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">person</span>
            <h2 className="font-headline text-lg font-bold text-primary">Personal Details</h2>
          </div>
          <button type="button" onClick={() => onEditStep(1)} className="text-xs font-medium text-surface-tint hover:underline">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-outline text-xs mb-0.5">Full Name</p>
            <p className="text-on-surface font-medium">{formData.name || '—'}</p>
          </div>
          <div>
            <p className="text-outline text-xs mb-0.5">Email</p>
            <p className="text-on-surface font-medium">{formData.email || '—'}</p>
          </div>
          <div>
            <p className="text-outline text-xs mb-0.5">Phone</p>
            <p className="text-on-surface font-medium">{formData.phone ? `${formData.phoneCountryCode} ${formData.phone}` : '—'}</p>
          </div>
        </div>
      </section>

      {/* Stay Information Summary */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">apartment</span>
            <h2 className="font-headline text-lg font-bold text-primary">Stay Information</h2>
          </div>
          <button type="button" onClick={() => onEditStep(1)} className="text-xs font-medium text-surface-tint hover:underline">
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-outline text-xs mb-0.5">Check-in</p>
            <p className="text-on-surface font-medium">{formData.checkinDate || '—'}</p>
          </div>
          <div>
            <p className="text-outline text-xs mb-0.5">Check-out</p>
            <p className="text-on-surface font-medium">{formData.checkoutDate || '—'}</p>
          </div>
          <div>
            <p className="text-outline text-xs mb-0.5">Room</p>
            <p className="text-on-surface font-medium">{formData.location || '—'}</p>
          </div>
          <div>
            <p className="text-outline text-xs mb-0.5">Booking Ref</p>
            <p className="text-on-surface font-medium">{formData.bookingReference || '—'}</p>
          </div>
        </div>
      </section>

      {/* Item Details Summary */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">inventory_2</span>
            <h2 className="font-headline text-lg font-bold text-primary">Item Details</h2>
          </div>
          <button type="button" onClick={() => onEditStep(2)} className="text-xs font-medium text-surface-tint hover:underline">
            Edit
          </button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-outline text-xs mb-0.5">Category</p>
            <p className="text-on-surface font-medium capitalize">{categoryLabel}</p>
          </div>
          <div>
            <p className="text-outline text-xs mb-0.5">Description</p>
            <p className="text-on-surface font-medium whitespace-pre-wrap">{formData.itemDescription || '—'}</p>
          </div>
          {formData.photos.length > 0 && (
            <div>
              <p className="text-outline text-xs mb-2">Photos ({formData.photos.length})</p>
              <div className="flex flex-wrap gap-3">
                {formData.photos.map((photo, idx) => (
                  <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden">
                    <img src={URL.createObjectURL(photo)} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="bg-error-container/20 border border-error/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-lg">chevron_left</span>
          Back
        </button>
        <button
          type="button" onClick={onSubmit} disabled={loading}
          className="bg-primary text-white px-10 py-3.5 rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              Search Now
              <span className="material-symbols-outlined text-lg">search</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
