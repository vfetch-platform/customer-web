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

export type ParcelTier = 'xs' | 's' | 'm' | 'l' | 'xl';

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
  /** Confirmed parcel tier — drives the read-only "Your parcel" info card. */
  parcel_tier?: ParcelTier;
  created_at: string;
  match_score?: number;
  similarity_score?: number;
}

export interface Claim {
  id: string;
  item_id: string;
  claimant_id?: string;
  claimant?: ClaimantSummary;
  status: 'pending' | 'approved' | 'rejected';
  payment_status: 'not_required' | 'awaiting_payment' | 'paid' | 'refunded';
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

export interface InsuranceExtra {
  Type: string;   // 'Cover' | 'ExtendedBaseCover'
  Price: number;
  Vat: number;
  Total: number;
}

export interface CourierQuoteExtra {
  type: string;   // 'Signature' | 'PrintInStore' | 'Cover' | 'ExtendedBaseCover'
  price: number;
  vat: number;
  total: number;
}

export interface CourierQuote {
  id: string;
  service: string;
  price: number;
  price_ex_vat: number;
  vat: number;
  vat_rate: number;
  currency: string;
  estimated_delivery: string;
  estimated_delivery_label: string;
  collection_date: string;
  cutoff: string;
  description: string;
  provider?: 'parcel2go' | 'uber' | 'uber_parcel';
  logo_url?: string;
  collection_type: string;
  delivery_type: string;
  is_printer_required: boolean;
  included_cover: number;
  max_cover: number;
  available_extras: CourierQuoteExtra[];
  max_dimensions: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
  requires_customs: boolean;
  requires_commercial_invoice: boolean;
  tariff_code_required: boolean;
  country_of_manufacture_required: boolean;
  export_reason_required: boolean;
  recipient_tax_id_requirements: unknown | null;
  sender_tax_id_requirements: unknown | null;
  sender_eori_requirements: unknown | null;
  ioss_requirements: unknown | null;
  recipient_eori_requirements: unknown | null;
  service_description: string;
  tags: string[];
  drop_off_provider: string | null;
  metadata?: {
    service_slug?: string;
    courier_name?: string;
    collection_type?: string;
    delivery_type?: string;
    collection_date?: string;
    distance_miles?: number;
    estimated_duration?: number;
    chosen_insurance_extras?: Array<{ Type: string }>;
  };
}

export interface CustomsContentItem {
  description: string;
  quantity: number;
  estimated_value: number;
  tariff_code?: string;
  origin_country?: string;
}

export interface CustomsData {
  export_reason: 'Gift' | 'Sale' | 'Sample' | 'Repair' | 'Documents' | 'TemporaryExport';
  vat_status: 'NotRegistered' | 'Registered';
  recipient_vat_status: 'Individual' | 'Business';
  eori_number?: string;
  contents: CustomsContentItem[];
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
