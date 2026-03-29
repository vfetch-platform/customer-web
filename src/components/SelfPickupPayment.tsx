'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { type Stripe as StripeType } from '@stripe/stripe-js';
import { customerApi, getErrorMessage } from '@/lib/api';
import { getStripe } from '@/lib/stripe';
import ErrorBanner from '@/components/ErrorBanner';
import { STRIPE_APPEARANCE, STRIPE_REDIRECT_MODE, STRIPE_SUCCESS_STATUS, STRIPE_UNEXPECTED_STATE_CODE } from '@/constants/stripe';
import {
  CurrencyPoundIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

// ─── Types ──────────────────────────────────────────────────────────────

interface SelfPickupPaymentProps {
  claimId: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

// ─── Inner checkout form ────────────────────────────────────────────────

function CheckoutForm({
  claimId,
  platformFee,
  onPaymentSuccess,
  onCancel,
}: {
  claimId: string;
  platformFee: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const feeDisplay = platformFee.toFixed(2);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: STRIPE_REDIRECT_MODE,
      });

      if (
        stripeError &&
        stripeError.code === STRIPE_UNEXPECTED_STATE_CODE &&
        (stripeError as any).payment_intent?.status === 'succeeded'
      ) {
        const succeededPiId = (stripeError as any).payment_intent.id;
        await customerApi.confirmSelfPickup(claimId, succeededPiId);
        setSucceeded(true);
        onPaymentSuccess(succeededPiId);
        return;
      }

      if (stripeError) {
        const detail = stripeError.decline_code ? ` (${stripeError.decline_code})` : '';
        setError(stripeError.message || `Payment failed${detail}. Please try again.`);
        setProcessing(false);
        return;
      }

      if (!paymentIntent || paymentIntent.status !== STRIPE_SUCCESS_STATUS) {
        setError(`Payment was not completed (status: ${paymentIntent?.status || 'unknown'}). Please try again.`);
        setProcessing(false);
        return;
      }

      await customerApi.confirmSelfPickup(claimId, paymentIntent.id);
      setSucceeded(true);
      onPaymentSuccess(paymentIntent.id);
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">
          Your self-pickup has been confirmed. Venue details will be provided shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-blue-600" />
          Self Pickup — Payment Summary
        </h4>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex justify-between text-gray-500">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="h-4 w-4" />
              VFetch Platform Fee
            </span>
            <span>&pound;{feeDisplay}</span>
          </div>
          <hr className="border-gray-300" />
          <div className="flex justify-between font-semibold text-gray-900 text-base">
            <span>Total</span>
            <span className="flex items-center gap-1">
              <CurrencyPoundIcon className="h-5 w-5" />
              {feeDisplay}
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
          <PaymentElement options={{ layout: 'tabs' }} />
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
            `Pay £${feeDisplay}`
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

export default function SelfPickupPayment({
  claimId,
  onPaymentSuccess,
  onCancel,
}: SelfPickupPaymentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [stripeInstance, setStripeInstance] = useState<StripeType | null>(null);
  const initRef = useRef(false);

  const initPayment = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const stripe = await getStripe();
      if (!stripe) {
        initRef.current = false;
        setError('Failed to load payment system. Please refresh and try again.');
        return;
      }

      const res = await customerApi.createSelfPickupPayment(claimId);

      setStripeInstance(stripe);
      setClientSecret(res.data.clientSecret);
      setPaymentIntentId(res.data.paymentIntentId);
      setPlatformFee(res.data.amount ?? res.data.platformFee ?? 0);
    } catch (err: unknown) {
      initRef.current = false;
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [claimId]);

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

  if (!stripeInstance || !clientSecret || !paymentIntentId) {
    return null;
  }

  return (
    <Elements
      stripe={stripeInstance}
      options={{
        clientSecret,
        appearance: STRIPE_APPEARANCE,
      }}
    >
      <CheckoutForm
        claimId={claimId}
        platformFee={platformFee}
        onPaymentSuccess={onPaymentSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
