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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cleaning_logs: {
        Row: {
          area: string
          created_at: string | null
          id: string
          notes: string | null
          status: string
          timestamp: string | null
          user_name: string
        }
        Insert: {
          area: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status: string
          timestamp?: string | null
          user_name: string
        }
        Update: {
          area?: string
          created_at?: string | null
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
          created_at: string | null
          equipment: string
          id: string
          notes: string | null
          status: string
          timestamp: string | null
          user_name: string
        }
        Insert: {
          created_at?: string | null
          equipment: string
          id?: string
          notes?: string | null
          status: string
          timestamp?: string | null
          user_name: string
        }
        Update: {
          created_at?: string | null
          equipment?: string
          id?: string
          notes?: string | null
          status?: string
          timestamp?: string | null
          user_name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          min_stock: number | null
          name: string
          notes: string | null
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
          quantity?: number
          sku?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_prices: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          last_updated: string | null
          preferred: boolean | null
          price: number
          product_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string
          id?: string
          last_updated?: string | null
          preferred?: boolean | null
          price: number
          product_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          last_updated?: string | null
          preferred?: boolean | null
          price?: number
          product_id?: string
          supplier_id?: string
        }
        Relationships: [
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
          created_at: string | null
          id: string
          netto_qty: number
          notes: string | null
          product_id: string
          tech_card_id: string
          unit: string
          yield_pct: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          netto_qty: number
          notes?: string | null
          product_id: string
          tech_card_id: string
          unit: string
          yield_pct?: number | null
        }
        Update: {
          created_at?: string | null
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
          created_at: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      temperature_checks: {
        Row: {
          created_at: string | null
          id: string
          location: string
          notes: string | null
          timestamp: string | null
          user_name: string
          value_c: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          location: string
          notes?: string | null
          timestamp?: string | null
          user_name: string
          value_c: number
        }
        Update: {
          created_at?: string | null
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
