'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { type Stripe as StripeType, type StripeError, type PaymentIntent } from '@stripe/stripe-js';
import { customerApi, getErrorMessage } from '@/lib/api';
import { getStripe } from '@/lib/stripe';
import ErrorBanner from '@/components/ErrorBanner';
import { STRIPE_APPEARANCE, STRIPE_REDIRECT_MODE, STRIPE_SUCCESS_STATUS, STRIPE_UNEXPECTED_STATE_CODE } from '@/constants/stripe';

interface SelfPickupPaymentProps {
  claimId: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

function CheckoutForm({
  claimId, platformFee, onPaymentSuccess, onCancel,
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
    setProcessing(true); setError(null);
    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: STRIPE_REDIRECT_MODE,
      });

      const pi = (stripeError as StripeError & { payment_intent?: PaymentIntent })?.payment_intent;
      if (stripeError && stripeError.code === STRIPE_UNEXPECTED_STATE_CODE && pi?.status === 'succeeded') {
        const succeededPiId = pi.id;
        await customerApi.confirmSelfPickup(claimId, succeededPiId);
        setSucceeded(true); onPaymentSuccess(succeededPiId);
        return;
      }

      if (stripeError) {
        const detail = stripeError.decline_code ? ` (${stripeError.decline_code})` : '';
        setError(stripeError.message || `Payment failed${detail}. Please try again.`);
        setProcessing(false); return;
      }

      if (!paymentIntent || paymentIntent.status !== STRIPE_SUCCESS_STATUS) {
        setError(`Payment was not completed (status: ${paymentIntent?.status || 'unknown'}). Please try again.`);
        setProcessing(false); return;
      }

      await customerApi.confirmSelfPickup(claimId, paymentIntent.id);
      setSucceeded(true); onPaymentSuccess(paymentIntent.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally { setProcessing(false); }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-tertiary-fixed/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-4xl text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h3 className="font-headline text-xl font-bold text-primary mb-2">Payment Successful!</h3>
        <p className="text-on-secondary-container">Your self-pickup has been confirmed. Venue details will be provided shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
        <h4 className="font-headline font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-surface-tint">storefront</span>
          Self Pickup — Payment Summary
        </h4>
        <div className="text-sm text-on-surface space-y-2">
          <div className="flex justify-between text-on-secondary-container">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">shield</span>
              VFetch Platform Fee
            </span>
            <span>&pound;{feeDisplay}</span>
          </div>
          <div className="h-[1px] bg-outline-variant/20" />
          <div className="flex justify-between font-headline font-bold text-primary text-base">
            <span>Total</span>
            <span>&pound;{feeDisplay}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-outline px-1 block mb-2">Payment Details</label>
        <div className="ghost-border rounded-xl p-4 bg-surface-container-lowest">
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      </div>

      {error && <ErrorBanner message={error} variant="error" onDismiss={() => setError(null)} />}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={processing}
          className="flex-1 py-3 px-4 bg-secondary-container text-on-secondary-container rounded-full font-headline font-bold hover:bg-surface-container-high disabled:opacity-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={!stripe || processing}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-headline font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-primary/10">
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Processing...
            </span>
          ) : (
            `Pay £${feeDisplay}`
          )}
        </button>
      </div>

      <p className="text-xs text-outline text-center">
        Your payment is processed securely by Stripe. VFetch never stores your card details.
      </p>
    </form>
  );
}

export default function SelfPickupPayment({ claimId, onPaymentSuccess, onCancel }: SelfPickupPaymentProps) {
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
    setLoading(true); setError(null);
    try {
      const stripe = await getStripe();
      if (!stripe) { initRef.current = false; setError('Failed to load payment system. Please refresh and try again.'); return; }
      const res = await customerApi.createSelfPickupPayment(claimId);
      setStripeInstance(stripe);
      setClientSecret(res.data.clientSecret);
      setPaymentIntentId(res.data.paymentIntentId);
      setPlatformFee(res.data.amount ?? res.data.platformFee ?? 0);
    } catch (err: unknown) {
      initRef.current = false;
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  }, [claimId]);

  useEffect(() => { initPayment(); }, [initPayment]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-surface-tint" />
        <p className="text-on-secondary-container">Setting up payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error} variant="error" />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 px-4 bg-secondary-container text-on-secondary-container rounded-full font-headline font-bold hover:bg-surface-container-high transition-colors">Go Back</button>
          <button onClick={() => { initRef.current = false; initPayment(); }}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-headline font-bold hover:opacity-90 transition-all">Retry</button>
        </div>
      </div>
    );
  }

  if (!stripeInstance || !clientSecret || !paymentIntentId) return null;

  return (
    <Elements stripe={stripeInstance} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
      <CheckoutForm claimId={claimId} platformFee={platformFee} onPaymentSuccess={onPaymentSuccess} onCancel={onCancel} />
    </Elements>
  );
}
