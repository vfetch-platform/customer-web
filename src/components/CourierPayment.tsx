'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe as StripeType } from '@stripe/stripe-js';
import { customerApi, getErrorMessage } from '@/lib/api';
import ErrorBanner from '@/components/ErrorBanner';
import { CourierQuote } from '@/types';
import {
  CurrencyPoundIcon,
  ShieldCheckIcon,
  TruckIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// ─── Types ──────────────────────────────────────────────────────────────

interface FeeBreakdown {
  courierCost: number;
  platformFee: number;
  total: number;
  currency: string;
}

interface CourierPaymentProps {
  claimId: string;
  quote: CourierQuote;
  onPaymentSuccess: (booking: {
    booking_id: string;
    tracking_number: string;
    label_url?: string;
    payment_intent_id: string;
  }) => void;
  onCancel: () => void;
}

// ─── Stripe loader (singleton) ──────────────────────────────────────────

let stripePromise: Promise<StripeType | null> | null = null;

async function getStripe(): Promise<StripeType | null> {
  // Don't cache a failed/null result — only cache a successful Stripe instance
  if (stripePromise) {
    const cached = await stripePromise;
    if (cached) return cached;
    // Previous attempt failed, retry
    stripePromise = null;
  }

  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (pk) {
    stripePromise = loadStripe(pk);
    return stripePromise;
  }

  // Fallback: fetch publishable key from backend
  try {
    const res = await customerApi.getStripeConfig();
    const key = res?.data?.publishableKey;
    if (key) {
      stripePromise = loadStripe(key);
      return stripePromise;
    }
    console.error('[CourierPayment] Backend returned empty Stripe publishable key');
    return null;
  } catch (err) {
    console.error('[CourierPayment] Failed to fetch Stripe config from backend:', err);
    return null;
  }
}

// ─── Inner checkout form (runs inside <Elements>) ──────────────────────

function CheckoutForm({
  claimId,
  quote,
  breakdown,
  paymentIntentId,
  onPaymentSuccess,
  onCancel,
}: {
  claimId: string;
  quote: CourierQuote;
  breakdown: FeeBreakdown;
  paymentIntentId: string;
  onPaymentSuccess: CourierPaymentProps['onPaymentSuccess'];
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [bookingData, setBookingData] = useState<{
    booking_id: string;
    tracking_number: string;
    label_url?: string;
    payment_intent_id: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // 1. Confirm the Stripe payment
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href, // fallback if redirect needed
        },
        redirect: 'if_required', // stay on page when possible
      });

      // Handle the "already succeeded" case (e.g. React strict mode duplicate)
      if (
        stripeError &&
        stripeError.code === 'payment_intent_unexpected_state' &&
        (stripeError as any).payment_intent?.status === 'succeeded'
      ) {
        // PI already succeeded — proceed with booking
        const succeededPiId = (stripeError as any).payment_intent.id;
        console.info('[CourierPayment] PI already succeeded, proceeding with booking:', succeededPiId);
        const result = await customerApi.confirmCourierBooking(
          claimId,
          succeededPiId,
          quote.id,
          quote
        );
        setBookingData(result.data);
        setSucceeded(true);
        onPaymentSuccess(result.data);
        return;
      }

      if (stripeError) {
        console.error('[CourierPayment] Stripe error:', stripeError);
        const detail = stripeError.decline_code
          ? ` (${stripeError.decline_code})`
          : '';
        setError(
          stripeError.message || `Payment failed${detail}. Please try again.`
        );
        setProcessing(false);
        return;
      }

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        console.error('[CourierPayment] Payment not succeeded:', paymentIntent?.status);
        setError(`Payment was not completed (status: ${paymentIntent?.status || 'unknown'}). Please try again.`);
        setProcessing(false);
        return;
      }

      // 2. Tell the backend to confirm payment and book the courier
      const result = await customerApi.confirmCourierBooking(
        claimId,
        paymentIntent.id,
        quote.id,
        quote
      );

      setBookingData(result.data);
      setSucceeded(true);
      onPaymentSuccess(result.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Payment Successful!
        </h3>
        {bookingData ? (
          <div className="text-left mt-4 bg-green-50 rounded-lg p-4 space-y-3">
            {bookingData.tracking_number && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Tracking Number</p>
                <p className="text-sm font-semibold text-gray-900 font-mono">{bookingData.tracking_number}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Booking ID</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{bookingData.booking_id}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Payment Reference</p>
              <p className="text-sm font-medium text-gray-700 font-mono truncate">{bookingData.payment_intent_id}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">
            Your courier has been booked. You&apos;ll receive tracking details shortly.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <TruckIcon className="h-5 w-5 text-blue-600" />
          Order Summary
        </h4>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex justify-between">
            <span>{quote.service}</span>
            <span>£{breakdown.courierCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="h-4 w-4" />
              VFetch Service Fee
            </span>
            <span>£{breakdown.platformFee.toFixed(2)}</span>
          </div>
          <hr className="border-gray-300" />
          <div className="flex justify-between font-semibold text-gray-900 text-base">
            <span>Total</span>
            <span className="flex items-center gap-1">
              <CurrencyPoundIcon className="h-5 w-5" />
              {breakdown.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Details
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} variant="error" onDismiss={() => setError(null)} />}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </span>
          ) : (
            `Pay £${breakdown.total.toFixed(2)}`
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Your payment is processed securely by Stripe. VFetch never stores your card details.
      </p>
    </form>
  );
}

// ─── Main wrapper component ─────────────────────────────────────────────

export default function CourierPayment({
  claimId,
  quote,
  onPaymentSuccess,
  onCancel,
}: CourierPaymentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<FeeBreakdown | null>(null);
  const [stripeInstance, setStripeInstance] = useState<StripeType | null>(null);
  const initRef = useRef(false);

  const initPayment = useCallback(async () => {
    // Prevent duplicate init (React strict mode)
    if (initRef.current) return;
    initRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // Load Stripe first
      const stripe = await getStripe();

      if (!stripe) {
        initRef.current = false;
        setError('Failed to load payment system. Please refresh and try again.');
        return;
      }

      const paymentRes = await customerApi.createCourierPayment(claimId, quote.id, quote);

      setStripeInstance(stripe);
      setClientSecret(paymentRes.data.clientSecret);
      setPaymentIntentId(paymentRes.data.paymentIntentId);
      setBreakdown(paymentRes.data.breakdown);
    } catch (err: unknown) {
      initRef.current = false;
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, quote.id]);

  useEffect(() => {
    initPayment();
  }, [initPayment]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12 space-y-4">
        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-600">Setting up payment…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error} variant="error" />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Go Back
          </button>
          <button
            onClick={() => { initRef.current = false; initPayment(); }}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stripeInstance || !clientSecret || !breakdown || !paymentIntentId) {
    return null;
  }

  return (
    <Elements
      stripe={stripeInstance}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#2563eb',
            borderRadius: '8px',
          },
        },
      }}
    >
      <CheckoutForm
        claimId={claimId}
        quote={quote}
        breakdown={breakdown}
        paymentIntentId={paymentIntentId}
        onPaymentSuccess={onPaymentSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
