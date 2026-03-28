import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import CryptoJS from 'crypto-js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response error interceptor: normalize errors + retry GET requests
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { __retryCount?: number };

    // Retry logic: only GET requests, only network errors or 5xx
    const isRetryable =
      config &&
      config.method === 'get' &&
      (!error.response || (error.response.status >= 500 && error.response.status < 600));

    if (isRetryable) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      if (config.__retryCount <= MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, config.__retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api.request(config);
      }
    }

    // Normalize error message for components
    let message: string;
    if (error.code === 'ECONNABORTED') {
      message = 'The request took too long. Please try again.';
    } else if (!error.response) {
      message = 'Unable to connect. Please check your internet connection and try again.';
    } else if (error.response.status >= 500) {
      message = 'Something went wrong on our end. Please try again shortly.';
    } else {
      const data = error.response.data as Record<string, unknown> | undefined;
      message =
        (data?.error as string) ||
        (data?.message as string) ||
        'An unexpected error occurred. Please try again.';
    }

    (error as AxiosError & { normalizedMessage: string }).normalizedMessage = message;
    return Promise.reject(error);
  }
);

/** Extract a user-friendly error message from any caught error */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'normalizedMessage' in err) {
    return (err as { normalizedMessage: string }).normalizedMessage;
  }
  if (err instanceof AxiosError) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    return (data?.error as string) || (data?.message as string) || err.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred. Please try again.';
}

// API functions for the customer app
export const customerApi = {
  // Search items
  searchItems: async (query: string, filters?: any) => {
    const params = new URLSearchParams({
      q: query,
      ...filters,
    });
    const response = await api.get(`/items/search?${params}`);
    return response.data;
  },

  // Get venue details
  getVenue: async (venueId: string) => {
    const response = await api.get(`/venues/${venueId}`);
    return response.data;
  },

  // Create query (Step 1)
  createQuery: async (queryData: {
    name: string;
    email: string;
    phone: string;
    location: string;
    datesOfStay: { checkin: string; checkout: string };
    bookingReference?: string;
    itemDescription: string;
    venueId: string;
  }) => {
    // Generate SHA hash of email as per requirements
    const emailHash = CryptoJS.SHA256(queryData.email).toString();

    const response = await api.post('/queries', {
      ...queryData,
      emailHash,
    });
    return response.data;
  },

  // Get AI-matched items (Step 1)
  getMatchedItems: async (queryId: string, threshold: number = 85) => {
    const response = await api.get(`/queries/${queryId}/matches?threshold=${threshold}`);
    return response.data;
  },

  // Create public claim (Step 2) -- uses new customer-claims public endpoint (no auth token)
  createClaim: async (
    itemId: string,
    customer: { name: string; email: string; phone?: string },
    opts?: { notes?: string; verificationAnswers?: any; queryId?: string }
  ) => {
    const payload: any = {
      itemId,
      customer,
    };
    if (opts?.notes) payload.notes = opts.notes;
    if (opts?.verificationAnswers) payload.verificationAnswers = opts.verificationAnswers;
    if (opts?.queryId) payload.query_id = opts.queryId;
    const response = await api.post('/customer/claims/', payload);
    return response.data;
  },

  // Check public claim status (Step 3)
  getClaimStatus: async (claimId: string) => {
    const response = await api.get(`/customer/claims/${claimId}/status`);
    return response.data;
  },

  // Get courier quotes
  getCourierQuotes: async (claimId: string, deliveryAddress: string, itemValue: number) => {
    const response = await api.post(`/courier/claims/${claimId}/courier-quotes`, {
      deliveryAddress,
      itemValue,
    });
    return response.data;
  },

  // Book courier
  bookCourier: async (claimId: string, quoteId: string, quote?: any) => {
    const response = await api.post(`/courier/claims/${claimId}/book-courier`, {
      quoteId,
      quote,
    });
    return response.data;
  },

  // Get Stripe config (publishable key)
  getStripeConfig: async () => {
    const response = await api.get('/courier/stripe-config');
    return response.data;
  },

  // Get fee breakdown for a courier quote (shows courier cost + platform fee)
  getCourierFeeBreakdown: async (claimId: string, courierCostPounds: number) => {
    const response = await api.post(`/courier/claims/${claimId}/courier-fee-breakdown`, {
      courierCostPounds,
    });
    return response.data;
  },

  // Create a Stripe PaymentIntent for courier booking
  createCourierPayment: async (claimId: string, quoteId: string, quote: any) => {
    const response = await api.post(`/courier/claims/${claimId}/create-courier-payment`, {
      quoteId,
      quote,
    });
    return response.data;
  },

  // Confirm courier booking after Stripe payment succeeds
  confirmCourierBooking: async (claimId: string, paymentIntentId: string, quoteId: string, quote: any) => {
    const response = await api.post(`/courier/claims/${claimId}/confirm-courier-booking`, {
      paymentIntentId,
      quoteId,
      quote,
    });
    return response.data;
  },

  // Create a Stripe PaymentIntent for self-pickup (platform fee only)
  createSelfPickupPayment: async (claimId: string) => {
    const response = await api.post(`/courier/claims/${claimId}/create-self-pickup-payment`);
    return response.data;
  },

  // Confirm self-pickup after Stripe payment succeeds
  confirmSelfPickup: async (claimId: string, paymentIntentId: string) => {
    const response = await api.post(`/courier/claims/${claimId}/confirm-self-pickup`, {
      paymentIntentId,
    });
    return response.data;
  },

  // Get active venues (for demo)
  getVenues: async () => {
    const response = await api.get('/venues?limit=100');
    // Ensure we handle the structure from backend { success: true, data: { data: [...], pagination: {...} } }
    if (response.data?.success && response.data?.data?.data) {
      return response.data.data.data;
    }
    return [];
  },

  // Get delivery tracking
  getDeliveryTracking: async (claimId: string) => {
    const response = await api.get(`/courier/claims/${claimId}/tracking`);
    return response.data;
  },

  // Validate address
  validateAddress: async (address: string) => {
    const response = await api.post('/courier/address/validate', { address });
    return response.data;
  },
};

export default api;