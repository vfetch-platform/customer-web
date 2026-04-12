'use client';

import React from 'react';
import { SearchFormData } from '@/constants/search';
import { PHONE_CODES } from '@/constants/countries';

interface Step1IdentityProps {
  formData: SearchFormData;
  fieldErrors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onNext: () => void;
  onCancel: () => void;
  emailVerified: boolean;
  otpSending: boolean;
}

export default function Step1Identity({ formData, fieldErrors, onInputChange, onNext, onCancel, emailVerified, otpSending }: Step1IdentityProps) {
  return (
    <div className="space-y-8">
      {/* Personal Details Card */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-primary text-xl">person</span>
          <h2 className="font-headline text-xl font-bold text-primary">Personal Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-on-surface">Full Name</label>
            <input
              id="name" name="name" type="text" value={formData.name} onChange={onInputChange}
              className={`bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface placeholder:text-outline/40 border transition-colors ${
                fieldErrors.name ? 'border-error' : 'border-outline-variant/20 focus:border-primary'
              }`}
              placeholder="e.g. Julian Alexander"
            />
            {fieldErrors.name && <p className="text-xs text-error">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-on-surface">Email Address</label>
            <div className="relative">
              <input
                id="email" name="email" type="email" value={formData.email} onChange={onInputChange}
                readOnly={emailVerified}
                className={`w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface placeholder:text-outline/40 border transition-colors ${
                  emailVerified ? 'border-green-500 bg-green-50 pr-28' : fieldErrors.email ? 'border-error' : 'border-outline-variant/20 focus:border-primary'
                }`}
                placeholder="julian@vfetch.com"
              />
              {emailVerified && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Verified
                </span>
              )}
            </div>
            {fieldErrors.email && <p className="text-xs text-error">{fieldErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="phone" className="text-sm font-medium text-on-surface">Phone Number</label>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  name="phoneCountryCode" value={formData.phoneCountryCode} onChange={onInputChange}
                  className="bg-surface-container-low rounded-xl pl-3 pr-8 py-3.5 text-on-surface border border-outline-variant/20 focus:border-primary transition-colors w-32 appearance-none cursor-pointer"
                >
                  {PHONE_CODES.map((cc) => (
                    <option key={cc.code} value={cc.code}>{cc.code} {cc.country}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-base pointer-events-none">expand_more</span>
              </div>
              <input
                id="phone" name="phone" type="tel" value={formData.phone} onChange={onInputChange}
                className="flex-1 bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface placeholder:text-outline/40 border border-outline-variant/20 focus:border-primary transition-colors"
                placeholder="(555) 000-0000"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stay Information Card */}
      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-primary text-xl">apartment</span>
          <h2 className="font-headline text-xl font-bold text-primary">Stay Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkinDate" className="text-sm font-medium text-on-surface">Check-in Date</label>
            <input
              id="checkinDate" name="checkinDate" type="date" value={formData.checkinDate} onChange={onInputChange}
              className={`bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface border transition-colors ${
                fieldErrors.checkinDate ? 'border-error' : 'border-outline-variant/20 focus:border-primary'
              }`}
            />
            {fieldErrors.checkinDate && <p className="text-xs text-error">{fieldErrors.checkinDate}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkoutDate" className="text-sm font-medium text-on-surface">Check-out Date</label>
            <input
              id="checkoutDate" name="checkoutDate" type="date" value={formData.checkoutDate} onChange={onInputChange}
              className={`bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface border transition-colors ${
                fieldErrors.checkoutDate ? 'border-error' : 'border-outline-variant/20 focus:border-primary'
              }`}
            />
            {fieldErrors.checkoutDate && <p className="text-xs text-error">{fieldErrors.checkoutDate}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-sm font-medium text-on-surface">Room Number</label>
            <input
              id="location" name="location" type="text" value={formData.location} onChange={onInputChange}
              className="bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface placeholder:text-outline/40 border border-outline-variant/20 focus:border-primary transition-colors"
              placeholder="Suite 402"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bookingReference" className="text-sm font-medium text-on-surface">Booking Reference <span className="text-outline font-normal">(Optional)</span></label>
            <input
              id="bookingReference" name="bookingReference" type="text" value={formData.bookingReference} onChange={onInputChange}
              className="bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface placeholder:text-outline/40 border border-outline-variant/20 focus:border-primary transition-colors"
              placeholder="VF-77291"
            />
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button type="button" onClick={onCancel} className="flex items-center gap-2 text-sm font-medium text-on-secondary-container hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Cancel
        </button>
        <button
          type="button" onClick={onNext} disabled={otpSending}
          className="bg-primary text-white px-10 py-3.5 rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {otpSending ? (
            <>
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Sending…
            </>
          ) : emailVerified ? (
            <>
              <span className="material-symbols-outlined text-base">check_circle</span>
              Continue
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">shield</span>
              Verify &amp; Continue
            </>
          )}
        </button>
      </div>

    </div>
  );
}
