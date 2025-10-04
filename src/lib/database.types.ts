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
  public: {
    Tables: {
      cleaning_logs: {
        Row: {
          area: string
          id: string
          notes: string | null
          status: string
          timestamp: string | null
          user_name: string
        }
        Insert: {
          area: string
          id?: string
          notes?: string | null
          status: string
          timestamp?: string | null
          user_name: string
        }
        Update: {
          area?: string
          id?: string
          notes?: string | null
          status?: string
          timestamp?: string | null
          user_name?: string
        }
        Relationships: []
      }
      equipment_checks: {
        Row: {
          equipment: string
          id: string
          notes: string | null
          status: string
          timestamp: string | null
          user_name: string
        }
        Insert: {
          equipment: string
          id?: string
          notes?: string | null
          status: string
          timestamp?: string | null
          user_name: string
        }
        Update: {
          equipment?: string
          id?: string
          notes?: string | null
          status?: string
          timestamp?: string | null
          user_name?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string | null
          match_confidence: number | null
          matched_product_id: string | null
          needs_review: boolean | null
          notes: string | null
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit: string
          unit_price: number
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          match_confidence?: number | null
          matched_product_id?: string | null
          needs_review?: boolean | null
          notes?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price?: number
          unit: string
          unit_price?: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          match_confidence?: number | null
          matched_product_id?: string | null
          needs_review?: boolean | null
          notes?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          currency: string
          discount_amount: number | null
          extracted_data: Json | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          invoice_date: string | null
          invoice_number: string
          mime_type: string | null
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          status: string | null
          supplier_id: string | null
          total_excl_vat: number | null
          total_incl_vat: number | null
          updated_at: string | null
          vat_amount: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          discount_amount?: number | null
          extracted_data?: Json | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          mime_type?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          supplier_id?: string | null
          total_excl_vat?: number | null
          total_incl_vat?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          discount_amount?: number | null
          extracted_data?: Json | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          mime_type?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          supplier_id?: string | null
          total_excl_vat?: number | null
          total_incl_vat?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          min_stock: number | null
          name: string
          notes: string | null
          package_weight_kg: number | null
          quantity: number
          sku: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          min_stock?: number | null
          name: string
          notes?: string | null
          package_weight_kg?: number | null
          quantity?: number
          sku: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          min_stock?: number | null
          name?: string
          notes?: string | null
          package_weight_kg?: number | null
          quantity?: number
          sku?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_prices: {
        Row: {
          currency: string
          id: string
          invoice_id: string | null
          last_updated: string | null
          preferred: boolean | null
          price: number
          price_excl_vat: number | null
          price_incl_vat: number | null
          product_id: string | null
          supplier_id: string | null
          vat_rate: number | null
        }
        Insert: {
          currency?: string
          id?: string
          invoice_id?: string | null
          last_updated?: string | null
          preferred?: boolean | null
          price: number
          price_excl_vat?: number | null
          price_incl_vat?: number | null
          product_id?: string | null
          supplier_id?: string | null
          vat_rate?: number | null
        }
        Update: {
          currency?: string
          id?: string
          invoice_id?: string | null
          last_updated?: string | null
          preferred?: boolean | null
          price?: number
          price_excl_vat?: number | null
          price_incl_vat?: number | null
          product_id?: string | null
          supplier_id?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_prices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tech_card_ingredients: {
        Row: {
          created_at: string
          id: string
          netto_qty: number
          notes: string | null
          product_id: string
          tech_card_id: string
          unit: string
          yield_pct: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          netto_qty: number
          notes?: string | null
          product_id: string
          tech_card_id: string
          unit: string
          yield_pct?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          netto_qty?: number
          notes?: string | null
          product_id?: string
          tech_card_id?: string
          unit?: string
          yield_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_card_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_card_ingredients_tech_card_id_fkey"
            columns: ["tech_card_id"]
            isOneToOne: false
            referencedRelation: "tech_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_cards: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      temperature_checks: {
        Row: {
          id: string
          location: string
          notes: string | null
          timestamp: string | null
          user_name: string
          value_c: number
        }
        Insert: {
          id?: string
          location: string
          notes?: string | null
          timestamp?: string | null
          user_name: string
          value_c: number
        }
        Update: {
          id?: string
          location?: string
          notes?: string | null
          timestamp?: string | null
          user_name?: string
          value_c?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const