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
  phoneCountryCode: string;
  location: string;
  checkinDate: string;
  checkoutDate: string;
  bookingReference: string;
  category: string;
  itemDescription: string;
  lastSeenLocation: string;
  photos: File[];
}

export const DEFAULT_SEARCH_FORM_DATA: SearchFormData = {
  name: '',
  email: '',
  phone: '',
  phoneCountryCode: '+1',
  location: '',
  checkinDate: '',
  checkoutDate: '',
  bookingReference: '',
  category: '',
  itemDescription: '',
  lastSeenLocation: '',
  photos: [],
};

export const ITEM_CATEGORIES = [
  { key: 'electronics', label: 'Electronics', icon: 'headphones' },
  { key: 'clothing', label: 'Clothing', icon: 'checkroom' },
  { key: 'jewelry', label: 'Jewelry', icon: 'diamond' },
  { key: 'accessories', label: 'Accessories', icon: 'business_center' },
] as const;

export const PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const PHOTO_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
export const PHOTO_MAX_COUNT = 5;
