export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      category_uploads: {
        Row: {
          created_at: string
          error_details: Json | null
          failed_records: number
          filename: string
          id: string
          successful_records: number
          total_records: number
          upload_status: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          failed_records?: number
          filename: string
          id?: string
          successful_records?: number
          total_records?: number
          upload_status?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          failed_records?: number
          filename?: string
          id?: string
          successful_records?: number
          total_records?: number
          upload_status?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      customer_vault_entries: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          title: string
          raw_text: string
          buyer_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          order_id: string | null
          ordered_at: string | null
          contact_key: string | null
          memo: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          title: string
          raw_text: string
          buyer_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          order_id?: string | null
          ordered_at?: string | null
          contact_key?: string | null
          memo?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          title?: string
          raw_text?: string
          buyer_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          order_id?: string | null
          ordered_at?: string | null
          contact_key?: string | null
          memo?: string | null
        }
        Relationships: []
      }
      keyword_analysis: {
        Row: {
          analysis_data: Json | null
          created_at: string
          id: string
          keyword: string
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          id?: string
          keyword: string
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          id?: string
          keyword?: string
          user_id?: string
        }
        Relationships: []
      }
      naver_categories: {
        Row: {
          category_id: string
          category_level: number
          category_name: string
          category_path: string | null
          created_at: string
          id: string
          is_active: boolean
          parent_category_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          category_level?: number
          category_name: string
          category_path?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          parent_category_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          category_level?: number
          category_name?: string
          category_path?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          parent_category_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_type: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_type?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_type?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      store_analysis: {
        Row: {
          analysis_data: Json | null
          created_at: string
          id: string
          store_name: string
          store_url: string | null
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          id?: string
          store_name: string
          store_url?: string | null
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          id?: string
          store_name?: string
          store_url?: string | null
          user_id?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
