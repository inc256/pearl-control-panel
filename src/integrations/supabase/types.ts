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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      about_us: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          order_position: number
          section_title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          order_position?: number
          section_title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          order_position?: number
          section_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          booking_status: string
          client_id: string
          created_at: string
          first_name: string
          id: string
          package_id: number
          payment_method: Json
          second_name: string | null
          total_amount: number
          travelers_no: number
          updated_at: string
        }
        Insert: {
          booking_date?: string
          booking_status?: string
          client_id: string
          created_at?: string
          first_name: string
          id?: string
          package_id: number
          payment_method?: Json
          second_name?: string | null
          total_amount?: number
          travelers_no?: number
          updated_at?: string
        }
        Update: {
          booking_date?: string
          booking_status?: string
          client_id?: string
          created_at?: string
          first_name?: string
          id?: string
          package_id?: number
          payment_method?: Json
          second_name?: string | null
          total_amount?: number
          travelers_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            referencedRelation: "packages"
            referencedColumns: ["id"]
          }
        ]
      }
      booking_statuses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          app_id: string | null
          created_at: string
          first_name: string
          id: string
          national_id: string | null
          second_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          app_id?: string | null
          created_at?: string
          first_name: string
          id?: string
          national_id?: string | null
          second_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          app_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          national_id?: string | null
          second_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_info: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          label: string
          order_position: number
          type: string | null
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          order_position?: number
          type?: string | null
          value: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          order_position?: number
          type?: string | null
          value?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          phone: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message: string
          phone?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          phone?: string | null
          subject?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          contribution: Json
          contribution_date: string
          created_at: string
          first_name: string
          id: string
          second_name: string | null
          total: number
          updated_at: string
        }
        Insert: {
          contribution?: Json
          contribution_date?: string
          created_at?: string
          first_name: string
          id?: string
          second_name?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          contribution?: Json
          contribution_date?: string
          created_at?: string
          first_name?: string
          id?: string
          second_name?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenditure: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: number
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: number
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: number
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string | null
          category: string | null
          created_at: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          category?: string | null
          created_at?: string
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          category?: string | null
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery: {
        Row: {
          alt_text: string | null
          category: string | null
          created_at: string
          id: string
          image_url: string
          media_type: 'image' | 'video'
          order_position: number
          title: string | null
        }
        Insert: {
          alt_text?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url: string
          media_type?: 'image' | 'video'
          order_position?: number
          title?: string | null
        }
        Update: {
          alt_text?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string
          media_type?: 'image' | 'video'
          order_position?: number
          title?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      hotels: {
        Row: {
          created_at: string
          id: string
          image: string | null
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: number
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: number
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: number
        }
        Relationships: []
      }
      packages: {
        Row: {
          accommodations: Json
          cover_image: string | null
          created_at: string
          end_date: string | null
          flights: Json
          id: number
          includes: Json
          lectures: Json
          meals: Json
          mina_arafat: Json
          name: string | null
          price: number | null
          start_date: string | null
          transportation: Json
          type: string | null
          updated_at: string
        }
        Insert: {
          accommodations?: Json
          cover_image?: string | null
          created_at?: string
          end_date?: string | null
          flights?: Json
          id?: number
          includes?: Json
          lectures?: Json
          meals?: Json
          mina_arafat?: Json
          name?: string | null
          price?: number | null
          start_date?: string | null
          transportation?: Json
          type?: string | null
          updated_at?: string
        }
        Update: {
          accommodations?: Json
          cover_image?: string | null
          created_at?: string
          end_date?: string | null
          flights?: Json
          id?: number
          includes?: Json
          lectures?: Json
          meals?: Json
          mina_arafat?: Json
          name?: string | null
          price?: number | null
          start_date?: string | null
          transportation?: Json
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          account_no: string | null
          client_id: string
          created_at: string
          discount: number
          id: string
          payment_history: Json
          payment_plan: Json
          plan: string | null
          status: Json
          total: number
          updated_at: string
        }
        Insert: {
          account_no?: string | null
          client_id: string
          created_at?: string
          discount?: number
          id?: string
          payment_history?: Json
          payment_plan?: Json
          plan?: string | null
          status?: Json
          total?: number
          updated_at?: string
        }
        Update: {
          account_no?: string | null
          client_id?: string
          created_at?: string
          discount?: number
          id?: string
          payment_history?: Json
          payment_plan?: Json
          plan?: string | null
          status?: Json
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          data: Json
          key: string
          updated_at: string
        }
        Insert: {
          data?: Json
          key: string
          updated_at?: string
        }
        Update: {
          data?: Json
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      booking_details: {
        Row: {
          app_id: string | null
          booking_date: string | null
          booking_id: string | null
          booking_status: string | null
          client_id: string | null
          first_name: string | null
          national_id: string | null
          package_id: number | null
          package_name: string | null
          package_price: number | null
          package_type: string | null
          payment_method: Json | null
          second_name: string | null
          total_amount: number | null
          travelers_no: number | null
        }
        Relationships: []
      }
      client_payment_summary: {
        Row: {
          client_id: string | null
          first_name: string | null
          national_id: string | null
          net_payment: number | null
          payment_discount: number | null
          payment_plan: string | null
          payment_status: Json | null
          payment_total: number | null
          second_name: string | null
          total_booking_amount: number | null
          total_bookings: number | null
        }
        Relationships: []
      }
      contribution_summary: {
        Row: {
          contribution_date: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          second_name: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_editor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor"
      package_type: "hajj" | "umrah"
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
    Enums: {
      app_role: ["admin", "editor"],
      package_type: ["hajj", "umrah"],
    },
  },
} as const