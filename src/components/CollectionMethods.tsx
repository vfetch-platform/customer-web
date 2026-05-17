'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { customerApi, getErrorMessage } from '@/lib/api';
import ErrorBanner from '@/components/ErrorBanner';
import { Venue, Claim, CourierQuote, CourierQuoteExtra, CustomsData, ParcelTier } from '@/types';
import CourierAddressForm, { AddressFormValues } from './CourierAddressForm';
import CourierPayment from './CourierPayment';
import SelfPickupPayment from './SelfPickupPayment';
import CustomsForm from './CustomsForm';
import { PLATFORM_FEE, SELF_PICKUP_FEE, MAX_ITEM_VALUE } from '@/constants/fees';
import { ADDRESS_FORM_SUBMIT_DELAY_MS } from '@/constants/api';
import { UK_POSTCODE_REGEX } from '@/constants/regex';

interface BookingResult {
  booking_id: string;
  tracking_number: string;
  label_url?: string;
  payment_intent_id: string;
}

interface CollectionMethodsProps {
  claim: Claim;
  venue: Venue;
  onCourierBooked?: (booking: BookingResult, serviceName?: string, estimatedDelivery?: string) => void;
  onSelfPickupConfirmed?: (paymentIntentId: string) => void;
  onBack?: () => void;
  onFlowChange?: (isInFlow: boolean) => void;
}

// Display copy for each tier — shown in the read-only "Your parcel" card.
// Mirrors the canonical PARCEL_TIERS in the api repo (src/constants/index.ts).
const TIER_INFO: Record<ParcelTier, { label: string; examples: string }> = {
  xs: { label: 'Very Small', examples: 'phone, wallet, keys, small jewellery box' },
  s:  { label: 'Small',      examples: 'shoebox, small handbag, paperback book stack' },
  m:  { label: 'Medium',     examples: 'large handbag, board game, small kettle' },
  l:  { label: 'Large',      examples: 'backpack, laptop bag with accessories, jacket in box' },
  xl: { label: 'Extra Large',examples: 'large suitcase, big winter coat, small musical instrument' },
};

// Only show courier-collects-from-venue services (Collection type).
// Shop/Locker require venue staff to physically drop the parcel off — not suitable.
const isDropOffByVenue = (q: { collection_type: string }) =>
  q.collection_type === 'Collection';

