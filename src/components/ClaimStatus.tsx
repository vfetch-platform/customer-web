'use client';

import React, { useState } from 'react';
import { customerApi } from '@/lib/api';
import { Venue, Claim } from '@/types';
import CollectionMethods from './CollectionMethods';
import VenueReviewPrompt from './VenueReviewPrompt';
import { ClaimStep, CLIPBOARD_FEEDBACK_MS } from '@/constants/claimSteps';
import { STORAGE_KEY_CLAIM_ID, STORAGE_KEY_CLAIM_RESULT } from '@/constants/storage';

interface BookingResult {
  booking_id: string;
  tracking_number: string;
  label_url?: string;
  payment_intent_id: string;
}

interface ConfirmationData {
  type: 'courier' | 'self_pickup';
  booking?: BookingResult;
  service?: string;
  estimatedDelivery?: string;
  pickupCode?: string;
  paymentIntentId?: string;
}

interface ClaimStatusProps {
  venue: Venue;
}

// Status stepper config
const STATUS_STEPS = [
  { key: 'received', label: 'Claim Received', icon: 'description' },
  { key: 'verification', label: 'Item Verification', icon: 'verified_user' },
  { key: 'collection', label: 'Ready for Collection', icon: 'assignment' },
];

function getStatusStepIndex(claim: Claim): number {
  if (claim.status === 'approved') return 2;
  if (claim.status === 'pending') return 1;
  return 0;
}

function getStatusTitle(claim: Claim): string {
  if (claim.status === 'approved' && claim.payment_status === 'completed') return 'Ready for Collection';
  if (claim.status === 'approved') return 'Item Found';
  if (claim.status === 'pending') return 'Verifying Your Claim';
  if (claim.status === 'rejected') return 'Claim Rejected';
  return 'Claim Received';
}

function getStatusSubtext(claim: Claim): string {
  if (claim.status === 'approved' && claim.payment_status === 'completed') {
    return `Your claim has been verified and payment received. Your item is ready for collection.`;
  }
  if (claim.status === 'approved') {
    return `Great news! Your item has been verified and matched. Choose a collection method below to arrange pickup or delivery.`;
  }
  if (claim.status === 'pending') {
    return `Our team is verifying your claim against the lost and found records. We'll notify you by email once verification is complete.`;
  }
  if (claim.status === 'rejected') {
    return `Unfortunately, your claim was not approved. Please contact the venue directly if you believe this is an error.`;
  }
  return `Your claim has been received and logged into our system.`;
}

