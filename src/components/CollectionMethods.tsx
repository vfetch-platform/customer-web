'use client';

import { useState } from 'react';
import { customerApi } from '@/lib/api';
import { Venue, Claim, CourierQuote } from '@/types';
import CourierAddressForm, { AddressFormValues } from './CourierAddressForm';
import CourierPayment from './CourierPayment';
import SelfPickupPayment from './SelfPickupPayment';
import { 
  UserIcon,
  TruckIcon,
  MapPinIcon,
  CurrencyPoundIcon,
  ClockIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  BoltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

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
const PLATFORM_FEE=9.99; // Flat platform fee for all courier bookings, can be moved to config later
export default function CollectionMethods({ claim, venue, onCourierBooked, onSelfPickupConfirmed, onBack }: CollectionMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<'self_pickup' | 'parcel2go' | 'uber_courier' | null>(null);
  // Raw delivery address string used for API calls (assembled from form for parcel2go or textarea for uber)
  const [deliveryAddress, setDeliveryAddress] = useState('');
  // Address form structured values (only for parcel2go - Standard Courier)
  const [addressFormData, setAddressFormData] = useState<AddressFormValues | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [itemValue, setItemValue] = useState<string>('');
  const [quotes, setQuotes] = useState<CourierQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<CourierQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  // Self-pickup payment flow state
  const [showSelfPickupPayment, setShowSelfPickupPayment] = useState(false);
  // Payment flow state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentQuote, setPaymentQuote] = useState<CourierQuote | null>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<{
    courierCost: number;
    platformFee: number;
    total: number;
  } | null>(null);


  const handleMethodSelect = (method: 'self_pickup' | 'parcel2go' | 'uber_courier') => {
    setSelectedMethod(method);
    setError(null);
    setSuccess(null);
    setQuotes([]);
    setSelectedQuote(null);
    if (method === 'self_pickup') {
      // Reset address data only when going back to self pickup
      setAddressFormData(null);
      setIsEditingAddress(false);
      setSubmittingAddress(false);
      setDeliveryAddress('');
    }
  };

  const handleGetQuotes = async () => {
    const parsedValue = parseFloat(itemValue);
    if (!deliveryAddress.trim() || isNaN(parsedValue) || parsedValue <= 0) {
      setError('Please provide delivery address and a valid item value');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First validate the address
      await customerApi.validateAddress(deliveryAddress);

      // Get courier quotes
      const response = await customerApi.getCourierQuotes(claim.id, deliveryAddress, parsedValue);
      setQuotes(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error getting quotes. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookCourier = async (quote: CourierQuote) => {
    setError(null);

    try {
      // Fetch fee breakdown first, then show payment UI
      setLoading(true);
      const breakdownRes = await customerApi.getCourierFeeBreakdown(claim.id, quote.price);
      setFeeBreakdown(breakdownRes.data);
      setPaymentQuote(quote);
      setSelectedQuote(quote);
      setShowPayment(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error preparing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (booking: BookingResult) => {
    setTrackingNumber(booking.tracking_number);
    setShowPayment(false);
    onCourierBooked?.(booking, paymentQuote?.service, paymentQuote?.estimated_delivery);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setPaymentQuote(null);
    setFeeBreakdown(null);
  };

  const handleSelfPickup = () => {
    setError(null);
    setShowSelfPickupPayment(true);
  };

  const handleSelfPickupPaymentSuccess = (paymentIntentId: string) => {
    setShowSelfPickupPayment(false);
    onSelfPickupConfirmed?.(paymentIntentId);
  };

  const handleSelfPickupPaymentCancel = () => {
    setShowSelfPickupPayment(false);
  };

  // Build initial values for the address form, pre-filling from claim customer info
  const getAddressFormInitialValue = (): Partial<AddressFormValues> => {
    if (isEditingAddress && addressFormData) {
      return addressFormData;
    }
    return {
      fullName: claim.customer_name || '',
      email: claim.customer_email || '',
      phone: claim.customer_phone || '',
    };
  };

  const handleAddressSubmit = (vals: AddressFormValues) => {
    setSubmittingAddress(true);
    setTimeout(() => {
      setAddressFormData(vals);
      setIsEditingAddress(false);
      // Build UK style multi-line address string matching backend parseAddress expectations
      let postcode = (vals.postalCode || '').trim();
      if (postcode) {
        const compact = postcode.replace(/\s+/g, '').toUpperCase();
        if (/^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/.test(compact)) {
          postcode = `${compact.slice(0, compact.length - 3)} ${compact.slice(-3)}`;
        } else {
          postcode = vals.postalCode || '';
        }
      }
      const segments: string[] = [];
      if (vals.address1) segments.push(vals.address1.trim());
      if (vals.address2) segments.push(vals.address2.trim());
      if (vals.city) segments.push(vals.city.trim());
      if (postcode) segments.push(postcode);
      const formatted = segments.join(', ');
      setDeliveryAddress(formatted);
      setSubmittingAddress(false);
    }, 300);
  };

  const parsedItemValue = parseFloat(itemValue);
  const isItemValueValid = !isNaN(parsedItemValue) && parsedItemValue > 0;

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-gray-900">Choose Collection Method</h4>
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Back to details
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Back to method selection from courier details */}
      {selectedMethod && selectedMethod !== 'self_pickup' && (
        <button
          type="button"
          onClick={() => {
            setSelectedMethod(null);
            setQuotes([]);
            setSelectedQuote(null);
            setError(null);
          }}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to collection methods
        </button>
      )}

      {!selectedMethod && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Option 1: Self Pickup */}
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
              selectedMethod === 'self_pickup'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleMethodSelect('self_pickup')}
          >
            <div className="flex items-center space-x-3 mb-3">
              <UserIcon className="h-8 w-8 text-blue-600" />
              <h5 className="text-lg font-medium text-gray-900">Collect Yourself</h5>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Pick up your item directly from the venue using your pickup code
            </p>
            <div className="text-sm text-gray-500">
              <p><strong>Cost:</strong> Free</p>
              <p><strong>Time:</strong> During venue hours</p>
            </div>
          </div>

          {/* Option 2: Parcel2Go */}
          <div
            className="border-2 rounded-lg p-4 cursor-pointer transition-colors border-gray-200 hover:border-gray-300"
            onClick={() => handleMethodSelect('parcel2go')}
          >
            <div className="flex items-center space-x-3 mb-3">
              <TruckIcon className="h-8 w-8 text-green-600" />
              <h5 className="text-lg font-medium text-gray-900">Standard Courier</h5>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Professional courier service with tracking and insurance
            </p>
            <div className="text-sm text-gray-500">
              <p><strong>Cost:</strong> Varies by location</p>
              <p><strong>Time:</strong> 1-3 business days</p>
            </div>
          </div>
          <div
            className="border-2 rounded-lg p-4 cursor-pointer transition-colors border-gray-200 hover:border-gray-300"
            onClick={() => handleMethodSelect('uber_courier')}
          >
            <div className="flex items-center space-x-3 mb-3">
              <MapPinIcon className="h-8 w-8 text-purple-600" />
              <h5 className="text-lg font-medium text-gray-900">Express Local</h5>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Fast local delivery within the same city
            </p>
            <div className="text-sm text-gray-500">
              <p><strong>Cost:</strong> Local rates apply</p>
              <p><strong>Time:</strong> Same day/next day</p>
            </div>
          </div>
          <div className="border-2 border-gray-100 rounded-lg p-4 opacity-60 cursor-not-allowed relative">
          <span className="absolute top-3 right-3 bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Coming Soon
          </span>
          <div className="flex items-center space-x-3 mb-3">
            <BoltIcon className="h-8 w-8 text-amber-400" />
            <h5 className="text-lg font-medium text-gray-400">Uber Parcel</h5>
          </div>
          <p className="text-gray-400 text-sm mb-3">
            Ultra-fast parcel delivery within the city via Uber Direct
          </p>
          <div className="text-sm text-gray-400">
            <p><strong>Cost:</strong> From £3.99</p>
            <p><strong>Time:</strong> Under 1 hour</p>
          </div>
        </div>
        </div>        
        )}
      {/* Self Pickup Details */}
      {selectedMethod === 'self_pickup' && (
        <div>
          <button
            type="button"
            onClick={() => { setSelectedMethod(null); setError(null); }}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to collection methods
          </button>
          <div className="bg-blue-50 rounded-lg p-6">
            <h6 className="font-medium text-blue-900 mb-3">Self Pickup Instructions</h6>
            <div className="space-y-2 text-blue-800 text-sm">
              <p>1. Complete the platform fee payment below</p>
              <p>2. Your pickup code and venue details will appear after payment</p>
              <p>3. Visit the venue during collection hours with your pickup code</p>
              <p>4. Bring valid photo ID matching your claim details</p>
              <p>5. Venue staff will verify and release your item</p>
            </div>

            <div className="mt-4 p-3 bg-white/60 rounded border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Your pickup code, venue details, and collection hours will be provided after payment is confirmed.
              </p>
            </div>

            {!showSelfPickupPayment && (
              <button
                onClick={handleSelfPickup}
                disabled={loading}
                className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Proceed to Payment
              </button>
            )}

            {showSelfPickupPayment && (
              <div className="mt-6">
                <h6 className="font-medium text-gray-900 mb-3">Complete Payment</h6>
                <SelfPickupPayment
                  claimId={claim.id}
                  onPaymentSuccess={handleSelfPickupPaymentSuccess}
                  onCancel={handleSelfPickupPaymentCancel}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Courier Options */}
      {(selectedMethod === 'parcel2go' || selectedMethod === 'uber_courier') && (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h6 className="font-medium text-gray-900 mb-4">Delivery Details</h6>
            {/* Both courier types use the enhanced address form now */}
            <div className="space-y-4">
              {(!addressFormData || isEditingAddress) && (
                <CourierAddressForm
                  stepNumber={1}
                  title={
                    selectedMethod === 'parcel2go'
                      ? 'Courier delivery address'
                      : 'Express local delivery address'
                  }
                  submitting={submittingAddress}
                  onSubmit={handleAddressSubmit}
                  initialValue={getAddressFormInitialValue()}
                />
              )}
              {addressFormData && !isEditingAddress && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Address Saved</p>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(true)}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >Edit</button>
                  </div>
                  <p>{addressFormData.fullName}</p>
                  <p>{[addressFormData.address1, addressFormData.address2].filter(Boolean).join(', ')}</p>
                  <p>{addressFormData.city} {addressFormData.postalCode}</p>
                  <p className="text-blue-600">{addressFormData.email}</p>
                </div>
              )}
            </div>

            {/* Show value + quotes button after address saved */}
            {addressFormData && !isEditingAddress && quotes.length === 0 && (
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="itemValue" className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Item Value (&pound;) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium select-none">£</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      id="itemValue"
                      value={itemValue}
                      onChange={(e) => setItemValue(e.target.value)}
                      placeholder="e.g., 50"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Used for insurance purposes. Maximum &pound;10,000.
                  </p>
                </div>
                <button
                  onClick={handleGetQuotes}
                  disabled={loading || !deliveryAddress.trim() || !isItemValueValid}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Getting Quotes...' : 'Get Delivery Quotes'}
                </button>
              </div>
            )}
          </div>

          {/* Show Quotes */}
          {quotes.length > 0 && !showPayment && (
            <div className="space-y-4">
              {/* Back to address/value entry */}
              <button
                type="button"
                onClick={() => { setQuotes([]); setSelectedQuote(null); setError(null); }}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to delivery details
              </button>

              {/* Platform fee info banner */}
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  A platform fee of <strong>&pound;{PLATFORM_FEE.toFixed(2)}</strong> applies to all claims. This is added to the courier cost below.
                </p>
              </div>

              <h6 className="font-medium text-gray-900">Available Delivery Options</h6>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Prices shown are courier costs only. A small VFetch service fee will be added at checkout.
                </span>
              </div>
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className={`border rounded-lg p-4 transition-colors cursor-pointer ${selectedQuote?.id === quote.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => setSelectedQuote(quote)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h6 className="font-medium text-gray-900 flex items-center gap-2">
                        {quote.service}
                        {quote.provider && (
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wide ${
                            quote.provider === 'uber_parcel'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {quote.provider === 'uber_parcel' ? 'uber parcel' : quote.provider}
                          </span>
                        )}
                      </h6>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {quote.estimated_delivery}
                        {quote.provider === 'parcel2go' && quote.metadata?.insurance && (
                          <>
                            {' · Insured £'}{quote.metadata.insurance}
                          </>
                        )}
                        {quote.provider === 'uber' && quote.metadata?.distance_miles && (
                          <>
                            {' · '}{quote.metadata.distance_miles.toFixed(1)} mi
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-1 text-lg font-bold text-green-600">
                        <CurrencyPoundIcon className="h-5 w-5" />
                        <span>{(quote.price + PLATFORM_FEE).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fee breakdown */}
                  <div className="text-xs text-gray-500 mb-2 space-y-0.5">
                    <p>Courier cost: &pound;{quote.price.toFixed(2)}</p>
                    <p>Platform fee: &pound;{PLATFORM_FEE.toFixed(2)}</p>
                    <p className="font-semibold text-gray-700">Total: &pound;{(quote.price + PLATFORM_FEE).toFixed(2)}</p>
                  </div>

                  <p className="text-gray-600 text-sm mb-3">{quote.description}</p>
                  {quote.provider === 'parcel2go' && (quote.metadata?.collection_type || quote.metadata?.delivery_type) && (
                    <p className="text-[11px] text-gray-500 mb-3">
                      {quote.metadata.collection_type && <span>Collection: {quote.metadata.collection_type}</span>}
                      {quote.metadata.collection_type && quote.metadata.delivery_type && ' · '}
                      {quote.metadata.delivery_type && <span>Delivery: {quote.metadata.delivery_type}</span>}
                    </p>
                  )}
                  {quote.provider === 'uber' && (quote.metadata?.estimated_duration) && (
                    <p className="text-[11px] text-gray-500 mb-3">ETA ≈ {quote.metadata.estimated_duration} mins</p>
                  )}
                  {quote.provider === 'uber_parcel' && (
                    <p className="text-[11px] text-gray-500 mb-3">
                      {quote.metadata?.estimated_duration && <span>ETA ≈ {quote.metadata.estimated_duration} mins</span>}
                      {quote.metadata?.estimated_duration && quote.metadata?.distance_miles && ' · '}
                      {quote.metadata?.distance_miles && <span>{quote.metadata.distance_miles.toFixed(1)} mi</span>}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <ClockIcon className="h-4 w-4" />
                      <span>{selectedQuote?.id === quote.id ? 'Selected' : 'Tap to select'}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBookCourier(quote); }}
                      disabled={loading}
                      className="bg-green-600 text-white py-1.5 px-5 rounded hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
                    >
                      {loading && selectedQuote?.id === quote.id ? 'Loading...' : 'Book & Pay'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Step */}
          {showPayment && paymentQuote && (
            <div className="space-y-4">
              <h6 className="font-medium text-gray-900">Complete Payment</h6>
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
    </div>
  );
}
