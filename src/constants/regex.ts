export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/;
export const BRAND_KEYWORD_REGEX = /brand|make/i;
export const SIZE_MODEL_REGEX = /\b(small|medium|large|x+l|xs|size|\d{1,2}\s*(pro|max|mini|plus|inch|cm))/i;
// Base pattern without /g — use with String.match() and add /g at the call site
export const CAPITALIZED_WORD_REGEX = /\b[A-Z][a-z]{2,}\b/;