export default function ClaimStatus({ venue }: ClaimStatusProps) {
  const [claimId, setClaimId] = useState<string>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_CLAIM_ID) || '' : ''
  );
  const [claim, setClaim] = useState<Claim | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_CLAIM_RESULT);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ClaimStep>('search');
  const [isCollectionFlowActive, setIsCollectionFlowActive] = useState(false);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), CLIPBOARD_FEEDBACK_MS);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimId.trim()) { setError('Please enter a Claim ID.'); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await customerApi.getClaimStatus(claimId.trim());
      setClaim(response.data);
      sessionStorage.setItem(STORAGE_KEY_CLAIM_RESULT, JSON.stringify(response.data));
      setStep('details');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 422) setError('Invalid Claim ID format.');
      else if (status === 404) setError('Claim not found. Please check your ID.');
      else setError(err.normalizedMessage || 'Something went wrong.');
      setClaim(null);
    } finally { setLoading(false); }
  };

  const handleCourierBooked = async (booking: BookingResult, serviceName?: string, estimatedDelivery?: string) => {
    setConfirmationData({ type: 'courier', booking, service: serviceName || 'Courier', estimatedDelivery });
    setStep('confirmation');
    try { const refreshed = await customerApi.getClaimStatus(claim!.id); setClaim(refreshed.data || refreshed); } catch { /* ignore */ }
  };

  const handleSelfPickupConfirmed = async (paymentIntentId: string) => {
    setConfirmationData({ type: 'self_pickup', pickupCode: claim?.pickup_code || '', paymentIntentId });
    setStep('confirmation');
    try {
      const refreshed = await customerApi.getClaimStatus(claim!.id);
      const refreshedClaim = refreshed.data || refreshed;
      setClaim(refreshedClaim);
      if (refreshedClaim.pickup_code) setConfirmationData(prev => prev ? { ...prev, pickupCode: refreshedClaim.pickup_code } : prev);
    } catch { /* ignore */ }
  };

  const handleCheckAnother = () => { setClaimId(''); setClaim(null); setConfirmationData(null); setStep('search'); };

  return (
    <main className="pt-28 pb-20 px-6 min-h-screen">
      <div className="w-full max-w-5xl mx-auto">

        {/* ═══ SEARCH STEP ═══ */}
        {step === 'search' && (
          <>
            <header className="text-center mb-10">
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight mb-3">Check Your Claim Status</h1>
              <p className="text-on-secondary-container text-sm max-w-xl mx-auto">Enter your unique claim identifier to see real-time updates on your lost item recovery.</p>
            </header>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-outline-variant/10 mb-10 max-w-2xl mx-auto">
              <form onSubmit={handleSearch}>
                <label className="block text-sm font-medium text-on-surface mb-2">Enter your Claim ID</label>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-grow">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">fingerprint</span>
                    <input type="text" value={claimId}
                      onChange={(e) => { setClaimId(e.target.value); sessionStorage.setItem(STORAGE_KEY_CLAIM_ID, e.target.value); }}
                      placeholder="e.g. VF-2024-8892"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 focus:border-primary text-on-surface placeholder:text-outline/50 transition-colors"
                      required />
                  </div>
                  <button type="submit" disabled={loading}
                    className="bg-primary text-white px-8 py-3.5 rounded-full font-headline font-bold text-sm hover:bg-primary-container active:scale-95 transition-all disabled:opacity-50">
                    {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto" /> : 'Check Status'}
                  </button>
                </div>
              </form>
              {error && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-error-container/20 border border-error/20 rounded-xl">
                  <span className="material-symbols-outlined text-error text-lg">error</span>
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ DETAILS STEP ═══ */}
        {step === 'details' && claim && (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-1">{getStatusTitle(claim)}</h1>
                <p className="text-on-secondary-container text-sm leading-relaxed max-w-lg">{getStatusSubtext(claim)}</p>
              </div>
            </div>

            {/* Status Stepper */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
              <div className="flex items-start justify-between">
                {STATUS_STEPS.map((s, i) => {
                  const currentIdx = getStatusStepIndex(claim);
                  const isComplete = i < currentIdx;
                  const isActive = i === currentIdx;
                  const highlightConnector = isComplete || isActive;
                  return (
                    <React.Fragment key={s.key}>
                      {i > 0 && (
                        <div className={`flex-1 h-[2px] mt-5 mx-2 ${highlightConnector ? 'bg-primary' : 'bg-outline-variant/15'}`} />
                      )}
                      <div className="flex flex-col items-center text-center" style={{ width: '6rem' }}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          isComplete ? 'bg-primary text-white' :
                          isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' :
                          'bg-surface-container-high text-outline'
                        }`}>
                          <span className="material-symbols-outlined text-lg" style={isComplete ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                            {isComplete ? 'check_circle' : s.icon}
                          </span>
                        </div>
                        <p className={`text-[11px] font-medium leading-tight ${isActive || isComplete ? 'text-primary font-semibold' : 'text-outline'}`}>{s.label}</p>
                        {(isComplete || isActive) && (
                          <p className="text-[10px] text-on-secondary-container mt-0.5">
                            {new Date(isActive ? claim.created_at : claim.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}, {new Date(claim.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {!isComplete && !isActive && s.key === 'collection' && claim.status === 'approved' && (
                          <p className="text-[10px] text-on-secondary-container mt-0.5">Estimated: Today</p>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Collection Methods */}
            {claim.status === 'approved' && claim.payment_status !== 'completed' && (
              <CollectionMethods
                claim={claim}
                venue={venue}
                onCourierBooked={handleCourierBooked}
                onSelfPickupConfirmed={handleSelfPickupConfirmed}
                onFlowChange={setIsCollectionFlowActive}
              />
            )}

            {/* Item Details + Timeline Grid */}
            {!isCollectionFlowActive && (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Item Details */}
                <div className="md:col-span-2 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
                  <h2 className="font-headline text-xl font-bold text-primary mb-5">Item Details</h2>
                  {claim.item && (
                    <div className="flex flex-col md:flex-row gap-6">
                      {claim.item.images && claim.item.images.length > 0 && (
                        <div className="md:w-56 shrink-0">
                          <img src={claim.item.images[0]} alt={claim.item.title}
                            className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxImage(claim.item!.images[0])} />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60 mb-0.5">Category</p>
                        <p className="font-headline font-bold text-lg text-primary mb-3 capitalize">{claim.item.category || 'Personal Accessory'}</p>

                        <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60 mb-0.5">Description</p>
                        <p className="text-sm text-on-secondary-container leading-relaxed mb-4">{claim.item.description}</p>

                        <div className="flex flex-wrap gap-2">
                          {((claim.item as any).match_score || (claim.item as any).similarity_score) && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-primary/20 text-xs font-medium text-primary">
                              Matched: {Math.round((claim.item as any).match_score || (claim.item as any).similarity_score)}%
                            </span>
                          )}
                          {claim.item.location_found && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-outline-variant/20 text-xs font-medium text-on-secondary-container">
                              Location: {claim.item.location_found}
                            </span>
                          )}
                          {claim.item.color && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-outline-variant/20 text-xs font-medium text-on-secondary-container capitalize">
                              {claim.item.color}
                            </span>
                          )}
                          {claim.item.brand && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-outline-variant/20 text-xs font-medium text-on-secondary-container">
                              {claim.item.brand}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Original Report Summary */}
                <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm border border-outline-variant/10">
                  <h2 className="font-headline text-lg font-bold text-primary mb-5">Original Report Summary</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 bg-surface-container rounded-xl p-4">
                      <span className="material-symbols-outlined text-primary text-xl mt-0.5">location_on</span>
                      <div>
                        <p className="font-headline font-bold text-sm text-primary">Lost at {venue.name}</p>
                        <p className="text-xs text-on-secondary-container">{claim.item?.location_found || venue.address || 'Location details available on record'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 bg-surface-container rounded-xl p-4">
                      <span className="material-symbols-outlined text-primary text-xl mt-0.5">calendar_today</span>
                      <div>
                        <p className="font-headline font-bold text-sm text-primary">Date &amp; Time Lost</p>
                        <p className="text-xs text-on-secondary-container">
                          {claim.item?.date_found
                            ? new Date(claim.item.date_found).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })
                            : new Date(claim.created_at).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Tracking */}
            {claim.collection_method && claim.collection_method !== 'self_pickup' && claim.delivery_tracking && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-xl">local_shipping</span>
                  <h2 className="font-headline text-lg font-bold text-primary">Delivery Tracking</h2>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="font-headline font-bold text-primary">Tracking: {claim.delivery_tracking}</p>
                  <p className="text-on-secondary-container text-sm mt-1">
                    Method: {claim.collection_method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </p>
                </div>
              </div>
            )}

            {/* Pickup Code */}
            {claim.status === 'approved' && claim.payment_status === 'completed' && claim.collection_method === 'self_pickup' && claim.pickup_code && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/10">
                <h2 className="font-headline text-lg font-bold text-primary mb-4">Pickup Information</h2>
                <div className="bg-tertiary-fixed/10 rounded-xl p-6">
                  <p className="font-headline text-lg font-bold text-on-tertiary-fixed-variant">
                    Your Pickup Code: <span className="text-2xl tracking-wider">{claim.pickup_code}</span>
                  </p>
                  <p className="text-on-tertiary-fixed-variant text-sm mt-2">Present this code at the venue during collection hours.</p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══ COLLECTION STEP ═══ */}
        {step === 'collection' && claim && (
          <CollectionMethods claim={claim} venue={venue} onCourierBooked={handleCourierBooked} onSelfPickupConfirmed={handleSelfPickupConfirmed} onBack={() => setStep('details')} />
        )}

        {/* ═══ CONFIRMATION STEP ═══ */}
        {step === 'confirmation' && confirmationData && (
          <div className="space-y-8">
            {/* Courier Confirmation */}
            {confirmationData.type === 'courier' && confirmationData.booking && (
              <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-8 md:p-12">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-primary">Payment Successful!</h3>
                  <p className="text-on-secondary-container text-sm mt-2">Your {confirmationData.service || 'courier'} has been booked.</p>
                </div>
                <div className="bg-surface-container-low rounded-xl divide-y divide-outline-variant/10">
                  {confirmationData.booking.tracking_number && (
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60">Tracking Number</p>
                        <p className="font-headline font-bold text-primary mt-0.5">{confirmationData.booking.tracking_number}</p>
                      </div>
                      <button onClick={() => copyToClipboard(confirmationData.booking!.tracking_number, 'tracking')}
                        className="flex items-center gap-1 text-xs font-bold text-surface-tint hover:underline">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        {copiedField === 'tracking' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60">Booking ID</p>
                      <p className="font-headline font-bold text-primary mt-0.5">{confirmationData.booking.booking_id}</p>
                    </div>
                    <button onClick={() => copyToClipboard(confirmationData.booking!.booking_id, 'booking')}
                      className="flex items-center gap-1 text-xs font-bold text-surface-tint hover:underline">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copiedField === 'booking' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {confirmationData.service && (
                    <div className="px-5 py-4">
                      <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60">Service</p>
                      <p className="font-headline font-bold text-primary mt-0.5">{confirmationData.service}</p>
                      {confirmationData.estimatedDelivery && <p className="text-xs text-on-secondary-container mt-0.5">Est. delivery: {confirmationData.estimatedDelivery}</p>}
                    </div>
                  )}
                </div>
                <div className="mt-6 bg-surface-container-low rounded-xl p-4 text-center">
                  <p className="text-xs text-on-secondary-container">A confirmation email has been sent to you.</p>
                </div>
              </div>
            )}

            {/* Self Pickup Confirmation */}
            {confirmationData.type === 'self_pickup' && (
              <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-8 md:p-12">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-primary">Payment Successful!</h3>
                  <p className="text-on-secondary-container text-sm mt-2">Visit the venue to collect your item.</p>
                </div>
                <div className="bg-surface-container-low rounded-xl divide-y divide-outline-variant/10">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60">Pickup Code</p>
                      <p className="font-headline text-2xl font-bold text-primary tracking-widest mt-0.5">{confirmationData.pickupCode}</p>
                    </div>
                    {confirmationData.pickupCode && (
                      <button onClick={() => copyToClipboard(confirmationData.pickupCode!, 'pickup')}
                        className="flex items-center gap-1 text-xs font-bold text-surface-tint hover:underline">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        {copiedField === 'pickup' ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] uppercase tracking-widest text-on-secondary-container/60">Collection Method</p>
                    <p className="font-headline font-bold text-primary mt-0.5">Self Pickup</p>
                    <p className="text-xs text-on-secondary-container mt-0.5">Present this code and a valid photo ID at the venue</p>
                  </div>
                </div>
                {venue.collection_hours && (
                  <div className="mt-6 bg-surface-container-low rounded-xl p-4">
                    <h5 className="font-headline font-bold text-primary mb-2 text-sm">Collection Hours</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(venue.collection_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize text-on-surface">{day}:</span>
                          <span className="text-on-surface">{hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <VenueReviewPrompt venue={venue} />

            <div className="text-center pt-2">
              <button onClick={handleCheckAnother}
                className="py-3 px-8 bg-white text-on-secondary-container border border-outline-variant/20 rounded-full font-headline font-bold text-sm hover:bg-surface-container-low transition-colors active:scale-95">
                Check Another Claim
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/70 backdrop-blur-sm p-4" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <button onClick={() => setLightboxImage(null)} className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg hover:bg-surface-container-low z-10">
              <span className="material-symbols-outlined text-2xl text-on-surface">close</span>
            </button>
            <img src={lightboxImage} alt="Item" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </main>
  );
}
