import { loadStripe, type Stripe as StripeType } from '@stripe/stripe-js';
import { customerApi } from '@/lib/api';

let stripePromise: Promise<StripeType | null> | null = null;

export async function getStripe(): Promise<StripeType | null> {
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
    return null;
  } catch {
    return null;
  }
}
