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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          product_count: number | null
          slug: string
          telegram_channel_id: string | null
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          product_count?: number | null
          slug: string
          telegram_channel_id?: string | null
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          product_count?: number | null
          slug?: string
          telegram_channel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          failed_products: number | null
          id: string
          imported_products: number | null
          started_at: string
          status: string
          supplier_id: string | null
          total_products: number | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          failed_products?: number | null
          id?: string
          imported_products?: number | null
          started_at?: string
          status: string
          supplier_id?: string | null
          total_products?: number | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          failed_products?: number | null
          id?: string
          imported_products?: number | null
          started_at?: string
          status?: string
          supplier_id?: string | null
          total_products?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_category: string | null
          ai_tags: string[] | null
          attributes: Json | null
          brand: string | null
          category_id: string | null
          colors: string[] | null
          created_at: string
          currency: string | null
          description: string | null
          external_id: string | null
          group_id: string | null
          id: string
          images: string[] | null
          in_stock: boolean | null
          model: string | null
          name: string
          original_price: number | null
          price: number
          sizes: string[] | null
          source_url: string | null
          stock_quantity: number | null
          supplier_id: string | null
          updated_at: string
          vendor_code: string | null
        }
        Insert: {
          ai_category?: string | null
          ai_tags?: string[] | null
          attributes?: Json | null
          brand?: string | null
          category_id?: string | null
          colors?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          external_id?: string | null
          group_id?: string | null
          id?: string
          images?: string[] | null
          in_stock?: boolean | null
          model?: string | null
          name: string
          original_price?: number | null
          price: number
          sizes?: string[] | null
          source_url?: string | null
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string
          vendor_code?: string | null
        }
        Update: {
          ai_category?: string | null
          ai_tags?: string[] | null
          attributes?: Json | null
          brand?: string | null
          category_id?: string | null
          colors?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          external_id?: string | null
          group_id?: string | null
          id?: string
          images?: string[] | null
          in_stock?: boolean | null
          model?: string | null
          name?: string
          original_price?: number | null
          price?: number
          sizes?: string[] | null
          source_url?: string | null
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string
          vendor_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          is_active: boolean | null
          legal_type: string
          shop_name: string
          tax_code: string | null
          telegram_channel_url: string | null
          telegram_id: number | null
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          legal_type: string
          shop_name: string
          tax_code?: string | null
          telegram_channel_url?: string | null
          telegram_id?: number | null
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          legal_type?: string
          shop_name?: string
          tax_code?: string | null
          telegram_channel_url?: string | null
          telegram_id?: number | null
          updated_at?: string
          xml_url?: string | null
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
