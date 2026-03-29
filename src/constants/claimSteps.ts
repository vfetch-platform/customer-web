export type ClaimStep = 'search' | 'details' | 'collection' | 'confirmation';

export const ALL_CLAIM_STEPS: readonly { key: ClaimStep; label: string }[] = [
  { key: 'search', label: 'Look Up' },
  { key: 'details', label: 'Details' },
  { key: 'collection', label: 'Collection' },
  { key: 'confirmation', label: 'Confirmed' },
];

export const CLIPBOARD_FEEDBACK_MS = 2000;