export default function CollectionMethods({ claim, venue: _venue, onCourierBooked, onSelfPickupConfirmed, onBack, onFlowChange }: CollectionMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<'self_pickup' | 'parcel2go' | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressFormData, setAddressFormData] = useState<AddressFormValues | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [itemValue, setItemValue] = useState<string>('');
  const [quotes, setQuotes] = useState<CourierQuote[]>([]);
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  const [_selectedQuote, setSelectedQuote] = useState<CourierQuote | null>(null);
  const [detailQuote, setDetailQuote] = useState<CourierQuote | null>(null);
  const [filterServiceTypes, setFilterServiceTypes] = useState<Set<string>>(new Set());
  const [filterDelivery, setFilterDelivery] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'price' | 'delivery'>('price');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSelfPickupPayment, setShowSelfPickupPayment] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomsForm, setShowCustomsForm] = useState(false);
  const [_customsData, setCustomsData] = useState<CustomsData | null>(null);
  const [pendingBooking, setPendingBooking] = useState<{ quote: CourierQuote; coverExtra: CourierQuoteExtra | null; additionalExtras: CourierQuoteExtra[] } | null>(null);
  const [paymentQuote, setPaymentQuote] = useState<CourierQuote | null>(null);
  const [, setFeeBreakdown] = useState<{ courierCost: number; platformFee: number; total: number } | null>(null);

  const handleMethodSelect = (method: 'self_pickup' | 'parcel2go') => {
    setSelectedMethod(method);
    setError(null); setSuccess(null); setQuotes([]); setQuotesLoaded(false); setSelectedQuote(null);
    if (method === 'self_pickup') { setAddressFormData(null); setIsEditingAddress(false); setSubmittingAddress(false); setDeliveryAddress(''); }
  };

  // Parcel dimensions are no longer captured here. The API derives them from
  // the item's confirmed parcel_tier (set by venue staff at item creation).
  const parcelTier: ParcelTier | undefined = claim.item?.parcel_tier;

  const handleGetQuotes = async () => {
    const parsedValue = parseFloat(itemValue);
    if (!deliveryAddress.trim() || isNaN(parsedValue) || parsedValue <= 0) { setError('Please provide delivery address and a valid item value'); return; }
    setLoading(true); setError(null);
    try {
      await customerApi.validateAddress(deliveryAddress);
      const response = await customerApi.getCourierQuotes(claim.id, deliveryAddress, parsedValue);
      setQuotes(response.data); setQuotesLoaded(true);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const proceedToPayment = async (quote: CourierQuote, coverExtra?: CourierQuoteExtra | null, additionalExtras?: CourierQuoteExtra[], customs?: CustomsData | null) => {
    try {
      setLoading(true);
      const allChosen = [
        ...(coverExtra ? [{ Type: coverExtra.type }] : []),
        ...(additionalExtras ?? []).map(e => ({ Type: e.type })),
      ];
      // Patch the delivery address in the quote metadata with the recipient's
      // name and phone from the address form so Parcel2Go gets the correct contact.
      const patchedMetadata = addressFormData
        ? {
            ...quote.metadata,
            delivery_address: {
              ...(quote.metadata?.delivery_address as object | undefined),
              ContactName: addressFormData.fullName,
              Phone: addressFormData.phone,
              Email: addressFormData.email,
            },
          }
        : quote.metadata;
      const quoteWithExtra: CourierQuote = {
        ...quote,
        metadata: {
          ...patchedMetadata,
          ...(allChosen.length > 0 ? { chosen_insurance_extras: allChosen } : {}),
        },
      };
      const breakdownRes = await customerApi.getCourierFeeBreakdown(claim.id, quote.price);
      setFeeBreakdown(breakdownRes.data);
      setPaymentQuote(quoteWithExtra);
      setSelectedQuote(quote);
      setCustomsData(customs ?? null);
      setShowPayment(true);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const handleBookCourier = async (quote: CourierQuote, coverExtra?: CourierQuoteExtra | null, additionalExtras?: CourierQuoteExtra[]) => {
    setError(null);
    setDetailQuote(null);
    if (quote.requires_customs) {
      setPendingBooking({ quote, coverExtra: coverExtra ?? null, additionalExtras: additionalExtras ?? [] });
      setShowCustomsForm(true);
      return;
    }
    await proceedToPayment(quote, coverExtra, additionalExtras);
  };

  const handleCustomsSubmit = async (customs: CustomsData) => {
    if (!pendingBooking) return;
    setShowCustomsForm(false);
    const { quote, coverExtra, additionalExtras } = pendingBooking;
    setPendingBooking(null);
    await proceedToPayment(quote, coverExtra, additionalExtras, customs);
  };

  const handleCustomsBack = () => {
    setShowCustomsForm(false);
    setPendingBooking(null);
  };

  const handlePaymentSuccess = (booking: BookingResult) => {
    setShowPayment(false);
    onCourierBooked?.(booking, paymentQuote?.service, paymentQuote?.estimated_delivery);
  };
  const handlePaymentCancel = () => { setShowPayment(false); setPaymentQuote(null); setFeeBreakdown(null); };
  const handleSelfPickup = () => { setError(null); setShowSelfPickupPayment(true); };
  const handleSelfPickupPaymentSuccess = (paymentIntentId: string) => { setShowSelfPickupPayment(false); onSelfPickupConfirmed?.(paymentIntentId); };
  const handleSelfPickupPaymentCancel = () => { setShowSelfPickupPayment(false); };

  const getAddressFormInitialValue = (): Partial<AddressFormValues> => {
    if (isEditingAddress && addressFormData) return addressFormData;
    return {
      fullName: claim.claimant?.full_name ?? '',
      email:    claim.claimant?.email    ?? '',
      phone:    claim.claimant?.phone    ?? '',
      country:  'United Kingdom',
    };
  };

  const handleAddressSubmit = (vals: AddressFormValues) => {
    setSubmittingAddress(true);
    setTimeout(() => {
      setAddressFormData(vals); setIsEditingAddress(false);
      let postcode = (vals.postalCode || '').trim();
      if (postcode) {
        const compact = postcode.replace(/\s+/g, '').toUpperCase();
        if (UK_POSTCODE_REGEX.test(compact)) postcode = `${compact.slice(0, compact.length - 3)} ${compact.slice(-3)}`;
        else postcode = vals.postalCode || '';
      }
      const segments: string[] = [];
      if (vals.address1) segments.push(vals.address1.trim());
      if (vals.address2) segments.push(vals.address2.trim());
      if (vals.city) segments.push(vals.city.trim());
      if (postcode) segments.push(postcode);
      setDeliveryAddress(segments.join(', '));
      setSubmittingAddress(false);
    }, ADDRESS_FORM_SUBMIT_DELAY_MS);
  };

  const parsedItemValue = parseFloat(itemValue);
  const isItemValueValid = !isNaN(parsedItemValue) && parsedItemValue > 0;

  const deliverySpeed = (quote: CourierQuote): 'Fast' | 'Medium' | 'Slow' => {
    // Use ISO estimated_delivery date when available
    const isoDate = Date.parse(quote.estimated_delivery);
    if (!isNaN(isoDate)) {
      const diffDays = (isoDate - Date.now()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) return 'Fast';
      if (diffDays <= 3) return 'Medium';
      return 'Slow';
    }
    // Fallback: parse text label
    const d = (quote.estimated_delivery_label ?? quote.estimated_delivery ?? '').toLowerCase();
    const m = d.match(/(\d+)\s*(?:-\s*(\d+))?\s*(?:business\s*)?day/);
    const days = m ? (m[2] ? (parseInt(m[1]) + parseInt(m[2])) / 2 : parseInt(m[1])) : null;
    if (d.includes('same day') || d.includes('next day') || (days !== null && days <= 1)) return 'Fast';
    if (days !== null && days <= 3) return 'Medium';
    return 'Slow';
  };


  // Derive collection flow step for the mini stepper
  const flowStep = !selectedMethod ? 1 : (showPayment || showSelfPickupPayment) ? 3 : showCustomsForm ? 3 : 2;

  useEffect(() => {
    onFlowChange?.(selectedMethod !== null);
  }, [selectedMethod, onFlowChange]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        {onBack && (
          <button onClick={onBack} className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-medium gap-1 mb-4">
            <span className="material-symbols-outlined text-lg">arrow_back</span> Back to details
          </button>
        )}
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-2">Choose Your Collection Method</h1>
        <p className="text-on-secondary-container text-sm max-w-lg">
          Select how you would like to receive your recovered item. Our concierge partners ensure safe and professional handling of your belongings.
        </p>
      </div>

      {/* Mini flow stepper */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { num: 1, label: 'Method' },
          { num: 2, label: 'Details' },
          { num: 3, label: 'Payment' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            {i > 0 && <div className={`w-12 h-[1.5px] ${flowStep > s.num - 1 ? 'bg-primary' : 'bg-outline-variant/20'}`} />}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              flowStep >= s.num ? 'bg-primary text-white' : 'bg-surface-container-high text-outline'
            }`}>
              {s.num}
            </div>
            <span className={`text-xs font-medium ${flowStep >= s.num ? 'text-primary' : 'text-outline'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} variant="error" onDismiss={() => setError(null)} />}
      {success && <div className="bg-tertiary-fixed/10 rounded-xl p-4"><p className="text-on-tertiary-fixed-variant text-sm">{success}</p></div>}

      {/* ═══ METHOD SELECTION ═══ */}
      {!selectedMethod && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Self Pickup */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-primary text-xl">location_on</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-primary mb-2">Self Pickup</h3>
              <p className="text-on-secondary-container text-sm mb-3 flex-grow">Collect from the venue directly during opening hours.</p>
              <p className="font-headline text-lg font-bold text-primary mb-5">&pound;{SELF_PICKUP_FEE.toFixed(2)} <span className="text-sm font-normal text-on-secondary-container">platform fee</span></p>
              <button onClick={() => handleMethodSelect('self_pickup')}
                className="w-full py-3 bg-primary text-white rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all">
                Self Pickup
              </button>
            </div>

            {/* Direct Courier */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-primary text-xl">local_shipping</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-primary mb-2">Direct Courier</h3>
              <p className="text-on-secondary-container text-sm mb-5 flex-grow">Secure tracked shipping with full insurance for long distances.</p>
              <p className="font-headline text-lg font-bold text-primary mb-1">UK & International</p>
              <div className="space-y-2 mb-5 mt-3">
                <div className="flex items-center gap-2 text-xs text-on-secondary-container">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Next-day delivery
                </div>
                <div className="flex items-center gap-2 text-xs text-on-secondary-container">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Real-time tracking
                </div>
              </div>
              <button onClick={() => handleMethodSelect('parcel2go')}
                className="w-full py-3 bg-primary text-white rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all">
                Direct Courier
              </button>
            </div>

            {/* Uber Courier — Disabled */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col opacity-60 relative">
              <span className="absolute top-4 right-4 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Fastest</span>
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-primary text-xl">electric_car</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-primary mb-2">Uber Courier</h3>
              <p className="text-on-secondary-container text-sm mb-5 flex-grow">Immediate local delivery within 15 miles of the venue.</p>
              <p className="font-headline text-2xl font-bold text-primary mb-1">Under 90 <span className="text-sm font-normal text-on-secondary-container">minutes</span></p>
              <div className="space-y-2 mb-5 mt-3">
                <div className="flex items-center gap-2 text-xs text-on-secondary-container">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Direct to your door
                </div>
                <div className="flex items-center gap-2 text-xs text-on-secondary-container">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Driver phone support
                </div>
              </div>
              <button disabled
                className="w-full py-3 bg-white text-outline rounded-full font-headline font-bold text-sm border border-outline-variant/20 cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>

          {/* Uber Courier Premium Section */}
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4 w-fit">
                  Premium Service
                </span>
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-3">Uber Courier</h2>
                <p className="text-on-secondary-container text-sm leading-relaxed mb-6">
                  Looking for ultra-fast, point-to-point delivery within the city? We are expanding our premium concierge network to include dedicated parcel carriers.
                </p>
                <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                  <span className="material-symbols-outlined text-lg">schedule</span>
                  <span className="font-medium">Coming Soon</span>
                </div>
              </div>
              <div className="relative min-h-[240px]">
                <Image src="/uber_car.avif" alt="Uber Courier" fill className="object-cover" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ SELF PICKUP DETAILS ═══ */}
      {selectedMethod === 'self_pickup' && (
        <div>
          <button type="button" onClick={() => { setSelectedMethod(null); setError(null); }}
            className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-medium gap-1 mb-6">
            <span className="material-symbols-outlined text-lg">arrow_back</span> Back to collection methods
          </button>

          <div className="space-y-5">
            {/* Instructions + payment card */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
              <h3 className="font-headline text-xl font-bold text-primary mb-4">Self Pickup Instructions</h3>
              <div className="space-y-3 text-on-secondary-container text-sm mb-6">
                <p>1. Complete the &pound;{SELF_PICKUP_FEE.toFixed(2)} platform fee payment below</p>
                <p>2. Your pickup code and venue details will appear after payment</p>
                <p>3. Visit the venue during collection hours with your pickup code</p>
                <p>4. Bring valid photo ID matching your claim details</p>
                <p>5. Venue staff will verify and release your item</p>
              </div>
              <div className="p-4 bg-tertiary-fixed/10 rounded-xl mb-6">
                <p className="text-sm text-on-tertiary-fixed-variant">
                  <strong>Note:</strong> Your pickup code, venue details, and collection hours will be provided after payment is confirmed.
                </p>
              </div>
              {!showSelfPickupPayment && (
                <button onClick={handleSelfPickup} disabled={loading}
                  className="w-full py-3.5 bg-primary text-white rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50">
                  Proceed to Payment
                </button>
              )}
              {showSelfPickupPayment && (
                <div className="mt-6">
                  <h4 className="font-headline font-bold text-primary mb-3">Complete Payment</h4>
                  <SelfPickupPayment claimId={claim.id} onPaymentSuccess={handleSelfPickupPaymentSuccess} onCancel={handleSelfPickupPaymentCancel} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ COURIER FLOW ═══ */}
      {selectedMethod === 'parcel2go' && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => {
              if (showPayment) {
                handlePaymentCancel();
              } else {
                setSelectedMethod(null); setQuotes([]); setSelectedQuote(null); setError(null);
              }
            }}
            className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-medium gap-1">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            {showPayment ? 'Back to quotes' : 'Back to collection methods'}
          </button>

          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-primary mb-6">Delivery Details</h3>
            {(!addressFormData || isEditingAddress) && (
              <CourierAddressForm
                key={`${claim.claimant?.full_name}|${claim.claimant?.email}`}
                stepNumber={1}
                title="Courier delivery address"
                submitting={submittingAddress} onSubmit={handleAddressSubmit} initialValue={getAddressFormInitialValue()} lockEmail />
            )}
            {addressFormData && !isEditingAddress && (
              <div className="rounded-xl bg-surface-container-low p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-headline font-bold text-primary">Address Saved</p>
                  {!showPayment && (
                    <button type="button" onClick={() => { setIsEditingAddress(true); setQuotes([]); setQuotesLoaded(false); setSelectedQuote(null); }} className="text-xs font-bold text-surface-tint hover:underline">Edit</button>
                  )}
                </div>
                <p className="text-on-surface">{addressFormData.fullName}</p>
                <p className="text-on-secondary-container">{[addressFormData.address1, addressFormData.address2].filter(Boolean).join(', ')}</p>
                <p className="text-on-secondary-container">{addressFormData.city} {addressFormData.postalCode}</p>
                <p className="text-surface-tint">{addressFormData.email}</p>
              </div>
            )}

            {addressFormData && !isEditingAddress && quotes.length === 0 && !showPayment && (
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="itemValue" className="text-sm font-medium text-on-surface block mb-2">Estimated Item Value (&pound;)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-medium">&pound;</span>
                    <input type="text" inputMode="decimal" id="itemValue" value={itemValue}
                      onChange={(e) => setItemValue(e.target.value)} placeholder="e.g. 50"
                      className="w-full pl-8 pr-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant/20 focus:border-primary text-on-surface placeholder:text-outline/40 transition-colors" />
                  </div>
                  <p className="text-xs text-on-secondary-container mt-1">Used for insurance purposes. Maximum &pound;{MAX_ITEM_VALUE.toLocaleString()}.</p>
                </div>

                {/* Parcel size — read-only, sourced from item.parcel_tier
                    (set by venue staff at item creation). Customer cannot edit. */}
                {parcelTier && (
                  <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-outline mb-1">Your parcel</p>
                    <p className="text-base font-headline font-bold text-on-surface">
                      {TIER_INFO[parcelTier].label}
                    </p>
                    <p className="text-xs text-on-secondary-container mt-1">
                      Roughly the size of: {TIER_INFO[parcelTier].examples}
                    </p>
                    <p className="text-xs text-on-secondary-container mt-2 italic">
                      The venue has measured your item — no need to enter dimensions.
                    </p>
                  </div>
                )}

                <button onClick={handleGetQuotes} disabled={loading || !deliveryAddress.trim() || !isItemValueValid || !parcelTier}
                  className="w-full py-3.5 bg-primary text-white rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Getting Quotes...' : 'Get Delivery Quotes'}
                </button>
                {!parcelTier && (
                  <p className="text-xs text-error text-center">
                    Parcel size hasn&apos;t been confirmed by the venue yet — please contact them to update your item.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* No quotes */}
          {quotesLoaded && quotes.length === 0 && !loading && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-outline mb-3">local_shipping</span>
              <p className="font-headline font-bold text-primary mb-1">No delivery quotes available</p>
              <p className="text-on-secondary-container text-sm mb-4">We couldn&apos;t find courier options for this address.</p>
              <button onClick={() => { setSelectedMethod(null); setQuotesLoaded(false); }} className="text-surface-tint hover:underline text-sm font-medium">
                Choose a different method
              </button>
            </div>
          )}

          {/* Quotes list */}
          {quotes.length > 0 && !showPayment && (
            <div className="space-y-4">
              <button type="button" onClick={() => { setQuotes([]); setSelectedQuote(null); setError(null); }}
                className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-medium gap-1">
                <span className="material-symbols-outlined text-lg">arrow_back</span> Back to delivery details
              </button>
              <div className="flex items-start gap-3 rounded-xl bg-tertiary-fixed/10 p-4">
                <span className="material-symbols-outlined text-on-tertiary-fixed-variant mt-0.5 text-sm">info</span>
                <p className="text-sm text-on-tertiary-fixed-variant">A platform fee of <strong>&pound;{PLATFORM_FEE.toFixed(2)}</strong> applies to all claims.</p>
              </div>

              <div className="space-y-3">
                {/* ── Top bar: title + sort + filter chips ── */}
                <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm -mx-1 px-1 py-2 flex flex-wrap items-center gap-2">
                  <h4 className="font-headline font-bold text-primary mr-auto">Available Options</h4>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'price' | 'delivery')}
                    className="text-xs border border-outline-variant/20 rounded-full px-3 py-1.5 bg-white text-on-surface focus:outline-none focus:border-primary">
                    <option value="price">Sort: Price</option>
                    <option value="delivery">Sort: Delivery</option>
                  </select>

                  {/* Delivery type chips — filter by how parcel reaches recipient */}
                  {[{ value: 'Door', label: 'Door delivery' }, { value: 'Shop', label: 'Shop collect' }].map(opt => (
                    <button key={opt.value}
                      onClick={() => {
                        const next = new Set(filterServiceTypes);
                        if (next.has(opt.value)) { next.delete(opt.value); } else { next.add(opt.value); }
                        setFilterServiceTypes(next);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                        filterServiceTypes.has(opt.value)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-on-secondary-container border-outline-variant/30 hover:border-primary/40'
                      }`}>
                      {opt.label}
                    </button>
                  ))}

                  {/* Speed chips */}
                  {[{ value: 'Fast', label: 'Express' }, { value: 'Medium', label: 'Economy' }, { value: 'Slow', label: 'Super Eco' }].map(opt => (
                    <button key={opt.value}
                      onClick={() => {
                        const next = new Set(filterDelivery);
                        if (next.has(opt.value)) { next.delete(opt.value); } else { next.add(opt.value); }
                        setFilterDelivery(next);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                        filterDelivery.has(opt.value)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-on-secondary-container border-outline-variant/30 hover:border-primary/40'
                      }`}>
                      {opt.label}
                    </button>
                  ))}

                  {(filterServiceTypes.size + filterDelivery.size) > 0 && (
                    <button onClick={() => { setFilterServiceTypes(new Set()); setFilterDelivery(new Set()); }}
                      className="text-xs text-surface-tint hover:underline font-medium ml-1">
                      Clear
                    </button>
                  )}
                </div>

                {/* ── Quotes list ── */}
                <div className="space-y-3">
              {[...quotes]
                .sort((a, b) => sortBy === 'price'
                  ? a.price - b.price
                  : Date.parse(a.estimated_delivery) - Date.parse(b.estimated_delivery))
                .filter((q) => {
                  if (!isDropOffByVenue(q)) return false;
                  if (filterServiceTypes.size > 0 && !filterServiceTypes.has(q.delivery_type)) return false;
                  if (filterDelivery.size > 0 && !filterDelivery.has(deliverySpeed(q))) return false;
                  return true;
                })
                .map((quote) => {
                  const etaDate = new Date(quote.estimated_delivery);
                  const etaLabel = isNaN(etaDate.getTime())
                    ? quote.estimated_delivery_label
                    : etaDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

                  const cutoffDate = new Date(quote.cutoff);
                  const cutoffToday = !isNaN(cutoffDate.getTime()) &&
                    cutoffDate.toDateString() === new Date().toDateString();
                  const cutoffLabel = cutoffToday
                    ? `Book by ${cutoffDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} today`
                    : null;


                  const collectionDateLabel = (() => {
                    const d = new Date(quote.collection_date);
                    return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                  })();
                  const coverLabel = quote.included_cover > 0
                    ? `£${quote.included_cover} cover included`
                    : quote.max_cover > 0
                      ? `Up to £${quote.max_cover.toLocaleString()} cover available`
                      : null;

                  return (
                    <div key={quote.id}
                      className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md hover:border-primary/20 transition-all overflow-hidden">

                      {/* ── Top row: logo + name + speed chip + price + CTA ── */}
                      <div className="flex items-center gap-4 px-5 pt-5 pb-4">
                        {quote.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={quote.logo_url} alt={quote.service} className="w-12 h-12 object-contain rounded-xl shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-2xl">local_shipping</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-headline font-bold text-on-surface text-base leading-snug">
                              {quote.service}
                            </p>
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                              deliverySpeed(quote) === 'Fast'
                                ? 'bg-green-50 text-green-700'
                                : deliverySpeed(quote) === 'Medium'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {quote.estimated_delivery_label || deliverySpeed(quote)}
                            </span>
                          </div>
                          {cutoffLabel && (
                            <p className="text-xs text-amber-600 font-medium mt-0.5">{cutoffLabel}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                          <p className="font-headline text-2xl font-bold text-primary leading-none">
                            &pound;{(quote.price + PLATFORM_FEE).toFixed(2)}
                          </p>
                          <p className="text-[11px] text-on-secondary-container">incl. £{PLATFORM_FEE.toFixed(2)} fee</p>
                          <button
                            onClick={() => setDetailQuote(quote)}
                            className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:bg-primary/90 active:scale-95 transition-all whitespace-nowrap">
                            Book
                          </button>
                        </div>
                      </div>

                      {/* ── Details row ── */}
                      <div className="border-t border-outline-variant/10 px-5 py-3 bg-surface-container-low/40 flex flex-wrap gap-x-5 gap-y-2">
                        {etaLabel && (
                          <div className="flex items-center gap-1.5 text-xs text-on-secondary-container">
                            <span className="material-symbols-outlined text-sm text-surface-tint">calendar_today</span>
                            <span>Arrives <strong className="text-on-surface">{etaLabel}</strong></span>
                          </div>
                        )}
                        {collectionDateLabel && (
                          <div className="flex items-center gap-1.5 text-xs text-on-secondary-container">
                            <span className="material-symbols-outlined text-sm text-surface-tint">directions_car</span>
                            <span>Collection <strong className="text-on-surface">{collectionDateLabel}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-on-secondary-container">
                          <span className="material-symbols-outlined text-sm text-surface-tint">home</span>
                          <span className="capitalize">{quote.delivery_type === 'Door' ? 'Door delivery' : quote.delivery_type + ' delivery'}</span>
                        </div>
                        {coverLabel && (
                          <div className="flex items-center gap-1.5 text-xs text-on-secondary-container">
                            <span className="material-symbols-outlined text-sm text-surface-tint">shield</span>
                            <span>{coverLabel}</span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
                </div>{/* end quotes list */}
              </div>{/* end top-bar + quotes */}
            </div>
          )}

          {/* Customs declaration */}
          {showCustomsForm && pendingBooking && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10 space-y-4">
              <h3 className="font-headline text-xl font-bold text-primary">Customs Declaration</h3>
              <CustomsForm
                initialItemDescription={claim.item?.title || claim.item?.description}
                initialItemValue={parseFloat(itemValue) || 0}
                tariffCodeRequired={pendingBooking.quote.tariff_code_required}
                onSubmit={handleCustomsSubmit}
                onBack={handleCustomsBack}
              />
            </div>
          )}

          {/* Payment */}
          {showPayment && paymentQuote && (
            <div className="space-y-4">
              <h4 className="font-headline font-bold text-primary">Complete Payment</h4>
              <CourierPayment
                claimId={claim.id}
                quote={paymentQuote}
                onPaymentSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </div>
          )}
        </div>
      )}
    {/* Modal rendered at root level to avoid stacking context clipping */}
    {detailQuote && (
      <CourierDetailModal
        quote={detailQuote}
        onBook={handleBookCourier}
        onClose={() => setDetailQuote(null)}
      />
    )}
    </div>
  );
}

// ─── Courier Detail Modal ────────────────────────────────────────────────────

interface CourierDetailModalProps {
  quote: CourierQuote;
  onBook: (quote: CourierQuote, cover?: CourierQuoteExtra | null, extras?: CourierQuoteExtra[]) => void;
  onClose: () => void;
}

const EXTRA_META: Record<string, { name: string; desc: string; icon: string }> = {
  Signature:         { name: 'Signature on delivery',      desc: 'Recipient must sign when the parcel arrives',                         icon: 'draw' },
  PrintInStore:      { name: 'Print label in store',       desc: 'Print your label at the drop-off point — no home printer needed',      icon: 'print' },
  DriverBringsLabel: { name: 'Driver prints your label',   desc: 'The driver will bring and attach a pre-printed label on collection',   icon: 'local_shipping' },
  Sms:               { name: 'SMS delivery notification',  desc: 'Recipient gets a text message with delivery updates',                  icon: 'sms' },
  DeliveryGuarantee: { name: 'Delivery guarantee',         desc: 'Money-back guarantee if your parcel is not delivered on time',         icon: 'verified' },
  Cover:             { name: 'Full protection',            desc: 'Covers up to your full declared item value',                           icon: 'shield' },
  ExtendedBaseCover: { name: 'Standard protection',        desc: 'Fixed protection included with this service',                          icon: 'verified_user' },
};

const DROP_OFF_NAMES: Record<string, string> = {
  ROYALMAIL: 'Royal Mail Post Office',
  EVRI:      'Evri ParcelShop',
  DPD:       'DPD Pickup Shop',
  UPS:       'UPS Access Point',
  INPOST:    'InPost Locker',
};

function extraMeta(type: string) {
  return EXTRA_META[type] ?? { name: type, desc: '', icon: 'add_circle' };
}

function CourierDetailModal({ quote, onBook, onClose }: CourierDetailModalProps) {
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const [booking, setBooking] = useState(false);

  const coverExtras = quote.available_extras.filter(
    (e) => e.type === 'Cover' || e.type === 'ExtendedBaseCover',
  );
  const otherExtras = quote.available_extras.filter(
    (e) => e.type !== 'Cover' && e.type !== 'ExtendedBaseCover',
  );
  const cheapestCover = [...coverExtras].sort((a, b) => a.total - b.total)[0] ?? null;

  // null = no extra protection chosen; undefined sentinel not used — null means "basic only"
  const [selectedCover, setSelectedCover] = useState<CourierQuoteExtra | null>(cheapestCover);

  const toggleExtra = (type: string) => {
    setSelectedExtras(prev => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  };

  const chosenExtras = otherExtras.filter(e => selectedExtras.has(e.type));
  const extrasCost = chosenExtras.reduce((sum, e) => sum + e.total, 0);

  const etaDate = new Date(quote.estimated_delivery);
  const etaLabel = isNaN(etaDate.getTime())
    ? quote.estimated_delivery_label
    : etaDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const isInternational = quote.requires_customs ||
    quote.tariff_code_required ||
    quote.recipient_tax_id_requirements != null ||
    quote.sender_tax_id_requirements != null ||
    quote.sender_eori_requirements != null ||
    quote.ioss_requirements != null ||
    quote.recipient_eori_requirements != null;

  const dropOffName = DROP_OFF_NAMES[quote.drop_off_provider ?? ''] ?? quote.drop_off_provider ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* ── Modal header ── */}
        <div className="bg-surface-container-low px-5 py-4 flex items-center gap-3 shrink-0">
          {quote.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quote.logo_url} alt={quote.service} className="w-10 h-10 object-contain rounded-lg shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">local_shipping</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-on-surface leading-tight">{quote.service}</p>
            {dropOffName && (
              <p className="text-xs text-on-secondary-container mt-0.5">Drop off at {dropOffName}</p>
            )}
          </div>
          <button onClick={onClose} className="ml-1 text-outline hover:text-on-surface transition-colors shrink-0">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-5 overscroll-contain">

          {/* Service summary */}
          <div className="grid grid-cols-2 gap-3">
            {etaLabel && (
              <div className="bg-surface-container-low rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">Est. Delivery</p>
                <p className="text-sm font-bold text-on-surface">{etaLabel}</p>
              </div>
            )}
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">Service Type</p>
              <p className="text-sm font-bold text-on-surface capitalize">{quote.collection_type} · {quote.delivery_type}</p>
            </div>
            {quote.estimated_delivery_label && (
              <div className="bg-surface-container-low rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">Speed</p>
                <p className="text-sm font-bold text-on-surface">{quote.estimated_delivery_label}</p>
              </div>
            )}
          </div>

          {/* Price breakdown */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Price Breakdown</p>
            <div className="bg-surface-container-low rounded-xl divide-y divide-outline-variant/10">
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-on-secondary-container">Courier cost (ex. VAT)</span>
                <span className="font-medium text-on-surface">&pound;{quote.price_ex_vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-on-secondary-container">VAT ({quote.vat_rate}%)</span>
                <span className="font-medium text-on-surface">&pound;{quote.vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-on-secondary-container">Vfetch platform fee</span>
                <span className="font-medium text-on-surface">&pound;{PLATFORM_FEE.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm font-bold">
                <span className="text-on-surface">Total</span>
                <span className="text-primary">&pound;{(quote.price + PLATFORM_FEE).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Protection */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Protection</p>
            <div className="space-y-2">
              {/* No extra protection option */}
              <div role="radio" aria-checked={selectedCover === null} tabIndex={-1}
                onClick={() => setSelectedCover(null)}
                className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors outline-none ${
                  selectedCover === null ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:bg-surface-container-low'
                }`}>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  selectedCover === null ? 'border-primary' : 'border-outline-variant/40'
                }`}>
                  {selectedCover === null && <span className="w-2 h-2 rounded-full bg-primary block" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-on-surface">No additional protection</p>
                    <span className="text-sm font-bold text-emerald-600 shrink-0">Free</span>
                  </div>
                  <p className="text-xs text-on-secondary-container mt-0.5">
                    Standard courier liability only — covers up to £{quote.included_cover}. No compensation for loss or damage beyond this amount.
                  </p>
                </div>
              </div>

              {/* Cover extras as radio options */}
              {coverExtras.map(extra => {
                const isSelected = selectedCover?.type === extra.type;
                const isFull = extra.type === 'Cover';
                const coverLimit = isFull ? quote.max_cover : quote.included_cover;
                const bullets = isFull
                  ? [
                      `Covers up to £${coverLimit} — your full declared item value`,
                      'Protects against loss, damage, and theft in transit',
                      'Claim directly through Parcel2Go if something goes wrong',
                    ]
                  : [
                      `Fixed cover up to £${coverLimit}`,
                      'Protects against loss or damage in transit',
                      'Suitable for lower-value items',
                    ];
                return (
                  <div key={extra.type} role="radio" aria-checked={isSelected} tabIndex={-1}
                    onClick={() => setSelectedCover(extra)}
                    className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors outline-none ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:bg-surface-container-low'
                    }`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected ? 'border-primary' : 'border-outline-variant/40'
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-primary block" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-on-surface">
                          {isFull ? 'Full protection' : 'Standard protection'}
                        </p>
                        <span className="text-sm font-bold text-on-surface shrink-0">
                          {extra.total === 0 ? 'Free' : `+£${extra.total.toFixed(2)}`}
                        </span>
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {bullets.map(b => (
                          <li key={b} className="flex items-start gap-1.5 text-xs text-on-secondary-container">
                            <span className="material-symbols-outlined text-[13px] text-surface-tint mt-px shrink-0">check_circle</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Other extras */}
          {otherExtras.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Available Extras</p>
              <div className="space-y-1.5">
                {otherExtras.map(extra => {
                  const m = extraMeta(extra.type);
                  const isIncluded = extra.total === 0;
                  const checked = selectedExtras.has(extra.type);
                  if (isIncluded) {
                    return (
                      <div key={extra.type} className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/20 bg-surface-container-low/40">
                        <span className="material-symbols-outlined text-sm text-surface-tint">{m.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface">{m.name}</p>
                          {m.desc && <p className="text-xs text-on-secondary-container">{m.desc}</p>}
                        </div>
                        <span className="text-xs font-bold text-emerald-600 shrink-0">Included</span>
                      </div>
                    );
                  }
                  return (
                    <div key={extra.type} role="checkbox" aria-checked={checked} tabIndex={-1}
                      onClick={() => toggleExtra(extra.type)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors outline-none ${
                        checked ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:bg-surface-container-low'
                      }`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'bg-primary border-primary' : 'border-outline-variant/40'
                      }`}>
                        {checked && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                      </span>
                      <span className="material-symbols-outlined text-sm text-surface-tint">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface">{m.name}</p>
                        {m.desc && <p className="text-xs text-on-secondary-container">{m.desc}</p>}
                      </div>
                      <span className="text-sm font-bold text-on-surface shrink-0">+£{extra.total.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* About */}
          {quote.service_description && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">About This Service</p>
              <p className="text-sm text-on-secondary-container leading-relaxed">{quote.service_description}</p>
            </div>
          )}

          {/* Max parcel size */}
          {(quote.max_dimensions.weight > 0 || quote.max_dimensions.length > 0) && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Max Parcel Size</p>
              <div className="flex flex-wrap gap-2">
                {quote.max_dimensions.weight > 0 && (
                  <span className="px-3 py-1.5 bg-surface-container-low rounded-lg text-xs font-medium text-on-surface">
                    Up to {quote.max_dimensions.weight} kg
                  </span>
                )}
                {quote.max_dimensions.length > 0 && (
                  <span className="px-3 py-1.5 bg-surface-container-low rounded-lg text-xs font-medium text-on-surface">
                    {Math.round(quote.max_dimensions.length * 100)} × {Math.round(quote.max_dimensions.width * 100)} × {Math.round(quote.max_dimensions.height * 100)} cm
                  </span>
                )}
              </div>
            </div>
          )}

          {/* International requirements */}
          {isInternational && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">International Requirements</p>
              <div className="space-y-1.5">
                {quote.requires_customs && (
                  <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                    <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                    Customs declaration required
                  </div>
                )}
                {quote.requires_commercial_invoice && (
                  <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                    <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                    Commercial invoice required
                  </div>
                )}
                {quote.tariff_code_required && (
                  <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                    <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                    Tariff / HS code required
                  </div>
                )}
                {quote.country_of_manufacture_required && (
                  <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                    <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                    Country of manufacture required
                  </div>
                )}
                {quote.export_reason_required && (
                  <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                    <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                    Export reason required
                  </div>
                )}
                {quote.ioss_requirements != null && (
                  <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                    <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                    IOSS number may be required
                  </div>
                )}
                {(quote.sender_eori_requirements != null || quote.recipient_eori_requirements != null) && (
                  <div className="flex items-center gap-2 text-sm text-on-secondary-container">
                    <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                    EORI number required
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky footer ── */}
        <div className="border-t border-outline-variant/10 px-5 py-4 shrink-0 space-y-3">
          {(extrasCost > 0 || selectedCover) && (
            <div className="flex flex-col gap-0.5 text-xs text-on-secondary-container">
              {selectedCover && selectedCover.total > 0 && (
                <div className="flex justify-between">
                  <span>Protection ({extraMeta(selectedCover.type).name})</span>
                  <strong className="text-on-surface">+£{selectedCover.total.toFixed(2)}</strong>
                </div>
              )}
              {extrasCost > 0 && (
                <div className="flex justify-between">
                  <span>Selected extras</span>
                  <strong className="text-on-surface">+£{extrasCost.toFixed(2)}</strong>
                </div>
              )}
              <div className="flex justify-between font-bold text-on-surface border-t border-outline-variant/10 pt-1 mt-0.5">
                <span>Total</span>
                <span className="text-primary">
                  £{(quote.price + PLATFORM_FEE + (selectedCover?.total ?? 0) + extrasCost).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => { setBooking(true); onBook(quote, selectedCover, chosenExtras); }}
            disabled={booking}
            className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {booking ? '...' : 'Book & Pay'}
          </button>
        </div>
      </div>
    </div>
  );
}
