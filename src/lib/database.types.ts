// Database types aligned with @supabase/supabase-js v2.x runtime client.
// Modern shape requires __InternalSupabase + public { Tables, Views, Functions, Enums, CompositeTypes }
// otherwise PostgrestFilterBuilder collapses to `never` and breaks insert/update/select inference.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      property_subscriptions: {
        Row: {
          id: string;
          property_id: string;
          host_id: string;
          subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
          subscription_plan: 'monthly' | 'yearly';
          amount_paid: number;
          currency: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_subscription_id: string | null;
          subscription_start_date: string | null;
          subscription_end_date: string | null;
          auto_renew: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          property_id: string;
          host_id: string;
          subscription_status?: 'trial' | 'active' | 'expired' | 'cancelled';
          subscription_plan?: 'monthly' | 'yearly';
          amount_paid?: number;
          currency?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_subscription_id?: string | null;
          subscription_start_date?: string | null;
          subscription_end_date?: string | null;
          auto_renew?: boolean;
        };
        Update: Partial<Database['public']['Tables']['property_subscriptions']['Insert']>;
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          title: string;
          description: string;
          property_type: string;
          address: string;
          city: string;
          state: string;
          country: string;
          latitude: number;
          longitude: number;
          price_full_day: number | null;
          price_per_day: number;
          bedrooms: number;
          bathrooms: number;
          max_guests: number;
          amenities: string[];
          images: string[];
          rating: number;
          total_reviews: number;
          is_active: boolean;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
          host_id: string | null;
          listing_type: string;
          expert_listed: boolean;
          external_calendars: Json[];
          external_listings: Json[];
          stats: {
            total_views: number;
            views_last_24h: number;
            monthly_revenue: Record<string, number>;
            monthly_bookings: Record<string, number>;
          };
          slug: string | null;
          is_premium: boolean;
          premium_plan: string;
          premium_expiry: string | null;
          premium_stats: {
            demand_level: string;
            last_updated: string | null;
            conversion_rate: number;
            visibility_score: number;
          };
          is_couple_friendly: boolean;
          accepts_local_ids: boolean;
          hourly_stay_available: boolean;
          is_private_space: boolean;
          instant_booking: boolean;
          no_brokerage: boolean;
          pay_at_property: boolean;
          // Optional offer / discount metadata (nullable so it works with or without DB column).
          discount_percent?: number | null;
          offer_label?: string | null;
        };
        Insert: {
          title: string;
          description: string;
          property_type?: string;
          address: string;
          city: string;
          state: string;
          country?: string;
          latitude?: number;
          longitude?: number;
          price_full_day?: number | null;
          price_per_day?: number;
          bedrooms?: number;
          bathrooms?: number;
          max_guests?: number;
          amenities?: string[];
          images?: string[];
          is_active?: boolean;
          is_verified?: boolean;
          host_id?: string | null;
          listing_type?: string;
          expert_listed?: boolean;
          external_calendars?: Json[];
          external_listings?: Json[];
          stats?: Json;
          slug?: string | null;
          is_premium?: boolean;
          premium_plan?: string;
          premium_expiry?: string | null;
          premium_stats?: Json;
          discount_percent?: number | null;
          offer_label?: string | null;
        };
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          property_id: string;
          guest_name: string;
          guest_email: string;
          guest_phone: string;
          check_in_date: string;
          check_out_date: string | null;
          checkin: string | null;
          checkout: string | null;
          booking_type: 'full_day' | 'half_day';
          time_slot: 'morning' | 'evening' | 'full' | null;
          num_guests: number;
          total_price: number;
          amount_total: number | null;
          // DB enum is currently pending|confirmed|cancelled. We intentionally widen UI status to also
          // cover 'completed' so historical UI components keep compiling. The application layer must
          // continue to write only the DB-allowed values.
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
          payment_status: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          payment_method: string | null;
          paid_at: string | null;
          special_requests: string | null;
          include_decoration: boolean;
          host_id: string | null;
          nights: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          property_id: string;
          guest_name: string;
          guest_email: string;
          guest_phone: string;
          check_in_date: string;
          check_out_date?: string | null;
          checkin?: string | null;
          checkout?: string | null;
          booking_type: 'full_day' | 'half_day';
          time_slot?: 'morning' | 'evening' | 'full' | null;
          num_guests: number;
          total_price: number;
          amount_total?: number | null;
          status?: 'pending' | 'confirmed' | 'cancelled';
          payment_status?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          payment_method?: string | null;
          paid_at?: string | null;
          special_requests?: string | null;
          include_decoration?: boolean;
          host_id?: string | null;
          nights?: number | null;
          source?: string;
        };
        // The Insert + Update status type intentionally accepts the historical
        // UI value 'completed' too — the runtime API tolerates the wider set
        // while the DB enum is being rolled forward. See database.types.ts
        // Row.status comment for rationale.
        Update: Omit<Partial<Database['public']['Tables']['bookings']['Insert']>, 'status'> & {
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        };
        Relationships: [];
      };
      hosts: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          phone: string;
          bio: string;
          kyc_status: string;
          rating: number;
          total_bookings: number;
          total_views: number;
          subscription_status: string;
          subscription_provider_id: string | null;
          subscription_next_billing: string | null;
          subscription_start_date: string | null;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          payout_details: {
            upi: string;
            bank: string;
          };
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          name: string;
          email: string;
          phone: string;
          bio?: string;
          kyc_status?: string;
          subscription_status?: string;
          subscription_provider_id?: string | null;
          subscription_next_billing?: string | null;
          subscription_start_date?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          payout_details?: Json;
        };
        Update: Partial<Database['public']['Tables']['hosts']['Insert']>;
        Relationships: [];
      };
      // Application uses the table name `property_calendar` (see migration
      // 20260106134129_create_property_calendar_availability.sql which actually creates `property_calendar`).
      // Keep the legacy alias as a separate Row to avoid breaking older code that referenced it.
      property_calendar: {
        Row: {
          id: string;
          property_id: string;
          date: string;
          is_available: boolean;
          price_override: number | null;
          minimum_stay: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          property_id: string;
          date: string;
          is_available?: boolean;
          price_override?: number | null;
          minimum_stay?: number;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['property_calendar']['Insert']>;
        Relationships: [];
      };
      view_events: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          timestamp: string;
          visitor_ip_hash: string | null;
          session_id: string | null;
          referrer: string | null;
        };
        Insert: {
          entity_type: string;
          entity_id: string;
          visitor_ip_hash?: string | null;
          session_id?: string | null;
          referrer?: string | null;
        };
        Update: Partial<Database['public']['Tables']['view_events']['Insert']>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          property_id: string;
          booking_id: string | null;
          guest_name: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          property_id: string;
          booking_id?: string | null;
          guest_name: string;
          rating: number;
          comment?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
        Relationships: [];
      };
      external_reviews: {
        Row: {
          id: string;
          host_id: string;
          property_id: string | null;
          provider: string;
          reviewer_name: string;
          rating: number;
          comment: string;
          review_date: string;
          source_url: string | null;
          created_at: string;
        };
        Insert: {
          host_id: string;
          property_id?: string | null;
          provider: string;
          reviewer_name: string;
          rating: number;
          comment?: string;
          review_date: string;
          source_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['external_reviews']['Insert']>;
        Relationships: [];
      };
      homepage_testimonials: {
        Row: {
          id: string;
          name: string;
          avatar_url: string;
          location: string;
          rating: number;
          quote: string;
          is_active: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          name: string;
          avatar_url: string;
          location: string;
          rating: number;
          quote: string;
          is_active?: boolean;
          display_order?: number;
        };
        Update: Partial<Database['public']['Tables']['homepage_testimonials']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_property_available: {
        Args: {
          p_property_id: string;
          p_check_in: string;
          p_check_out: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Property = Database['public']['Tables']['properties']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Host = Database['public']['Tables']['hosts']['Row'];
export type PropertyCalendarAvailability = Database['public']['Tables']['property_calendar']['Row'];
export type ViewEvent = Database['public']['Tables']['view_events']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
