export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applications: {
        Row: {
          address: string | null
          business_name: string
          category: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          is_read: boolean
          phone: string | null
          position: string | null
          status: string
          town_name: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          category?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          phone?: string | null
          position?: string | null
          status?: string
          town_name?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          category?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          phone?: string | null
          position?: string | null
          status?: string
          town_name?: string | null
        }
        Relationships: []
      }
      area_access_codes: {
        Row: {
          access_code: string
          area_key: string
          area_name: string
        }
        Insert: {
          access_code: string
          area_key: string
          area_name: string
        }
        Update: {
          access_code?: string
          area_key?: string
          area_name?: string
        }
        Relationships: []
      }
      merchant_staff: {
        Row: {
          created_at: string
          merchant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          merchant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          merchant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_staff_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "me"
            referencedColumns: ["user_id"]
          },
        ]
      }
      merchants: {
        Row: {
          category: Database["public"]["Enums"]["merchant_category"] | null
          created_at: string
          id: string
          is_active: boolean
          merchant_pin: string | null
          name: string
          operating_hours: Json | null
          street_address: string | null
          town_id: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["merchant_category"] | null
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_pin?: string | null
          name: string
          street_address?: string | null
          town_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["merchant_category"] | null
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_pin?: string | null
          name?: string
          street_address?: string | null
          town_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchants_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          area_key: string
          area_name: string
          created_at: string
          daily_limit: number | null
          description: string | null
          exp_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          merchant_id: string
          original_price_cents: number | null
          per_user_limit: number
          price_cents: number | null
          recurring_schedule: Json | null
          redeemed_count: number
          savings_cents: number | null
          terms: string | null
          title: string
          total_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          area_key?: string
          area_name?: string
          created_at?: string
          daily_limit?: number | null
          description?: string | null
          exp_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          merchant_id: string
          per_user_limit?: number
          redeemed_count?: number
          savings_cents?: number | null
          terms?: string | null
          title: string
          total_limit?: number | null
        }
        Update: {
          area_key?: string
          area_name?: string
          created_at?: string
          daily_limit?: number | null
          description?: string | null
          exp_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          merchant_id?: string
          per_user_limit?: number
          redeemed_count?: number
          savings_cents?: number | null
          terms?: string | null
          title?: string
          total_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          merchant_id: string | null
          plan: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
          welcome_email_sent_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          merchant_id?: string | null
          plan?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
          welcome_email_sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          merchant_id?: string | null
          plan?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
          welcome_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "me"
            referencedColumns: ["user_id"]
          },
        ]
      }
      redemption_tokens: {
        Row: {
          created_at: string
          deal_id: string
          expires_at: string
          id: string
          manual_code: string
          merchant_id: string | null
          scanner_user_id: string | null
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          expires_at: string
          id?: string
          manual_code: string
          merchant_id?: string | null
          scanner_user_id?: string | null
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          expires_at?: string
          id?: string
          manual_code?: string
          merchant_id?: string | null
          scanner_user_id?: string | null
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_tokens_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["user_id"]
          },
        ]
      }
      redemptions: {
        Row: {
          id: string
          merchant_id: string
          offer_id: string
          redeemed_at: string
          token_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          merchant_id: string
          offer_id: string
          redeemed_at?: string
          token_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          merchant_id?: string
          offer_id?: string
          redeemed_at?: string
          token_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "redemption_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      success_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      success_stories: {
        Row: {
          business: string
          category_id: string | null
          contact: string | null
          created_at: string
          id: string
          image_path: string | null
          is_published: boolean
          legacy_source_url: string | null
          location: string | null
          quote: string
          result_summary: string | null
          sort_order: number
        }
        Insert: {
          business: string
          category_id?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          is_published?: boolean
          legacy_source_url?: string | null
          location?: string | null
          quote: string
          result_summary?: string | null
          sort_order?: number
        }
        Update: {
          business?: string
          category_id?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          is_published?: boolean
          legacy_source_url?: string | null
          location?: string | null
          quote?: string
          result_summary?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "success_stories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "success_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["support_status"]
          topic: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["support_status"]
          topic?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["support_status"]
          topic?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          merchant_id: string
          offer_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          merchant_id: string
          offer_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          merchant_id?: string
          offer_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "me"
            referencedColumns: ["user_id"]
          },
        ]
      }
      towns: {
        Row: {
          access_code: string
          created_at: string
          id: string
          is_free: boolean
          name: string
          slug: string
        }
        Insert: {
          access_code: string
          created_at?: string
          id?: string
          is_free?: boolean
          name: string
          slug: string
        }
        Update: {
          access_code?: string
          created_at?: string
          id?: string
          is_free?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_access: {
        Row: {
          created_at: string
          paid: boolean
          paid_at: string | null
          provider: string | null
          provider_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          paid?: boolean
          paid_at?: string | null
          provider?: string | null
          provider_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          paid?: boolean
          paid_at?: string | null
          provider?: string | null
          provider_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "me"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_directory: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          last_sign_in_at: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          last_sign_in_at?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_sign_in_at?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      user_savings: {
        Row: {
          total_savings_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          total_savings_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          total_savings_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_savings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "me"
            referencedColumns: ["user_id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          attempts: number | null
          code_hash: string
          created_at: string | null
          expires_at: string
          id: string
          kind: string
          target: string
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          attempts?: number | null
          code_hash: string
          created_at?: string | null
          expires_at: string
          id?: string
          kind: string
          target: string
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          attempts?: number | null
          code_hash?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          kind?: string
          target?: string
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          town_name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          town_name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          town_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      me: {
        Row: {
          paid: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
        }
        Relationships: []
      }
      success_stories_view: {
        Row: {
          business: string | null
          category_name: string | null
          category_slug: string | null
          category_sort: number | null
          contact: string | null
          created_at: string | null
          id: string | null
          image_path: string | null
          location: string | null
          quote: string | null
          result_summary: string | null
          sort_order: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users: {
        Args: { p_term?: string }
        Returns: {
          created_at: string
          email: string
          last_sign_in_at: string
          merchant_id: string
          merchant_name: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      check_identifier_available: {
        Args: { p_email: string; p_phone: string }
        Returns: {
          email_taken: boolean
          phone_taken: boolean
        }[]
      }
      get_my_merchant: { Args: never; Returns: string }
      is_admin:
      | { Args: never; Returns: boolean }
      | { Args: { uid: string }; Returns: boolean }
      issue_redemption_token: {
        Args: { p_deal_id: string; p_ttl_seconds?: number }
        Returns: {
          expires_at: string
          manual_code: string
          token: string
        }[]
      }
      redeem_offer_with_pin: {
        Args: { p_offer_id: string; p_pin: string }
        Returns: undefined
      }
      redeem_qr: {
        Args: { p_code?: string; p_merchant_id?: string; p_token?: string }
        Returns: {
          deal_id: string
          manual_code: string
          merchant_id: string
          message: string
          offer_title: string
        }[]
      }
      redeem_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          merchant_id: string
          offer_id: string
          redeemed_at: string
          token_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_scan: {
        Args: { p_merchant: string; p_token: string }
        Returns: Json
      }
      verify_area_access_code: {
        Args: { p_area_key: string; p_code: string }
        Returns: boolean
      }
    }
    Enums: {
      merchant_category:
      | "Cafe & Bakery"
      | "Financial"
      | "Fitness"
      | "Hair & Beauty"
      | "Mechanical"
      | "Miscellaneous"
      | "Pet Care"
      | "Photography"
      | "Recreation"
      support_status: "unresolved" | "contacted" | "resolved"
      user_role: "admin" | "merchant" | "consumer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      merchant_category: [
        "Cafe & Bakery",
        "Financial",
        "Fitness",
        "Hair & Beauty",
        "Mechanical",
        "Miscellaneous",
        "Pet Care",
        "Photography",
        "Recreation",
      ],
      support_status: ["unresolved", "contacted", "resolved"],
      user_role: ["admin", "merchant", "consumer"],
    },
  },
} as const
