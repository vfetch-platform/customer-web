'use client';

import { useEffect, useState } from 'react';
import { customerApi, getErrorMessage } from '@/lib/api';
import ErrorBanner from '@/components/ErrorBanner';
import { Venue, Claim, CourierQuote } from '@/types';
import CourierAddressForm, { AddressFormValues } from './CourierAddressForm';
import CourierPayment from './CourierPayment';
import SelfPickupPayment from './SelfPickupPayment';
import { PLATFORM_FEE, MAX_ITEM_VALUE } from '@/constants/fees';
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

export default function CollectionMethods({ claim, venue, onCourierBooked, onSelfPickupConfirmed, onBack, onFlowChange }: CollectionMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<'self_pickup' | 'parcel2go' | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressFormData, setAddressFormData] = useState<AddressFormValues | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [itemValue, setItemValue] = useState<string>('');
  const [quotes, setQuotes] = useState<CourierQuote[]>([]);
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<CourierQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSelfPickupPayment, setShowSelfPickupPayment] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentQuote, setPaymentQuote] = useState<CourierQuote | null>(null);
  const [, setFeeBreakdown] = useState<{ courierCost: number; platformFee: number; total: number } | null>(null);

  const handleMethodSelect = (method: 'self_pickup' | 'parcel2go') => {
    setSelectedMethod(method);
    setError(null); setSuccess(null); setQuotes([]); setQuotesLoaded(false); setSelectedQuote(null);
    if (method === 'self_pickup') { setAddressFormData(null); setIsEditingAddress(false); setSubmittingAddress(false); setDeliveryAddress(''); }
  };

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

  const handleBookCourier = async (quote: CourierQuote) => {
    setError(null);
    try {
      setLoading(true);
      const breakdownRes = await customerApi.getCourierFeeBreakdown(claim.id, quote.price);
      setFeeBreakdown(breakdownRes.data); setPaymentQuote(quote); setSelectedQuote(quote); setShowPayment(true);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
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
    return { fullName: claim.customer_name || '', email: claim.customer_email || '', phone: claim.customer_phone || '' };
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
    }, 300);
  };

  const parsedItemValue = parseFloat(itemValue);
  const isItemValueValid = !isNaN(parsedItemValue) && parsedItemValue > 0;

  // Derive collection flow step for the mini stepper
  const flowStep = !selectedMethod ? 1 : (showPayment || showSelfPickupPayment) ? 3 : 2;

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
              <p className="text-on-secondary-container text-sm mb-5 flex-grow">Collect from the venue directly during opening hours.</p>
              <div className="bg-surface-container-low rounded-xl p-4 mb-5">
                <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60 mb-1">Venue Address</p>
                <p className="font-headline font-bold text-sm text-primary">{venue.address?.split(',')[0] || venue.name}</p>
                <p className="text-xs text-on-secondary-container">{venue.address?.split(',').slice(1).join(',').trim() || ''}</p>
              </div>
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
              <p className="font-headline text-2xl font-bold text-primary mb-1">&pound;8.99 <span className="text-sm font-normal text-on-secondary-container">Starting from</span></p>
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
              <div className="min-h-[240px]">
                <img src="/uber_car.avif" alt="Uber Courier" className="w-full h-full object-cover" />
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
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-primary mb-4">Self Pickup Instructions</h3>
            <div className="space-y-3 text-on-secondary-container text-sm mb-6">
              <p>1. Complete the platform fee payment below</p>
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
      )}

      {/* ═══ COURIER FLOW ═══ */}
      {selectedMethod === 'parcel2go' && (
        <div className="space-y-6">
          <button type="button" onClick={() => { setSelectedMethod(null); setQuotes([]); setSelectedQuote(null); setError(null); }}
            className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-medium gap-1">
            <span className="material-symbols-outlined text-lg">arrow_back</span> Back to collection methods
          </button>

          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-primary mb-6">Delivery Details</h3>
            {(!addressFormData || isEditingAddress) && (
              <CourierAddressForm stepNumber={1}
                title="Courier delivery address"
                submitting={submittingAddress} onSubmit={handleAddressSubmit} initialValue={getAddressFormInitialValue()} />
            )}
            {addressFormData && !isEditingAddress && (
              <div className="rounded-xl bg-surface-container-low p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-headline font-bold text-primary">Address Saved</p>
                  <button type="button" onClick={() => setIsEditingAddress(true)} className="text-xs font-bold text-surface-tint hover:underline">Edit</button>
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
                <button onClick={handleGetQuotes} disabled={loading || !deliveryAddress.trim() || !isItemValueValid}
                  className="w-full py-3.5 bg-primary text-white rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Getting Quotes...' : 'Get Delivery Quotes'}
                </button>
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
              <h4 className="font-headline font-bold text-primary">Available Delivery Options</h4>
              {quotes.map((quote) => (
                <div key={quote.id} onClick={() => setSelectedQuote(quote)}
                  className={`bg-white rounded-2xl p-6 shadow-sm border cursor-pointer transition-all hover:shadow-md ${
                    selectedQuote?.id === quote.id ? 'border-primary ring-1 ring-primary' : 'border-outline-variant/10'
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-headline font-bold text-primary">{quote.service}</h5>
                      <p className="text-xs text-on-secondary-container mt-0.5">{quote.estimated_delivery}</p>
                    </div>
                    <p className="font-headline text-2xl font-bold text-primary">&pound;{(quote.price + PLATFORM_FEE).toFixed(2)}</p>
                  </div>
                  <div className="text-xs text-on-secondary-container space-y-0.5 mb-3">
                    <p>Courier: &pound;{quote.price.toFixed(2)} + Platform fee: &pound;{PLATFORM_FEE.toFixed(2)}</p>
                  </div>
                  <p className="text-on-secondary-container text-sm mb-4">{quote.description}</p>
                  <button onClick={(e) => { e.stopPropagation(); handleBookCourier(quote); }} disabled={loading}
                    className="w-full py-3 bg-primary text-white rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50">
                    {loading && selectedQuote?.id === quote.id ? 'Loading...' : 'Book & Pay'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Payment */}
          {showPayment && paymentQuote && (
            <div className="space-y-4">
              <h4 className="font-headline font-bold text-primary">Complete Payment</h4>
              <CourierPayment claimId={claim.id} quote={paymentQuote} onPaymentSuccess={handlePaymentSuccess} onCancel={handlePaymentCancel} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
