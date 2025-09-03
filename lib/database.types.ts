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
      artist_assignments: {
        Row: {
          artist_id: string
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_assignments_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_system_message: boolean
          leg_id: string
          message: string
          reply_to_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system_message?: boolean
          leg_id: string
          message: string
          reply_to_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system_message?: boolean
          leg_id?: string
          message?: string
          reply_to_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          filename: string
          id: string
          is_current: boolean
          mime_type: string | null
          passenger_id: string
          project_id: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          is_current?: boolean
          mime_type?: string | null
          passenger_id: string
          project_id: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          is_current?: boolean
          mime_type?: string | null
          passenger_id?: string
          project_id?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "tour_personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      holds: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          notes: string | null
          option_id: string
          passenger_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          option_id: string
          passenger_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          option_id?: string
          passenger_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "tour_personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      leg_passengers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          leg_id: string
          notes: string | null
          passenger_id: string
          treat_as_individual: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          leg_id: string
          notes?: string | null
          passenger_id: string
          treat_as_individual?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          leg_id?: string
          notes?: string | null
          passenger_id?: string
          treat_as_individual?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "leg_passengers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leg_passengers_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leg_passengers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "tour_personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      legs: {
        Row: {
          arrival_date: string | null
          arrival_time: string | null
          created_at: string
          created_by: string | null
          departure_date: string | null
          departure_time: string | null
          destination_city: string
          earliest_departure: string | null
          id: string
          is_active: boolean
          label: string | null
          latest_departure: string | null
          leg_order: number
          notes: string | null
          origin_city: string
          project_id: string
          updated_at: string
        }
        Insert: {
          arrival_date?: string | null
          arrival_time?: string | null
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          departure_time?: string | null
          destination_city: string
          earliest_departure?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          latest_departure?: string | null
          leg_order?: number
          notes?: string | null
          origin_city: string
          project_id: string
          updated_at?: string
        }
        Update: {
          arrival_date?: string | null
          arrival_time?: string | null
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          departure_time?: string | null
          destination_city?: string
          earliest_departure?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          latest_departure?: string | null
          leg_order?: number
          notes?: string | null
          origin_city?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          artist_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          artist_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          artist_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      option_components: {
        Row: {
          aircraft_type: string | null
          airline: string | null
          arrival_time: string | null
          baggage_allowance: string | null
          component_order: number
          cost: number | null
          created_at: string
          currency: string | null
          departure_time: string | null
          flight_number: string | null
          id: string
          meal_service: string | null
          navitas_text: string
          option_id: string
          seat_configuration: string | null
          updated_at: string
        }
        Insert: {
          aircraft_type?: string | null
          airline?: string | null
          arrival_time?: string | null
          baggage_allowance?: string | null
          component_order?: number
          cost?: number | null
          created_at?: string
          currency?: string | null
          departure_time?: string | null
          flight_number?: string | null
          id?: string
          meal_service?: string | null
          navitas_text: string
          option_id: string
          seat_configuration?: string | null
          updated_at?: string
        }
        Update: {
          aircraft_type?: string | null
          airline?: string | null
          arrival_time?: string | null
          baggage_allowance?: string | null
          component_order?: number
          cost?: number | null
          created_at?: string
          currency?: string | null
          departure_time?: string | null
          flight_number?: string | null
          id?: string
          meal_service?: string | null
          navitas_text?: string
          option_id?: string
          seat_configuration?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_components_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_available: boolean
          is_recommended: boolean
          leg_id: string
          name: string
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_available?: boolean
          is_recommended?: boolean
          leg_id: string
          name: string
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_available?: boolean
          is_recommended?: boolean
          leg_id?: string
          name?: string
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "options_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
            referencedColumns: ["id"]
          },
        ]
      }
      pnrs: {
        Row: {
          airline: string | null
          booking_reference: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          issued_at: string | null
          notes: string | null
          passenger_id: string
          status: string | null
          ticket_number: string | null
          updated_at: string
        }
        Insert: {
          airline?: string | null
          booking_reference?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          passenger_id: string
          status?: string | null
          ticket_number?: string | null
          updated_at?: string
        }
        Update: {
          airline?: string | null
          booking_reference?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          passenger_id?: string
          status?: string | null
          ticket_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pnrs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pnrs_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "tour_personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          artist_id: string
          budget_amount: number | null
          budget_currency: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
        }
        Insert: {
          artist_id: string
          budget_amount?: number | null
          budget_currency?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Update: {
          artist_id?: string
          budget_amount?: number | null
          budget_currency?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      selections: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          leg_id: string
          notes: string | null
          option_id: string
          passenger_id: string
          selected_at: string
          status: Database["public"]["Enums"]["selection_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          leg_id: string
          notes?: string | null
          option_id: string
          passenger_id: string
          selected_at?: string
          status?: Database["public"]["Enums"]["selection_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          leg_id?: string
          notes?: string | null
          option_id?: string
          passenger_id?: string
          selected_at?: string
          status?: Database["public"]["Enums"]["selection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "tour_personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_personnel: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          dietary_requirements: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          is_active: boolean
          is_vip: boolean
          nationality: string | null
          passport_number: string | null
          phone: string | null
          project_id: string
          role_title: string | null
          special_requests: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          dietary_requirements?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_vip?: boolean
          nationality?: string | null
          passport_number?: string | null
          phone?: string | null
          project_id: string
          role_title?: string | null
          special_requests?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          dietary_requirements?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_vip?: boolean
          nationality?: string | null
          passport_number?: string | null
          phone?: string | null
          project_id?: string
          role_title?: string | null
          special_requests?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_personnel_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_personnel_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_holds: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_artist_ids: {
        Args: { user_id: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_agent_or_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_employee: {
        Args: { user_id: string }
        Returns: boolean
      }
      rpc_client_select_option: {
        Args: {
          leg_id_param: string
          option_id_param: string
          passenger_ids_param?: string[]
        }
        Returns: Json
      }
      user_has_artist_access: {
        Args: { artist_id: string; user_id: string }
        Returns: boolean
      }
      user_has_project_access: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      document_type: "itinerary" | "invoice"
      hold_status: "active" | "expired" | "released"
      notification_type:
        | "booking"
        | "hold_expiry"
        | "document"
        | "chat"
        | "system"
      pnr_status: "pending" | "confirmed" | "cancelled"
      project_type: "tour" | "event"
      selection_status: "client_choice" | "held" | "ticketed" | "expired"
      user_role: "client" | "agent" | "admin"
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
      document_type: ["itinerary", "invoice"],
      hold_status: ["active", "expired", "released"],
      notification_type: [
        "booking",
        "hold_expiry",
        "document",
        "chat",
        "system",
      ],
      pnr_status: ["pending", "confirmed", "cancelled"],
      project_type: ["tour", "event"],
      selection_status: ["client_choice", "held", "ticketed", "expired"],
      user_role: ["client", "agent", "admin"],
    },
  },
} as const