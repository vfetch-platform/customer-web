'use client';

import { useState } from 'react';
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
}

export default function CollectionMethods({ claim, venue, onCourierBooked, onSelfPickupConfirmed, onBack }: CollectionMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<'self_pickup' | 'parcel2go' | 'uber_courier' | null>(null);
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
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [showSelfPickupPayment, setShowSelfPickupPayment] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentQuote, setPaymentQuote] = useState<CourierQuote | null>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<{ courierCost: number; platformFee: number; total: number; } | null>(null);

  const handleMethodSelect = (method: 'self_pickup' | 'parcel2go' | 'uber_courier') => {
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
    setTrackingNumber(booking.tracking_number); setShowPayment(false);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        {onBack && (
          <button onClick={onBack} className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-headline font-bold gap-1 mb-6">
            <span className="material-symbols-outlined text-lg">arrow_back</span> Back to details
          </button>
        )}
        {!selectedMethod && (
          <>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-primary tracking-tight mb-4">Select Collection Method</h2>
            <p className="font-body text-on-secondary-container text-lg max-w-2xl mx-auto">Choose how you would like to retrieve your lost item.</p>
          </>
        )}
      </div>

      {error && <ErrorBanner message={error} variant="error" onDismiss={() => setError(null)} />}
      {success && <div className="bg-tertiary-fixed/10 rounded-xl p-4"><p className="text-on-tertiary-fixed-variant">{success}</p></div>}

      {/* Method Selection Cards */}
      {!selectedMethod && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Self Pickup */}
            <section onClick={() => handleMethodSelect('self_pickup')}
              className="flex flex-col h-full bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-[0px_24px_48px_rgba(7,30,39,0.04)] ghost-border transition-all hover:shadow-[0px_32px_64px_rgba(7,30,39,0.08)] cursor-pointer">
              <div className="flex-grow">
                <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-surface-tint text-3xl">storefront</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-primary mb-4 tracking-tight">Self Pickup</h3>
                <p className="text-on-secondary-container mb-8">Collect your item directly from the venue at your convenience.</p>
                <div className="space-y-4 mb-8">
                  <div className="bg-surface-container-low p-5 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Venue</p>
                    <p className="font-headline font-bold text-primary">{venue.name}</p>
                    <p className="text-sm text-on-secondary-container">{venue.address}</p>
                  </div>
                </div>
              </div>
              <div className="w-full py-4 bg-primary text-white rounded-full font-headline font-bold text-lg text-center hover:opacity-95 transition-all shadow-lg shadow-primary/20">
                Select Self Pickup
              </div>
            </section>

            {/* Parcel2Go */}
            <section onClick={() => handleMethodSelect('parcel2go')}
              className="flex flex-col h-full bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-[0px_24px_48px_rgba(7,30,39,0.04)] ghost-border transition-all hover:shadow-[0px_32px_64px_rgba(7,30,39,0.08)] cursor-pointer">
              <div className="flex-grow">
                <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-surface-tint text-3xl">local_shipping</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-primary mb-4 tracking-tight">Parcel2Go Courier</h3>
                <p className="text-on-secondary-container mb-8">Best for long-distance shipping with full tracking and insurance.</p>
                <div className="space-y-4 mb-8">
                  <div className="bg-surface-container-low p-5 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Service Type</p>
                    <p className="font-headline font-bold text-primary">Standard &amp; Express</p>
                    <p className="text-sm text-on-secondary-container">Domestic and International</p>
                  </div>
                  <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-2">Starting From</p>
                    <p className="font-headline text-3xl font-extrabold text-primary tracking-tight">&pound;8.99</p>
                  </div>
                </div>
              </div>
              <div className="w-full py-4 bg-primary text-white rounded-full font-headline font-bold text-lg text-center hover:opacity-95 transition-all shadow-lg shadow-primary/20">
                Select Parcel2Go
              </div>
            </section>

            {/* Uber Courier — Dark card */}
            <section onClick={() => handleMethodSelect('uber_courier')}
              className="flex flex-col h-full bg-on-primary-fixed rounded-[2.5rem] p-8 shadow-[0px_24px_48px_rgba(7,30,39,0.04)] transition-all hover:shadow-[0px_32px_64px_rgba(0,0,0,0.2)] cursor-pointer">
              <div className="flex-grow">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-tertiary-fixed text-3xl">electric_car</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-white mb-4 tracking-tight">Uber Courier</h3>
                <p className="text-on-primary/70 mb-8">Immediate local delivery within a 15-mile radius. Delivered in under 90 mins.</p>
                <div className="space-y-4 mb-8">
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-tertiary-fixed/80 mb-2">Estimated Arrival</p>
                    <p className="font-headline font-bold text-white">Within 90 Minutes</p>
                    <p className="text-sm text-on-primary/60">Real-time GPS tracking</p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-tertiary-fixed/80 mb-2">Availability</p>
                    <p className="text-sm font-medium text-white">On-demand 24/7</p>
                    <p className="text-sm text-on-primary/60">Local destination required</p>
                  </div>
                </div>
              </div>
              <div className="w-full py-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-full font-headline font-bold text-lg text-center hover:scale-[1.02] transition-all shadow-lg shadow-tertiary-fixed/20">
                Request Uber
              </div>
            </section>

            {/* Uber Parcel — Coming Soon */}
            <section className="flex flex-col h-full bg-on-primary-fixed/80 rounded-[2.5rem] p-8 opacity-60 cursor-not-allowed relative">
              <span className="absolute top-6 right-6 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Coming Soon</span>
              <div className="flex-grow">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-tertiary-fixed/50 text-3xl">bolt</span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-white/60 mb-4 tracking-tight">Uber Parcel</h3>
                <p className="text-white/40 mb-8">Ultra-fast parcel delivery within the city via Uber Direct.</p>
                <div className="space-y-4 mb-8">
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 mb-2">Speed</p>
                    <p className="font-headline font-bold text-white/50">Under 1 Hour</p>
                  </div>
                </div>
              </div>
              <div className="w-full py-4 bg-white/10 text-white/40 rounded-full font-headline font-bold text-lg text-center">
                Coming Soon
              </div>
            </section>
          </div>

          {/* Help Section */}
          <section className="mt-12 py-16 px-8 bg-surface-container-low rounded-[3rem] text-center border border-white/50">
            <h3 className="font-headline text-3xl font-bold text-primary mb-4 tracking-tight">Need assistance?</h3>
            <p className="text-on-secondary-container mb-10 max-w-xl mx-auto">Our hospitality team is available 24/7 to help you navigate the recovery process.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="flex items-center justify-center gap-3 px-10 py-4 bg-white text-primary font-headline font-bold rounded-full hover:bg-primary/5 transition-all shadow-sm">
                <span className="material-symbols-outlined text-xl">help_center</span> Visit Help Center
              </button>
              <button className="flex items-center justify-center gap-3 px-10 py-4 bg-primary text-white font-headline font-bold rounded-full hover:opacity-90 transition-all shadow-md shadow-primary/10">
                <span className="material-symbols-outlined text-xl">chat_bubble</span> Live Support
              </button>
            </div>
          </section>
        </>
      )}

      {/* ─── Self Pickup Details ─── */}
      {selectedMethod === 'self_pickup' && (
        <div>
          <button type="button" onClick={() => { setSelectedMethod(null); setError(null); }}
            className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-headline font-bold gap-1 mb-6">
            <span className="material-symbols-outlined text-lg">arrow_back</span> Back to collection methods
          </button>
          <div className="bg-surface-container-low rounded-[2rem] p-8">
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
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-headline font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50">
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

      {/* ─── Courier Flow ─── */}
      {(selectedMethod === 'parcel2go' || selectedMethod === 'uber_courier') && (
        <div className="space-y-6">
          <button type="button" onClick={() => { setSelectedMethod(null); setQuotes([]); setSelectedQuote(null); setError(null); }}
            className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-headline font-bold gap-1">
            <span className="material-symbols-outlined text-lg">arrow_back</span> Back to collection methods
          </button>

          <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow">
            <h3 className="font-headline text-xl font-bold text-primary mb-6">Delivery Details</h3>
            {(!addressFormData || isEditingAddress) && (
              <CourierAddressForm stepNumber={1}
                title={selectedMethod === 'parcel2go' ? 'Courier delivery address' : 'Express local delivery address'}
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

            {addressFormData && !isEditingAddress && quotes.length === 0 && (
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="itemValue" className="text-xs font-bold uppercase tracking-wider text-outline px-1 block mb-2">Estimated Item Value (&pound;) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline font-medium">&pound;</span>
                    <input type="text" inputMode="decimal" id="itemValue" value={itemValue}
                      onChange={(e) => setItemValue(e.target.value)} placeholder="e.g., 50"
                      className="w-full pl-7 pr-3 py-3 bg-surface-container-low border-0 border-b border-outline-variant/30 text-on-surface placeholder:text-outline/50 transition-all" />
                  </div>
                  <p className="text-xs text-outline mt-1">Used for insurance purposes. Maximum &pound;{MAX_ITEM_VALUE.toLocaleString()}.</p>
                </div>
                <button onClick={handleGetQuotes} disabled={loading || !deliveryAddress.trim() || !isItemValueValid}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-headline font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed">
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
              <button onClick={() => { setSelectedMethod(null); setQuotesLoaded(false); }} className="text-surface-tint hover:underline text-sm font-headline font-bold">
                Choose a different method
              </button>
            </div>
          )}

          {/* Quotes list */}
          {quotes.length > 0 && !showPayment && (
            <div className="space-y-4">
              <button type="button" onClick={() => { setQuotes([]); setSelectedQuote(null); setError(null); }}
                className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-headline font-bold gap-1">
                <span className="material-symbols-outlined text-lg">arrow_back</span> Back to delivery details
              </button>
              <div className="flex items-start gap-3 rounded-xl bg-tertiary-fixed/10 p-4">
                <span className="material-symbols-outlined text-on-tertiary-fixed-variant mt-0.5">info</span>
                <p className="text-sm text-on-tertiary-fixed-variant">A platform fee of <strong>&pound;{PLATFORM_FEE.toFixed(2)}</strong> applies to all claims.</p>
              </div>
              <h4 className="font-headline font-bold text-primary">Available Delivery Options</h4>
              {quotes.map((quote) => (
                <div key={quote.id} onClick={() => setSelectedQuote(quote)}
                  className={`bg-surface-container-lowest rounded-[1.5rem] p-6 ghost-border cursor-pointer transition-all hover:translate-y-[-2px] ${
                    selectedQuote?.id === quote.id ? 'ring-2 ring-surface-tint shadow-lg' : 'editorial-shadow'
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-headline font-bold text-primary flex items-center gap-2">
                        {quote.service}
                        {quote.provider && (
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ${
                            quote.provider === 'uber_parcel' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container-high text-on-surface'
                          }`}>{quote.provider === 'uber_parcel' ? 'uber parcel' : quote.provider}</span>
                        )}
                      </h5>
                      <p className="text-xs text-on-secondary-container mt-0.5">
                        {quote.estimated_delivery}
                        {quote.provider === 'parcel2go' && quote.metadata?.insurance && <> &middot; Insured &pound;{quote.metadata.insurance}</>}
                        {quote.provider === 'uber' && quote.metadata?.distance_miles && <> &middot; {quote.metadata.distance_miles.toFixed(1)} mi</>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-headline text-2xl font-extrabold text-primary">&pound;{(quote.price + PLATFORM_FEE).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-xs text-on-secondary-container space-y-0.5 mb-3">
                    <p>Courier: &pound;{quote.price.toFixed(2)}</p>
                    <p>Platform fee: &pound;{PLATFORM_FEE.toFixed(2)}</p>
                    <p className="font-bold text-on-surface">Total: &pound;{(quote.price + PLATFORM_FEE).toFixed(2)}</p>
                  </div>
                  <p className="text-on-secondary-container text-sm mb-4">{quote.description}</p>
                  <button onClick={(e) => { e.stopPropagation(); handleBookCourier(quote); }} disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-headline font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50">
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
