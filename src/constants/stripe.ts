export const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#2563eb',
    borderRadius: '8px',
  },
};

export const STRIPE_REDIRECT_MODE = 'if_required' as const;
export const STRIPE_SUCCESS_STATUS = 'succeeded' as const;
export const STRIPE_UNEXPECTED_STATE_CODE = 'payment_intent_unexpected_state' as const;
