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
import { CourierQuote } from '@/types';
import { STRIPE_APPEARANCE, STRIPE_REDIRECT_MODE, STRIPE_SUCCESS_STATUS, STRIPE_UNEXPECTED_STATE_CODE } from '@/constants/stripe';

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

function CheckoutForm({
  claimId, quote, breakdown, paymentIntentId: _paymentIntentId, onPaymentSuccess, onCancel,
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
    booking_id: string; tracking_number: string; label_url?: string; payment_intent_id: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);
    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: STRIPE_REDIRECT_MODE,
      });

      const pi = (stripeError as StripeError & { payment_intent?: PaymentIntent })?.payment_intent;
      if (stripeError && stripeError.code === STRIPE_UNEXPECTED_STATE_CODE && pi?.status === 'succeeded') {
        const succeededPiId = pi.id;
        const result = await customerApi.confirmCourierBooking(claimId, succeededPiId, quote.id, quote);
        setBookingData(result.data); setSucceeded(true); onPaymentSuccess(result.data);
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

      const result = await customerApi.confirmCourierBooking(claimId, paymentIntent.id, quote.id, quote);
      setBookingData(result.data); setSucceeded(true); onPaymentSuccess(result.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-tertiary-fixed/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-4xl text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h3 className="font-headline text-xl font-bold text-primary mb-2">Payment Successful!</h3>
        {bookingData ? (
          <div className="text-left mt-4 bg-surface-container-low rounded-xl p-4 space-y-3">
            {bookingData.tracking_number && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Tracking Number</p>
                <p className="font-headline font-bold text-primary">{bookingData.tracking_number}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Booking ID</p>
              <p className="font-headline font-bold text-primary">{bookingData.booking_id}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Payment Reference</p>
              <p className="text-sm text-on-secondary-container truncate">{bookingData.payment_intent_id}</p>
            </div>
          </div>
        ) : (
          <p className="text-on-secondary-container">Your courier has been booked. You&apos;ll receive tracking details shortly.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
        <h4 className="font-headline font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-surface-tint">local_shipping</span>
          Order Summary
        </h4>
        <div className="text-sm text-on-surface space-y-2">
          <div className="flex justify-between">
            <span>{quote.service}</span>
            <span>&pound;{breakdown.courierCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-on-secondary-container">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">shield</span>
              VFetch Service Fee
            </span>
            <span>&pound;{breakdown.platformFee.toFixed(2)}</span>
          </div>
          <div className="h-[1px] bg-outline-variant/20" />
          <div className="flex justify-between font-headline font-bold text-primary text-base">
            <span>Total</span>
            <span>&pound;{breakdown.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Stripe Payment Element */}
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
            `Pay £${breakdown.total.toFixed(2)}`
          )}
        </button>
      </div>

      <p className="text-xs text-outline text-center">
        Your payment is processed securely by Stripe. VFetch never stores your card details.
      </p>
    </form>
  );
}

export default function CourierPayment({ claimId, quote, onPaymentSuccess, onCancel }: CourierPaymentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<FeeBreakdown | null>(null);
  const [stripeInstance, setStripeInstance] = useState<StripeType | null>(null);
  const initRef = useRef(false);

  const initPayment = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;
    setLoading(true); setError(null);
    try {
      const stripe = await getStripe();
      if (!stripe) { initRef.current = false; setError('Failed to load payment system. Please refresh and try again.'); return; }
      const paymentRes = await customerApi.createCourierPayment(claimId, quote.id, quote);
      setStripeInstance(stripe);
      setClientSecret(paymentRes.data.clientSecret);
      setPaymentIntentId(paymentRes.data.paymentIntentId);
      setBreakdown(paymentRes.data.breakdown);
    } catch (err: unknown) {
      initRef.current = false;
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, quote.id]);

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

  if (!stripeInstance || !clientSecret || !breakdown || !paymentIntentId) return null;

  return (
    <Elements stripe={stripeInstance} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
      <CheckoutForm claimId={claimId} quote={quote} breakdown={breakdown} paymentIntentId={paymentIntentId} onPaymentSuccess={onPaymentSuccess} onCancel={onCancel} />
    </Elements>
  );
}
