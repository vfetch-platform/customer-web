export type ClaimStep = 'search' | 'details' | 'collection' | 'confirmation';

export const ALL_CLAIM_STEPS: readonly { key: ClaimStep; label: string }[] = [
  { key: 'search', label: 'Look Up' },
  { key: 'details', label: 'Details' },
  { key: 'collection', label: 'Collection' },
  { key: 'confirmation', label: 'Confirmed' },
];

export const CLIPBOARD_FEEDBACK_MS = 2000;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_LENGTH = 6;
export const OTP_FOCUS_DELAY_MS = 80;
export const OTP_ERROR_FOCUS_DELAY_MS = 50;
