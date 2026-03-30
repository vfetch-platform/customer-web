'use client';

import { useState } from 'react';
import { customerApi } from '@/lib/api';
import { Venue, Claim } from '@/types';
import CollectionMethods from './CollectionMethods';
import { ClaimStep, ALL_CLAIM_STEPS, CLIPBOARD_FEEDBACK_MS } from '@/constants/claimSteps';
import { STORAGE_KEY_CLAIM_ID, STORAGE_KEY_CLAIM_RESULT } from '@/constants/storage';
import { PLATFORM_FEE } from '@/constants/fees';

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
    if (!claimId.trim()) { setError('Please enter a Claim ID to check your claim status.'); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await customerApi.getClaimStatus(claimId.trim());
      setClaim(response.data);
      sessionStorage.setItem(STORAGE_KEY_CLAIM_RESULT, JSON.stringify(response.data));
      setStep('details');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 422) setError('Invalid Claim ID. Please check your Claim ID and try again.');
      else if (status === 404) setError('Claim not found. Please check your Claim ID and try again.');
      else setError(err.normalizedMessage || 'Something went wrong. Please try again.');
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

  const getStatusMaterialIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'approved': return claim?.payment_status === 'completed' ? 'inventory_2' : 'check_circle';
      case 'rejected': return 'cancel';
      case 'collected': return 'check_circle';
      case 'expired': return 'timer_off';
      default: return 'schedule';
    }
  };

  const getStatusIconColor = (status: string) => {
    if (status === 'approved' && claim?.payment_status === 'completed') return 'text-surface-tint';
    switch (status) {
      case 'pending': return 'text-tertiary-fixed-dim';
      case 'approved': return 'text-tertiary-fixed';
      case 'rejected': return 'text-error';
      case 'collected': return 'text-surface-tint';
      case 'expired': return 'text-outline';
      default: return 'text-outline';
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'approved' && claim?.payment_status === 'completed') return 'Ready for Collection';
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'rejected': return 'Claim Rejected';
      case 'collected': return 'Item Collected';
      case 'expired': return 'Claim Expired';
      default: return status;
    }
  };

  const getStatusDescription = (status: string) => {
    if (status === 'approved' && claim?.payment_status === 'completed') return 'Payment received! Collect your item from the venue using the details below.';
    switch (status) {
      case 'pending': return 'Your claim is being reviewed by the venue staff. You will receive an email once approved.';
      case 'approved': return 'Great! Your claim has been approved. Choose how you would like to collect your item.';
      case 'rejected': return 'Unfortunately, your claim was not approved. Please contact the venue if you believe this is an error.';
      case 'collected': return 'Your item has been successfully collected. Thank you for using our service!';
      case 'expired': return 'Your claim has expired. Please submit a new claim if you still need to collect your item.';
      default: return '';
    }
  };

  const isApproved = claim?.status === 'approved';
  const visibleSteps = isApproved ? ALL_CLAIM_STEPS : ALL_CLAIM_STEPS.slice(0, 2);
  const stepIndex = visibleSteps.findIndex((s) => s.key === step);

  return (
    <main className="pt-32 pb-20 px-6 min-h-screen flex flex-col items-center">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-primary-container/10 to-transparent blur-3xl -z-10 rounded-full" />

      <div className="w-full max-w-4xl">

        {/* ═══ SEARCH STEP ═══ */}
        {step === 'search' && (
          <>
            <header className="text-center mb-12">
              <h1 className="font-headline text-5xl font-extrabold text-primary tracking-tight mb-4">Check Your Claim Status</h1>
              <p className="text-on-secondary-container text-lg max-w-xl mx-auto font-body">Enter your unique claim identifier to see real-time updates on your lost item recovery.</p>
            </header>

            <div className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-12 shadow-[0px_24px_48px_rgba(7,30,39,0.06)] mb-12">
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <label className="block text-sm font-semibold text-on-surface mb-3 ml-1">Enter your Claim ID</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-grow">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">fingerprint</span>
                    <input type="text" value={claimId}
                      onChange={(e) => { setClaimId(e.target.value); sessionStorage.setItem(STORAGE_KEY_CLAIM_ID, e.target.value); }}
                      placeholder="e.g. VF-2024-8892"
                      className="w-full pl-12 pr-4 py-4 rounded-full bg-surface-container-low border-none ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-surface-tint focus:bg-white transition-all text-on-surface placeholder:text-outline/60"
                      required />
                  </div>
                  <button type="submit" disabled={loading}
                    className="bg-gradient-to-r from-primary to-primary-container text-white px-10 py-4 rounded-full font-headline font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50">
                    {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto" /> : 'Check Status'}
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-8 max-w-2xl mx-auto flex items-center gap-3 p-4 bg-error-container rounded-xl">
                  <span className="material-symbols-outlined text-on-error-container">error</span>
                  <p className="text-on-error-container text-sm">{error}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ DETAILS STEP ═══ */}
        {step === 'details' && claim && (
          <div className="space-y-8">
            {/* Back */}
            <button type="button" onClick={() => { setClaim(null); setError(null); setStep('search'); sessionStorage.removeItem(STORAGE_KEY_CLAIM_RESULT); }}
              className="inline-flex items-center text-sm text-on-secondary-container hover:text-primary font-headline font-bold gap-1">
              <span className="material-symbols-outlined text-lg">arrow_back</span> Back to search
            </button>

            {/* Claim header card */}
            <div className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-12 shadow-[0px_24px_48px_rgba(7,30,39,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center">
                    <span className={`material-symbols-outlined text-4xl ${getStatusIconColor(claim.status)}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {getStatusMaterialIcon(claim.status)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-xl text-primary leading-none">{claim.item?.title || 'Your Item'}</h3>
                    <p className="text-on-secondary-container text-sm mt-1">Claim ID: {claim.id}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase ${
                  claim.status === 'approved' && claim.payment_status !== 'completed'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : claim.status === 'pending'
                    ? 'bg-surface-container-high text-on-surface'
                    : claim.status === 'rejected' || claim.status === 'expired'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-tertiary-fixed text-on-tertiary-fixed'
                }`}>
                  {getStatusText(claim.status)}
                </div>
              </div>

              {/* Status description */}
              <p className="text-on-secondary-container mb-8">{getStatusDescription(claim.status)}</p>

              {/* Progress Stepper */}
              <div className="relative">
                <div className="absolute top-5 left-0 w-full h-[2px] bg-outline-variant/20 -z-0 hidden md:block" />
                <div className={`grid grid-cols-1 md:grid-cols-${visibleSteps.length} gap-8 relative z-10`}>
                  {visibleSteps.map((s, i) => {
                    const isCompleted = i < stepIndex;
                    const isActive = s.key === step;
                    const isUpcoming = i > stepIndex;
                    return (
                      <div key={s.key} className={`flex flex-col items-start md:items-center text-left md:text-center group ${isUpcoming ? 'opacity-50' : ''}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ring-8 ring-surface-container-lowest transition-transform group-hover:scale-110 ${
                          isCompleted ? 'bg-tertiary-fixed text-on-tertiary-fixed' :
                          isActive ? 'bg-surface-tint text-white animate-pulse shadow-lg shadow-surface-tint/30' :
                          'bg-surface-container-highest text-outline'
                        }`}>
                          <span className="material-symbols-outlined text-xl">
                            {isCompleted ? 'check_circle' : isActive ? 'radio_button_checked' : 'circle'}
                          </span>
                        </div>
                        <h4 className="font-headline font-bold text-sm text-primary mb-1">{s.label}</h4>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Claim details grid */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Created</p>
                  <p className="font-headline font-bold text-primary">{new Date(claim.created_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Expires</p>
                  <p className="font-headline font-bold text-primary">{new Date(claim.expires_at).toLocaleDateString()}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Payment</p>
                  <p className={`font-headline font-bold capitalize ${
                    claim.payment_status === 'completed' ? 'text-on-tertiary-fixed-variant' :
                    claim.payment_status === 'failed' ? 'text-error' : 'text-primary'
                  }`}>{claim.payment_status}</p>
                </div>
                {claim.payment_status !== 'completed' && (
                  <div className="bg-surface-container-low rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Platform Fee</p>
                    <p className="font-headline font-bold text-primary">&pound;{PLATFORM_FEE.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Item Details */}
            {claim.item && (
              <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow">
                <h4 className="font-headline text-lg font-bold text-primary mb-6">Item Details</h4>
                <div className="flex flex-col md:flex-row gap-6">
                  {claim.item.images && claim.item.images.length > 0 && (
                    <div className="md:w-1/3">
                      <img src={claim.item.images[0]} alt={claim.item.title}
                        className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxImage(claim.item!.images[0])} />
                      {claim.item.images.length > 1 && (
                        <div className="flex gap-2 mt-2">
                          {claim.item.images.slice(1).map((img, i) => (
                            <img key={i} src={img} alt={`${claim.item!.title} ${i + 2}`}
                              className="w-14 h-14 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setLightboxImage(img)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <h5 className="font-headline text-lg font-bold text-primary mb-2">{claim.item.title}</h5>
                    <p className="text-on-secondary-container mb-4">{claim.item.description}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-on-secondary-container">
                        <span className="material-symbols-outlined text-surface-tint text-lg">category</span>
                        <span className="capitalize">{claim.item.category}</span>
                      </div>
                      {claim.item.color && (
                        <div className="flex items-center gap-2 text-on-secondary-container">
                          <span className="material-symbols-outlined text-surface-tint text-lg">palette</span>
                          <span className="capitalize">{claim.item.color}</span>
                        </div>
                      )}
                      {claim.item.brand && (
                        <div className="flex items-center gap-2 text-on-secondary-container">
                          <span className="material-symbols-outlined text-surface-tint text-lg">sell</span>
                          <span>{claim.item.brand}</span>
                        </div>
                      )}
                      {claim.item.location_found && (
                        <div className="flex items-center gap-2 text-on-secondary-container">
                          <span className="material-symbols-outlined text-surface-tint text-lg">location_on</span>
                          <span>{claim.item.location_found}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-on-secondary-container">
                        <span className="material-symbols-outlined text-surface-tint text-lg">calendar_today</span>
                        <span>{new Date(claim.item.date_found).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Collection Methods */}
            {claim.status === 'approved' && claim.payment_status !== 'completed' && (
              <CollectionMethods claim={claim} venue={venue} onCourierBooked={handleCourierBooked} onSelfPickupConfirmed={handleSelfPickupConfirmed} />
            )}

            {/* Delivery Tracking */}
            {claim.collection_method && claim.collection_method !== 'self_pickup' && claim.delivery_tracking && (
              <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-surface-tint text-2xl">local_shipping</span>
                  <h4 className="font-headline text-lg font-bold text-primary">Delivery Tracking</h4>
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
            {(claim.status === 'approved' || claim.status === 'collected') && claim.payment_status === 'completed' && claim.collection_method === 'self_pickup' && claim.pickup_code && (
              <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow">
                <h4 className="font-headline text-lg font-bold text-primary mb-4">Pickup Information</h4>
                <div className="bg-tertiary-fixed/10 rounded-xl p-6">
                  <p className="font-headline text-lg font-bold text-on-tertiary-fixed-variant">
                    Your Pickup Code: <span className="font-headline text-2xl tracking-wider">{claim.pickup_code}</span>
                  </p>
                  <p className="text-on-tertiary-fixed-variant text-sm mt-2">Present this code at the venue during collection hours to collect your item.</p>
                </div>
              </div>
            )}

            {/* Venue Details — after payment */}
            {(claim.status === 'approved' || claim.status === 'collected') && claim.payment_status === 'completed' && (
              <div className="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-surface-tint text-2xl">location_on</span>
                  <h4 className="font-headline text-lg font-bold text-primary">Venue Details</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3"><span className="material-symbols-outlined text-surface-tint mt-0.5">apartment</span>
                    <div><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Venue</p><p className="font-headline font-bold text-primary">{venue.name}</p></div>
                  </div>
                  <div className="flex items-start gap-3"><span className="material-symbols-outlined text-surface-tint mt-0.5">location_on</span>
                    <div><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Address</p><p className="font-headline font-bold text-primary">{venue.address}</p></div>
                  </div>
                  {venue.phone && (
                    <div className="flex items-start gap-3"><span className="material-symbols-outlined text-surface-tint mt-0.5">call</span>
                      <div><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Phone</p><a href={`tel:${venue.phone}`} className="font-bold text-surface-tint hover:underline">{venue.phone}</a></div>
                    </div>
                  )}
                  {venue.email && (
                    <div className="flex items-start gap-3"><span className="material-symbols-outlined text-surface-tint mt-0.5">mail</span>
                      <div><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Email</p><a href={`mailto:${venue.email}`} className="font-bold text-surface-tint hover:underline">{venue.email}</a></div>
                    </div>
                  )}
                </div>
                {venue.collection_hours && (
                  <div className="mt-6 bg-surface-container-low rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-surface-tint">schedule</span>
                      <p className="font-headline font-bold text-primary">Collection Hours</p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {Object.entries(venue.collection_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize font-medium text-on-surface">{day}</span>
                          <span className={hours.closed ? 'text-error font-medium' : 'text-on-surface font-medium'}>
                            {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bento info section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-surface-container-low rounded-[2rem] p-8 flex flex-col justify-between">
                <div>
                  <span className="text-surface-tint font-bold text-xs uppercase tracking-widest mb-4 block">Quick Help</span>
                  <h3 className="font-headline text-2xl font-bold text-primary mb-4 leading-tight">Need to update your collection method?</h3>
                  <p className="text-on-secondary-container font-body leading-relaxed max-w-md">You can switch between In-Person Pickup and Premium Courier Delivery before completing your payment.</p>
                </div>
                {claim.status === 'approved' && claim.payment_status !== 'completed' && (
                  <button onClick={() => setStep('collection')} className="mt-8 text-primary font-bold flex items-center gap-2 hover:gap-4 transition-all w-fit font-headline">
                    Manage Options <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                )}
              </div>
              <div className="bg-primary text-white rounded-[2rem] p-8 flex flex-col items-center justify-center text-center overflow-hidden relative">
                <div className="relative z-10">
                  <span className="material-symbols-outlined text-5xl mb-4 text-tertiary-fixed">headset_mic</span>
                  <h4 className="font-headline font-bold text-lg mb-2">Concierge Support</h4>
                  <p className="text-on-primary-container text-sm font-body mb-6">Available 24/7 for high-priority claims.</p>
                  <button className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-xs font-bold transition-colors backdrop-blur-md">Chat Now</button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button onClick={handleCheckAnother}
                className="flex-1 py-3 px-4 bg-secondary-container text-on-secondary-container rounded-full font-headline font-bold hover:bg-surface-container-high transition-colors">
                Check Another Claim
              </button>
              {claim.status === 'approved' && !claim.collection_method && claim.payment_status !== 'completed' && (
                <button onClick={() => setStep('collection')}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-headline font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10">
                  Choose Collection Method
                </button>
              )}
            </div>
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
              <div className="bg-surface-container-lowest rounded-[2rem] editorial-shadow p-8 md:p-12">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-tertiary-fixed/20 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-primary">Payment Successful!</h3>
                  <p className="text-on-secondary-container text-sm mt-2">Your {confirmationData.service || 'courier'} has been booked. Here are your details:</p>
                </div>
                <div className="bg-surface-container-low rounded-xl divide-y divide-outline-variant/10">
                  {confirmationData.booking.tracking_number && (
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Tracking Number</p>
                        <p className="font-headline font-bold text-primary mt-0.5">{confirmationData.booking.tracking_number}</p>
                      </div>
                      <button onClick={() => copyToClipboard(confirmationData.booking!.tracking_number, 'tracking')}
                        className="flex items-center gap-1 text-xs font-bold text-surface-tint hover:underline px-2 py-1 rounded">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        {copiedField === 'tracking' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Booking ID</p>
                      <p className="font-headline font-bold text-primary mt-0.5">{confirmationData.booking.booking_id}</p>
                    </div>
                    <button onClick={() => copyToClipboard(confirmationData.booking!.booking_id, 'booking')}
                      className="flex items-center gap-1 text-xs font-bold text-surface-tint hover:underline px-2 py-1 rounded">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copiedField === 'booking' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Payment Reference</p>
                      <p className="text-sm font-medium text-on-secondary-container mt-0.5 truncate max-w-[220px]" title={confirmationData.booking.payment_intent_id}>{confirmationData.booking.payment_intent_id}</p>
                    </div>
                    <button onClick={() => copyToClipboard(confirmationData.booking!.payment_intent_id, 'payment')}
                      className="flex items-center gap-1 text-xs font-bold text-surface-tint hover:underline px-2 py-1 rounded">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copiedField === 'payment' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {confirmationData.service && (
                    <div className="px-5 py-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Service</p>
                      <p className="font-headline font-bold text-primary mt-0.5">{confirmationData.service}</p>
                      {confirmationData.estimatedDelivery && <p className="text-xs text-on-secondary-container mt-0.5">Est. delivery: {confirmationData.estimatedDelivery}</p>}
                    </div>
                  )}
                </div>
                <div className="mt-6 bg-surface-container-low rounded-xl p-4 text-center">
                  <p className="text-xs text-on-secondary-container">A confirmation email with these details has been sent to you. You can also track your delivery using the tracking number above.</p>
                </div>
              </div>
            )}

            {/* Self Pickup Confirmation */}
            {confirmationData.type === 'self_pickup' && (
              <div className="bg-surface-container-lowest rounded-[2rem] editorial-shadow p-8 md:p-12">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 bg-tertiary-fixed/20 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-primary">Payment Successful!</h3>
                  <p className="text-on-secondary-container text-sm mt-2">Your self-pickup has been confirmed. Visit the venue to collect your item.</p>
                </div>
                <div className="bg-surface-container-low rounded-xl divide-y divide-outline-variant/10">
                  {confirmationData.paymentIntentId && (
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Payment Reference</p>
                        <p className="text-sm font-medium text-on-secondary-container mt-0.5 truncate max-w-[220px]" title={confirmationData.paymentIntentId}>{confirmationData.paymentIntentId}</p>
                      </div>
                      <button onClick={() => copyToClipboard(confirmationData.paymentIntentId!, 'payment')}
                        className="flex items-center gap-1 text-xs font-bold text-surface-tint hover:underline px-2 py-1 rounded">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        {copiedField === 'payment' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Pickup Code</p>
                      <p className="font-headline text-2xl font-bold text-primary tracking-widest mt-0.5">{confirmationData.pickupCode}</p>
                    </div>
                    {confirmationData.pickupCode && (
                      <button onClick={() => copyToClipboard(confirmationData.pickupCode!, 'pickup')}
                        className="flex items-center gap-1 text-xs font-bold text-surface-tint hover:underline px-2 py-1 rounded">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        {copiedField === 'pickup' ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Collection Method</p>
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
                <div className="mt-4 bg-surface-container-low rounded-xl p-4 text-center">
                  <p className="text-xs text-on-secondary-container">A confirmation email with these details has been sent to you.</p>
                </div>
              </div>
            )}

            {/* Check Another */}
            <div className="text-center pt-2">
              <button onClick={handleCheckAnother}
                className="py-3 px-8 bg-secondary-container text-on-secondary-container rounded-full font-headline font-bold hover:bg-surface-container-high transition-colors active:scale-95">
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
