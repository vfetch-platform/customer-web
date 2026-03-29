"use client";

import React, { useEffect, useRef, useState } from 'react';
import { COUNTRIES } from '@/constants/countries';
import { EMAIL_REGEX } from '@/constants/regex';

// Ambient declaration fallback if @types/google.maps isn't installed
// (Consider installing: npm i -D @types/google.maps)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare global {
  // Only declare if not already present
  // eslint-disable-next-line no-var
  // @ts-ignore
  var google: any | undefined; // minimal for runtime usage
}

interface CourierAddressFormProps {
  stepNumber?: number;
  title?: string;
  initialValue?: Partial<AddressFormValues>;
  onSubmit: (values: AddressFormValues) => void;
  submitting?: boolean;
  hideStepIndicator?: boolean;
}

export interface AddressFormValues {
  searchAddress: string;
  country: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  notes?: string;
  fullName: string;
  companyName?: string;
  phone: string;
  email: string;
}

export const CourierAddressForm: React.FC<CourierAddressFormProps> = ({
  stepNumber = 3,
  title = 'Where should we send it?',
  initialValue,
  onSubmit,
  submitting,
  hideStepIndicator,
}) => {
  const [values, setValues] = useState<AddressFormValues>({
    searchAddress: '',
    country: '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    notes: '',
    fullName: '',
    companyName: '',
    phone: '',
    email: '',
    ...initialValue,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [placesReady, setPlacesReady] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const autoInputRef = useRef<HTMLInputElement | null>(null);
  const autoCompleteRef = useRef<any>(null);

  // Load Google Places script if API key present
  useEffect(() => {
    // Use environment variable (exposed as NEXT_PUBLIC_* for Next.js browser side)
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setPlacesError('Google Maps API key not configured');
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[CourierAddressForm] Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
      }
      return;
    }
    if ((window as any).google?.maps?.places) {
      setPlacesReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-places]');
    if (existing) {
      // Script tag exists — check if it already finished loading (e.g. React StrictMode remount)
      if ((window as any).google?.maps?.places) {
        setPlacesReady(true);
      } else {
        existing.addEventListener('load', () => setPlacesReady(true));
        existing.addEventListener('error', () => setPlacesError('Failed to load Google Places script'));
      }
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=en`;
    script.async = true;
    script.defer = true;
    script.dataset.googlePlaces = 'true';
    script.onload = () => setPlacesReady(true);
    script.onerror = () => setPlacesError('Failed to load Google Places script');
    document.head.appendChild(script);
  }, []);

  // Init autocomplete
  useEffect(() => {
    if (!placesReady || !autoInputRef.current || autoCompleteRef.current) return;
    try {
      if (!(window as any).google?.maps?.places) {
        setPlacesError('Google Places library not available');
        return;
      }
      // @ts-ignore
      autoCompleteRef.current = new (window as any).google.maps.places.Autocomplete(autoInputRef.current!, {
        types: ['address'],
        fields: ['address_components', 'formatted_address', 'geometry'],
      });
      autoCompleteRef.current.addListener('place_changed', () => {
        const place = autoCompleteRef.current?.getPlace();
        if (!place?.address_components) return;
        const components: Record<string, string> = {};
        place.address_components.forEach((c: any) => {
          c.types.forEach((t: string) => { components[t] = c.long_name; });
        });
        setValues(v => ({
          ...v,
          searchAddress: place.formatted_address || v.searchAddress,
          country: components['country'] || v.country,
          city: components['locality'] || components['postal_town'] || v.city,
          postalCode: components['postal_code'] || v.postalCode,
          address1: [components['street_number'], components['route']].filter(Boolean).join(' '),
        }));
        // Sync the uncontrolled input with the formatted address
        if (autoInputRef.current && place.formatted_address) {
          autoInputRef.current.value = place.formatted_address;
        }
      });
    } catch (e: any) {
      setPlacesError(e?.message || 'Failed to initialise address autocomplete');
    }
  }, [placesReady]);

  const setField = (name: keyof AddressFormValues, value: string) => {
    setValues(v => ({ ...v, [name]: value }));
  };
  const markTouched = (name: string) => setTouched(t => ({ ...t, [name]: true }));

  const required: (keyof AddressFormValues)[] = ['country', 'address1', 'city', 'postalCode', 'fullName', 'phone', 'email'];
  const errors: Record<string, string> = {};
  required.forEach(f => {
    if (!values[f]?.trim()) errors[f] = 'Required';
  });
  if (values.email && !EMAIL_REGEX.test(values.email)) errors.email = 'Invalid email';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // mark all touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(values).forEach(k => { allTouched[k] = true; });
    setTouched(allTouched);
    if (Object.keys(errors).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="flex items-center gap-3">
        {!hideStepIndicator && (
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-teal-700 bg-teal-100 ring-4 ring-white shadow-sm">{stepNumber}</div>
        )}
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-gray-900">{title}</h2>
      </div>

      {/* Contact details */}
      <div className="pt-2">
        <p className="font-semibold text-gray-900 mb-4">Contact details:</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="form-label">Full Name (Name/Surname)*</label>
            <input
              type="text"
              value={values.fullName}
              onChange={e => setField('fullName', e.target.value)}
              onBlur={() => markTouched('fullName')}
              className={`w-full rounded-lg border bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm ${errors.fullName && touched.fullName ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.fullName && touched.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
          </div>
          <div>
            <label className="form-label">Company name (if applicable)</label>
            <input
              type="text"
              value={values.companyName}
              onChange={e => setField('companyName', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm"
            />
          </div>
          <div>
            <label className="form-label">Mobile Phone (Local mobile phone number)*</label>
            <input
              type="tel"
              value={values.phone}
              onChange={e => setField('phone', e.target.value)}
              onBlur={() => markTouched('phone')}
              placeholder={values.country ? `+ Local ${values.country} number` : '+30123456789'}
              className={`w-full rounded-lg border bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm ${errors.phone && touched.phone ? 'border-red-400' : 'border-gray-200'}`}
            />
            <p className="mt-1 text-xs text-gray-500">Local number to country of destination. <button type="button" className="text-teal-600 hover:underline">See why</button></p>
            {errors.phone && touched.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
          <div>
            <label className="form-label">Email *</label>
            <input
              type="email"
              value={values.email}
              onChange={e => setField('email', e.target.value)}
              onBlur={() => markTouched('email')}
              className={`w-full rounded-lg border bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm ${errors.email && touched.email ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.email && touched.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
        </div>
      </div>

      {/* Google Maps Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Address Search</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7Zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5Z" />
            </svg>
          </div>
          <input
            ref={autoInputRef}
            type="text"
            defaultValue={values.searchAddress}
            placeholder="Start typing the address"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-teal-500 focus:ring-teal-500 pl-10 pr-4 py-3 text-gray-900 transition shadow-sm"
          />
          {!placesReady && !placesError && (
            <p className="mt-2 text-xs text-gray-500">Loading Google Places…</p>
          )}
          {placesError && (
            <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
              {placesError} — falling back to manual entry.
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 my-6 text-sm text-gray-400 select-none">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="uppercase tracking-wide text-xs font-medium text-gray-500">Or fill in the details below</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      </div>

      {/* Address fields */}
      <div className="grid gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="form-label">Country*</label>
            <div className="relative">
              <select
                value={values.country}
                onChange={e => setField('country', e.target.value)}
                onBlur={() => markTouched('country')}
                className={`w-full rounded-lg border bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm appearance-none ${errors.country && touched.country ? 'border-red-400' : 'border-gray-200'}`}
              >
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</div>
            </div>
            {errors.country && touched.country && <p className="mt-1 text-xs text-red-600">{errors.country}</p>}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="form-label">Address Street & Number*</label>
            <input
              type="text"
              value={values.address1}
              onChange={e => setField('address1', e.target.value)}
              onBlur={() => markTouched('address1')}
              placeholder="123 Example St"
              className={`w-full rounded-lg border bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm ${errors.address1 && touched.address1 ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.address1 && touched.address1 && <p className="mt-1 text-xs text-red-600">{errors.address1}</p>}
          </div>
          <div className="sm:col-span-1">
            <label className="form-label">Address 2</label>
            <input
              type="text"
              value={values.address2}
              onChange={e => setField('address2', e.target.value)}
              placeholder="Apartment, suite, etc."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label className="form-label">City*</label>
            <input
              type="text"
              value={values.city}
              onChange={e => setField('city', e.target.value)}
              onBlur={() => markTouched('city')}
              className={`w-full rounded-lg border bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm ${errors.city && touched.city ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.city && touched.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
          </div>
          <div>
            <label className="form-label">Postal Code*</label>
            <input
              type="text"
              value={values.postalCode}
              onChange={e => setField('postalCode', e.target.value)}
              onBlur={() => markTouched('postalCode')}
              className={`w-full rounded-lg border bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm ${errors.postalCode && touched.postalCode ? 'border-red-400' : 'border-gray-200'}`}
            />
             {errors.postalCode && touched.postalCode && <p className="mt-1 text-xs text-red-600">{errors.postalCode}</p>}
          </div>
          <div>
            <label className="form-label">Notes</label>
            <input
              type="text"
              value={values.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Delivery related information"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:bg-white focus:border-teal-500 focus:ring-teal-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={submitting || Object.keys(errors).length > 0 && Object.keys(touched).length > 0}
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-6 py-3 text-white font-medium shadow hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition"
        >
          {submitting ? 'Saving Address…' : 'Continue'}
        </button>
      </div>
    </form>
  );
};

export default CourierAddressForm;

// Utility small Tailwind-friendly label class (could be extracted globally)
// Add to global CSS if desired; placed here inline for self-containment
// .form-label { @apply block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide; }