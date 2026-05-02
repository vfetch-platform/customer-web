import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_TIMEOUT_MS, API_MAX_RETRIES, API_RETRY_DELAY_MS, ERROR_MESSAGES } from '@/constants/api';
import { CourierQuote } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
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
      if (config.__retryCount <= API_MAX_RETRIES) {
        const delay = API_RETRY_DELAY_MS * Math.pow(2, config.__retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api.request(config);
      }
    }

    // Normalize error message for components
    let message: string;
    if (error.code === 'ECONNABORTED') {
      message = ERROR_MESSAGES.TIMEOUT;
    } else if (!error.response) {
      message = ERROR_MESSAGES.NETWORK;
    } else if (error.response.status >= 500) {
      message = ERROR_MESSAGES.SERVER;
    } else {
      const data = error.response.data as Record<string, unknown> | undefined;
      const details = data?.details;
      if (Array.isArray(details) && details.length > 0) {
        message = details
          .map((d: unknown) =>
            typeof d === 'string' ? d : ((d as Record<string, unknown>)?.message as string) || ((d as Record<string, unknown>)?.msg as string) || JSON.stringify(d)
          )
          .join('. ');
      } else {
        message =
          (data?.error as string) ||
          (data?.message as string) ||
          ERROR_MESSAGES.UNEXPECTED;
      }
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
    const details = data?.details;
    if (Array.isArray(details) && details.length > 0) {
      return details
        .map((d: unknown) =>
          typeof d === 'string' ? d : ((d as Record<string, unknown>)?.message as string) || ((d as Record<string, unknown>)?.msg as string) || JSON.stringify(d)
        )
        .join('. ');
    }
    return (data?.error as string) || (data?.message as string) || err.message;
  }
  if (err instanceof Error) return err.message;
  return ERROR_MESSAGES.UNEXPECTED;
}

// API functions for the customer app
export const customerApi = {
  // Search items
  searchItems: async (query: string, filters?: Record<string, string>) => {
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
    const data = response.data;
    // Backend returns "schedule" (array of time slots per day), transform to "collection_hours" (single slot per day)
    const venue = data?.data || data;
    if (venue?.schedule && !venue.collection_hours) {
      venue.collection_hours = Object.fromEntries(
        Object.entries(venue.schedule as Record<string, Array<{ open: string; close: string }>>).map(
          ([day, slots]) => [
            day,
            slots.length > 0
              ? { open: slots[0].open, close: slots[0].close }
              : { open: '', close: '', closed: true },
          ]
        )
      );
    }
    return data;
  },

  // Upload photos for a query
  uploadPhotos: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });
    const response = await api.post('/uploads/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data?.data?.urls || response.data?.urls || [];
  },

  // Create query (Step 1)
  createQuery: async (queryData: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    datesOfStay: { checkin: string; checkout: string };
    bookingReference?: string;
    itemDescription: string;
    venueId: string;
    category?: string;
    photoUrls?: string[];
  }) => {
    const response = await api.post('/queries', queryData);
    return response.data;
  },

  // Get AI-matched items (Step 1)
  getMatchedItems: async (queryId: string) => {
    const response = await api.get(`/queries/${queryId}/matches`);
    return response.data;
  },

  // Create public claim (Step 2) -- uses new customer-claims public endpoint (no auth token)
  createClaim: async (
    itemId: string,
    customer: { name: string; email: string; phone?: string },
    opts?: { notes?: string; verificationAnswers?: Record<string, unknown>; queryId?: string }
  ) => {
    const payload: Record<string, unknown> = {
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
  bookCourier: async (claimId: string, quoteId: string, quote?: CourierQuote) => {
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
  createCourierPayment: async (claimId: string, quoteId: string, quote: CourierQuote) => {
    const response = await api.post(`/courier/claims/${claimId}/create-courier-payment`, {
      quoteId,
      quote,
    });
    return response.data;
  },

  // Confirm courier booking after Stripe payment succeeds
  confirmCourierBooking: async (claimId: string, paymentIntentId: string, quoteId: string, quote: CourierQuote) => {
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

  // Send email OTP for verification
  sendOTP: async (email: string) => {
    const response = await api.post('/verify/send-otp', { email });
    return response.data;
  },

  // Verify email OTP
  verifyOTP: async (email: string, otp: string) => {
    const response = await api.post('/verify/confirm-otp', { email, otp });
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