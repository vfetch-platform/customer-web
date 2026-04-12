export interface DeliveryTrackingInfo {
  provider_reference: string;
  tracking_url?: string;
  provider_status?: string;
}

export interface ClaimantSummary {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
}

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
  status: 'available' | 'reserved' | 'released' | 'expired';
  created_at: string;
}

export type WorkflowState =
  | 'pending_review'
  | 'pending_cancelled'
  | 'approved_awaiting_payment'
  | 'approved_ready_for_pickup'
  | 'approved_courier_arranged'
  | 'approved_collected'
  | 'approved_cancelled'
  | 'approved_expired'
  | 'rejected';

export interface Claim {
  id: string;
  item_id: string;
  claimant_id?: string;
  claimant?: ClaimantSummary;
  status: 'pending' | 'approved' | 'rejected';
  payment_status: 'not_required' | 'awaiting_payment' | 'paid' | 'refunded';
  workflow_state?: WorkflowState;
  pickup_code?: string;
  collection_mode?: 'self_pickup' | 'courier';
  courier_provider?: 'parcel2go' | 'uber';
  delivery_address?: string;
  delivery_tracking_info?: DeliveryTrackingInfo;
  notes?: string;
  decided_at?: string;
  paid_at?: string;
  collected_at?: string;
  closed_at?: string;
  closed_reason?: 'claimant_cancelled' | 'expired';
  expires_at?: string;
  created_at: string;
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
