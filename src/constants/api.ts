export const API_TIMEOUT_MS = 15_000;
export const API_MAX_RETRIES = 2;
export const API_RETRY_DELAY_MS = 1_000;
export const DEMO_VENUE_ID = '5e7ff881-3a93-4e22-b9b1-a9128e3c7f4b';
export const ADDRESS_FORM_SUBMIT_DELAY_MS = 300;

export const ERROR_MESSAGES = {
  TIMEOUT: 'The request took too long. Please try again.',
  NETWORK: 'Unable to connect. Please check your internet connection and try again.',
  SERVER: 'Something went wrong on our end. Please try again shortly.',
  UNEXPECTED: 'An unexpected error occurred. Please try again.',
} as const;
