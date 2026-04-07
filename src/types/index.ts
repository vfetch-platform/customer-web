export interface Venue {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  branding_colors?: {
    primary: string;
    secondary: string;
  };
  collection_hours?: {
    [key: string]: {
      open: string;
      close: string;
      closed?: boolean;
    };
  };
  google_place_id?: string;
  review_url?: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  venue_id: string;
  venue?: Venue;
  images: string[];
  tags: string[];
  color?: string;
  brand?: string;
  model?: string;
  date_found: string;
  location_found?: string;
  status: 'available' | 'claimed' | 'collected' | 'expired';
  created_at: string;
}

export interface Claim {
  id: string;
  item_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  pickup_code?: string;
  collection_method?: 'self_pickup' | 'parcel2go' | 'uber_courier' | 'uber_parcel';
  delivery_address?: string;
  delivery_tracking?: string;
  notes?: string;
  collected_at?: string;
  expires_at: string;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  item?: Item;
}

export interface CourierQuote {
  id: string;
  service: string;
  price: number;
  currency: string;
  estimated_delivery: string;
  description: string;
  provider?: 'parcel2go' | 'uber' | 'uber_parcel';
  metadata?: {
    service_slug?: string;
    courier_name?: string;
    collection_type?: string;
    delivery_type?: string;
    classification?: string;
    insurance?: number;
    collection_date?: string;
    distance_miles?: number;          // uber mock
    estimated_duration?: number;      // minutes
    [key: string]: any;
  };
}

export interface DeliveryTracking {
  status: string;
  updates: {
    timestamp: string;
    status: string;
    location: string;
    description: string;
  }[];
}
