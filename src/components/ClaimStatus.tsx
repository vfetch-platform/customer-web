'use client';

import { useState } from 'react';
import { customerApi } from '@/lib/api';
import { Venue, Claim } from '@/types';
import CollectionMethods from './CollectionMethods';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  TruckIcon,
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

// ─── Types ──────────────────────────────────────────────────

type Step = 'search' | 'details' | 'collection' | 'confirmation';

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

// ─── Step indicator labels ───────────────────────────────────

const ALL_STEPS: { key: Step; label: string }[] = [
  { key: 'search', label: 'Look Up' },
  { key: 'details', label: 'Details' },
  { key: 'collection', label: 'Collection' },
  { key: 'confirmation', label: 'Confirmed' },
];

export default function ClaimStatus({ venue }: ClaimStatusProps) {
  const [claimId, setClaimId] = useState<string>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('claimStatusId') || '' : ''
  );
  const [claim, setClaim] = useState<Claim | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('claimStatusResult');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('search');
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // ─── Helpers ────────────────────────────────────────────────

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimId.trim()) {
      setError('Please enter a Claim ID to check your claim status.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await customerApi.getClaimStatus(claimId.trim());
      setClaim(response.data);
      sessionStorage.setItem('claimStatusResult', JSON.stringify(response.data));
      setStep('details');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 422) {
        setError('Invalid Claim ID. Please check your Claim ID and try again.');
      } else if (status === 404) {
        setError('Claim not found. Please check your Claim ID and try again.');
      } else {
        setError(err.normalizedMessage || 'Something went wrong. Please try again.');
      }
      setClaim(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCourierBooked = async (
    booking: BookingResult,
    serviceName?: string,
    estimatedDelivery?: string,
  ) => {
    setConfirmationData({
      type: 'courier',
      booking,
      service: serviceName || 'Courier',
      estimatedDelivery,
    });
    setStep('confirmation');
    // Refresh claim in background
    try {
      const refreshed = await customerApi.getClaimStatus(claim!.id);
      setClaim(refreshed.data || refreshed);
    } catch { /* ignore */ }
  };

  const handleSelfPickupConfirmed = async (paymentIntentId: string) => {
    setConfirmationData({
      type: 'self_pickup',
      pickupCode: claim?.pickup_code || '',
      paymentIntentId,
    });
    setStep('confirmation');
    // Refresh claim to get pickup_code and updated status
    try {
      const refreshed = await customerApi.getClaimStatus(claim!.id);
      const refreshedClaim = refreshed.data || refreshed;
      setClaim(refreshedClaim);
      if (refreshedClaim.pickup_code) {
        setConfirmationData(prev => prev ? { ...prev, pickupCode: refreshedClaim.pickup_code } : prev);
      }
    } catch { /* ignore */ }
  };

  const handleCheckAnother = () => {
    setClaimId('');
    setClaim(null);
    setConfirmationData(null);
    setStep('search');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-8 w-8 text-yellow-500" />;
      case 'approved':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-8 w-8 text-red-500" />;
      case 'collected':
        return <CheckCircleIcon className="h-8 w-8 text-blue-500" />;
      case 'expired':
        return <XCircleIcon className="h-8 w-8 text-gray-500" />;
      default:
        return <ClockIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'approved' && claim?.payment_status === 'completed') {
      return 'Ready for Collection';
    }
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
    // If approved and payment completed, show collection-ready message
    if (status === 'approved' && claim?.payment_status === 'completed') {
      return 'Payment received! Collect your item from the venue using the details below.';
    }
    switch (status) {
      case 'pending':
        return 'Your claim is being reviewed by the venue staff. You will receive an email once approved.';
      case 'approved':
        return 'Great! Your claim has been approved. Choose how you would like to collect your item.';
      case 'rejected':
        return 'Unfortunately, your claim was not approved. Please contact the venue if you believe this is an error.';
      case 'collected':
        return 'Your item has been successfully collected. Thank you for using our service!';
      case 'expired':
        return 'Your claim has expired. Please submit a new claim if you still need to collect your item.';
      default:
        return '';
    }
  };

  // Determine which steps to show in the stepper
  const isApproved = claim?.status === 'approved';
  const visibleSteps = isApproved ? ALL_STEPS : ALL_STEPS.slice(0, 2);
  const stepIndex = visibleSteps.findIndex((s) => s.key === step);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto text-gray-900">
      <div className="bg-white rounded-lg shadow-lg p-8 text-gray-900">
        {/* ── Stepper indicator ── */}
        {claim && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {visibleSteps.map((s, i) => {
                const isCompleted = i < stepIndex;
                const isActive = s.key === step;
                return (
                  <div key={s.key} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircleIcon className="h-5 w-5" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={`text-xs mt-1 font-medium ${
                          isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < visibleSteps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 -mt-4 ${
                          i < stepIndex ? 'bg-green-400' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════ STEP 1: SEARCH ═══════════ */}
        {step === 'search' && (
          <>
            <h2 className="text-2xl font-bold text-sidebar-800 mb-6">
          Check Your Claim Status
        </h2>
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="claimId" className="block text-sm font-medium text-sidebar-600 mb-1">
                Enter your Claim ID
              </label>
              <input
                type="text"
                id="claimId"
                value={claimId}
                onChange={(e) => {
                  setClaimId(e.target.value);
                  sessionStorage.setItem('claimStatusId', e.target.value);
                }}
                placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                className="w-full px-3 py-2 border border-sidebar-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sidebar-900 placeholder-sidebar-400"
                required
              />
            </div>
            <div className="sm:pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-primary-600 text-white py-2 px-6 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    <span>Check Status</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
                <div className="flex items-center space-x-3">
                  <XCircleIcon className="h-6 w-6 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════ STEP 2: CLAIM DETAILS ═══════════ */}
        {step === 'details' && claim && (
          <div className="space-y-6">
            {/* Back to search */}
            <button
              type="button"
              onClick={() => { setClaim(null); setError(null); setStep('search'); sessionStorage.removeItem('claimStatusResult'); }}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to search
            </button>

            {/* Status Overview */}
            <div className="bg-sidebar-50 rounded-lg p-6 text-sidebar-900">
              <div className="flex items-center space-x-4 mb-4">
                {getStatusIcon(claim.status)}
                <div>
                  <h3 className="text-xl font-semibold text-sidebar-800">
                    {getStatusText(claim.status)}
                  </h3>
                  <p className="text-sidebar-500">
                    {getStatusDescription(claim.status)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-sidebar-600">
                <div><span className="font-medium text-sidebar-800">Claim ID:</span> <span className="font-mono tracking-tight text-sidebar-900">{claim.id}</span></div>
                <div><span className="font-medium text-sidebar-800">Created:</span> {new Date(claim.created_at).toLocaleDateString()}</div>
                <div><span className="font-medium text-sidebar-800">Expires:</span> {new Date(claim.expires_at).toLocaleDateString()}</div>
                <div className="flex items-center flex-wrap">
                  <span className="font-medium text-sidebar-800 mr-1">Payment Status:</span>
                  <span className={`capitalize ${
                    claim.payment_status === 'completed' ? 'text-green-600' :
                    claim.payment_status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {claim.payment_status}
                  </span>
                </div>
                {claim.payment_status !== 'completed' && (
                  <div className="md:col-span-2 text-xs text-sidebar-500">
                    A &pound;9.00 platform fee applies to all claims.
                  </div>
                )}
              </div>
            </div>

            {/* Item Details */}
            {claim.item && (
              <div className="border border-sidebar-200 rounded-lg p-6 text-sidebar-900 bg-white">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Item Details</h4>
                <div className="flex flex-col md:flex-row gap-6">
                  {claim.item.images && claim.item.images.length > 0 && (
                    <div className="md:w-1/3">
                      <img
                        src={claim.item.images[0]}
                        alt={claim.item.title}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxImage(claim.item!.images[0])}
                        title="Click to view full image"
                      />
                      {claim.item.images.length > 1 && (
                        <div className="flex gap-2 mt-2">
                          {claim.item.images.slice(1).map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt={`${claim.item!.title} ${i + 2}`}
                              className="w-14 h-14 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setLightboxImage(img)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <h5 className="text-lg font-medium text-gray-900 mb-2">
                      {claim.item.title}
                    </h5>
                    <p className="text-sidebar-500 mb-3">
                      {claim.item.description}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-sidebar-500">
                      <div><strong>Category:</strong> {claim.item.category}</div>
                      {claim.item.color && <div><strong>Color:</strong> {claim.item.color}</div>}
                      {claim.item.brand && <div><strong>Brand:</strong> {claim.item.brand}</div>}
                      {claim.item.location_found && (
                        <div><strong>Found at:</strong> {claim.item.location_found}</div>
                      )}
                      <div><strong>Date found:</strong> {new Date(claim.item.date_found).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Collection Methods - only show if approved and not yet paid */}
            {claim.status === 'approved' && claim.payment_status !== 'completed' && (
              <CollectionMethods
                claim={claim}
                venue={venue}
                onCourierBooked={handleCourierBooked}
                onSelfPickupConfirmed={handleSelfPickupConfirmed}
              />
            )}

            {/* Delivery Tracking - only show if courier method selected */}
            {claim.collection_method && claim.collection_method !== 'self_pickup' && claim.delivery_tracking && (
              <div className="border border-sidebar-200 rounded-lg p-6 text-sidebar-900 bg-white">
                <div className="flex items-center space-x-2 mb-4">
                  <TruckIcon className="h-6 w-6 text-primary-600" />
                  <h4 className="text-lg font-semibold text-sidebar-800">Delivery Tracking</h4>
                </div>
                <div className="bg-primary-50 rounded-lg p-4">
                  <p className="text-primary-800 font-medium">
                    Tracking Number: {claim.delivery_tracking}
                  </p>
                  <p className="text-primary-600 text-sm mt-1">
                    Collection Method: {claim.collection_method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </p>
                </div>
              </div>
            )}

            {/* Pickup Code — if self pickup already arranged */}
            {(claim.status === 'approved' || claim.status === 'collected') && claim.payment_status === 'completed' && claim.collection_method === 'self_pickup' && claim.pickup_code && (
              <div className="border border-sidebar-200 rounded-lg p-6 text-sidebar-900 bg-white">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Pickup Information</h4>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-green-800 font-medium text-lg">
                    Your Pickup Code: <span className="font-mono text-xl">{claim.pickup_code}</span>
                  </p>
                  <p className="text-green-600 text-sm mt-2">
                    Present this code at the venue during collection hours to collect your item.
                  </p>
                </div>
              </div>
            )}

            {/* Venue Details — shown after payment is completed */}
            {(claim.status === 'approved' || claim.status === 'collected') && claim.payment_status === 'completed' && (
              <div className="border-2 border-green-300 rounded-xl p-6 bg-green-50/50">
                <div className="flex items-center space-x-2 mb-4">
                  <MapPinIcon className="h-6 w-6 text-green-700" />
                  <h4 className="text-lg font-semibold text-green-900">Venue Details</h4>
                </div>
                <div className="bg-white rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</p>
                      <p className="font-semibold text-gray-900">{venue.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPinIcon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                      <p className="font-semibold text-gray-900">{venue.address}</p>
                    </div>
                  </div>
                  {venue.phone && (
                    <div className="flex items-start space-x-3">
                      <PhoneIcon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                        <a href={`tel:${venue.phone}`} className="font-semibold text-blue-600 hover:underline">{venue.phone}</a>
                      </div>
                    </div>
                  )}
                  {venue.email && (
                    <div className="flex items-start space-x-3">
                      <EnvelopeIcon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                        <a href={`mailto:${venue.email}`} className="font-semibold text-blue-600 hover:underline">{venue.email}</a>
                      </div>
                    </div>
                  )}
                  {venue.website && (
                    <div className="flex items-start space-x-3">
                      <GlobeAltIcon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Website</p>
                        <a href={venue.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">{venue.website}</a>
                      </div>
                    </div>
                  )}
                </div>
                {venue.collection_hours && (
                  <div className="mt-4 bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <ClockIcon className="h-5 w-5 text-green-700" />
                      <p className="font-semibold text-green-900">Collection Hours</p>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {Object.entries(venue.collection_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize font-medium text-gray-700">{day}</span>
                          <span className={hours.closed ? 'text-red-500 font-medium' : 'text-gray-900 font-medium'}>
                            {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCheckAnother}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
              >
                Check Another Claim
              </button>
              {claim.status === 'approved' && !claim.collection_method && claim.payment_status !== 'completed' && (
                <button
                  onClick={() => setStep('collection')}
                  className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Choose Collection Method
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: COLLECTION ═══════════ */}
        {step === 'collection' && claim && (
          <CollectionMethods
            claim={claim}
            venue={venue}
            onCourierBooked={handleCourierBooked}
            onSelfPickupConfirmed={handleSelfPickupConfirmed}
            onBack={() => setStep('details')}
          />
        )}

        {/* ═══════════ STEP 4: CONFIRMATION ═══════════ */}
        {step === 'confirmation' && confirmationData && (
          <div className="space-y-6">
            {/* Courier Confirmation */}
            {confirmationData.type === 'courier' && confirmationData.booking && (
              <div className="bg-white border-2 border-green-300 rounded-xl shadow-lg p-6">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="bg-green-100 rounded-full p-3 mb-3">
                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Your {confirmationData.service || 'courier'} has been booked. Here are your details:
                  </p>
                </div>

                {/* Booking Details */}
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                  {/* Tracking Number */}
                  {confirmationData.booking.tracking_number && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking Number</p>
                        <p className="text-base font-semibold text-gray-900 font-mono mt-0.5">{confirmationData.booking.tracking_number}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(confirmationData.booking!.tracking_number, 'tracking')}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        {copiedField === 'tracking' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}

                  {/* Booking ID */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</p>
                      <p className="text-sm font-medium text-gray-900 font-mono mt-0.5">{confirmationData.booking.booking_id}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(confirmationData.booking!.booking_id, 'booking')}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      {copiedField === 'booking' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {/* Payment Reference */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Reference</p>
                      <p className="text-sm font-medium text-gray-700 font-mono mt-0.5 truncate max-w-[220px]" title={confirmationData.booking.payment_intent_id}>
                        {confirmationData.booking.payment_intent_id}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(confirmationData.booking!.payment_intent_id, 'payment')}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      {copiedField === 'payment' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {/* Service */}
                  {confirmationData.service && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Service</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{confirmationData.service}</p>
                      {confirmationData.estimatedDelivery && (
                        <p className="text-xs text-gray-500 mt-0.5">Est. delivery: {confirmationData.estimatedDelivery}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-800 text-center">
                    A confirmation email with these details has been sent to you.
                    You can also track your delivery using the tracking number above.
                  </p>
                </div>
              </div>
            )}

            {/* Self Pickup Confirmation */}
            {confirmationData.type === 'self_pickup' && (
              <div className="bg-white border-2 border-green-300 rounded-xl shadow-lg p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="bg-green-100 rounded-full p-3 mb-3">
                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Your self-pickup has been confirmed. Visit the venue to collect your item.
                  </p>
                </div>

                {/* Payment & Pickup Details */}
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                  {/* Payment Reference */}
                  {confirmationData.paymentIntentId && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Reference</p>
                        <p className="text-sm font-medium text-gray-700 font-mono mt-0.5 truncate max-w-[220px]" title={confirmationData.paymentIntentId}>
                          {confirmationData.paymentIntentId}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(confirmationData.paymentIntentId!, 'payment')}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        {copiedField === 'payment' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}

                  {/* Pickup Code */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup Code</p>
                      <p className="text-lg font-bold font-mono text-green-800 tracking-widest mt-0.5">
                        {confirmationData.pickupCode}
                      </p>
                    </div>
                    {confirmationData.pickupCode && (
                      <button
                        onClick={() => copyToClipboard(confirmationData.pickupCode!, 'pickup')}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        {copiedField === 'pickup' ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>

                  {/* Collection Method */}
                  <div className="px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Method</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">Self Pickup</p>
                    <p className="text-xs text-gray-500 mt-0.5">Present this code and a valid photo ID at the venue</p>
                  </div>
                </div>

                {venue.collection_hours && (
                  <div className="mt-4 border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2 text-sm">Collection Hours</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {Object.entries(venue.collection_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize">{day}:</span>
                          <span>
                            {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Venue Details */}
                <div className="mt-4 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2 text-sm">Venue Details</h5>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>
                      <span className="font-medium text-gray-900">Name:</span> {venue.name}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Address:</span> {venue.address}
                    </div>
                    {venue.phone && (
                      <div>
                        <span className="font-medium text-gray-900">Phone:</span>{' '}
                        <a href={`tel:${venue.phone}`} className="text-blue-600 hover:underline">{venue.phone}</a>
                      </div>
                    )}
                    {venue.email && (
                      <div>
                        <span className="font-medium text-gray-900">Email:</span>{' '}
                        <a href={`mailto:${venue.email}`} className="text-blue-600 hover:underline">{venue.email}</a>
                      </div>
                    )}
                    {venue.website && (
                      <div>
                        <span className="font-medium text-gray-900">Website:</span>{' '}
                        <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{venue.website}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-800 text-center">
                    A confirmation email with these details has been sent to you.
                  </p>
                </div>
              </div>
            )}

            {/* Check Another button */}
            <div className="text-center pt-2">
              <button
                onClick={handleCheckAnother}
                className="py-2.5 px-6 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
              >
                Check Another Claim
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 z-10"
            >
              <XCircleIcon className="h-7 w-7 text-gray-700" />
            </button>
            <img
              src={lightboxImage}
              alt="Item"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}