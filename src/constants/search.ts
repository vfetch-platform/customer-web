export const DESCRIPTION_HARD_MIN_WORDS = 3;
export const DESCRIPTION_HARD_MIN_CHARS = 15;
export const DESCRIPTION_SOFT_MIN_WORDS = 8;
export const DESCRIPTION_SOFT_MIN_CHARS = 40;

export const COLOR_WORDS: ReadonlySet<string> = new Set([
  'black', 'white', 'red', 'blue', 'green', 'brown', 'grey', 'gray',
  'silver', 'gold', 'pink', 'navy', 'orange', 'purple', 'yellow', 'beige', 'tan',
]);

export const LOCATION_WORDS: ReadonlySet<string> = new Set([
  'room', 'lobby', 'pool', 'bar', 'restaurant', 'gym', 'conference',
  'reception', 'spa', 'lounge', 'hallway', 'elevator', 'bathroom', 'terrace',
  'beach', 'parking', 'floor',
]);

export const EXAMPLE_QUERIES = [
  'Black iPhone 14 Pro in a blue silicone case, last seen at the pool area',
  "Navy blue North Face jacket, men's size large, left in conference room B",
  'Silver Ray-Ban Aviator sunglasses in a brown leather case',
] as const;

export const BRAND_EXCLUDED_WORDS: ReadonlySet<string> = new Set([
  'the', 'this', 'that', 'with', 'from', 'left', 'last', 'seen',
  'near', 'lost', 'found', 'maybe', 'about', 'some', 'please', 'help',
]);

export const DESCRIPTION_TRUNCATION_THRESHOLD = 140;

export interface SearchFormData {
  name: string;
  email: string;
  phone: string;
  location: string;
  checkinDate: string;
  checkoutDate: string;
  bookingReference: string;
  itemDescription: string;
}

export const DEFAULT_SEARCH_FORM_DATA: SearchFormData = {
  name: '',
  email: '',
  phone: '',
  location: '',
  checkinDate: '',
  checkoutDate: '',
  bookingReference: '',
  itemDescription: '',
};
