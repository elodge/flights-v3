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
      booking_documents: {
        Row: {
          file_path: string
          id: string
          kind: string
          ticketing_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_path: string
          id?: string
          kind: string
          ticketing_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_path?: string
          id?: string
          kind?: string
          ticketing_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_documents_ticketing_id_fkey"
            columns: ["ticketing_id"]
            isOneToOne: false
            referencedRelation: "ticketings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount_cents: number
          created_at: string | null
          created_by: string
          id: string
          level: string
          notes: string | null
          party: string | null
          passenger_id: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          created_by: string
          id?: string
          level: string
          notes?: string | null
          party?: string | null
          passenger_id?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          created_by?: string
          id?: string
          level?: string
          notes?: string | null
          party?: string | null
          passenger_id?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "tour_personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_system_message: boolean
          leg_id: string
          message: string
          reply_to_id: string | null
          sender_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_system_message?: boolean
          leg_id: string
          message: string
          reply_to_id?: string | null
          sender_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_system_message?: boolean
          leg_id?: string
          message?: string
          reply_to_id?: string | null
          sender_role?: string | null
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
      chat_reads: {
        Row: {
          last_read_at: string
          leg_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          leg_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          leg_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_selections: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          is_active: boolean
          option_id: string
          price_snapshot: number | null
          selected_by: string
          selection_group_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          option_id: string
          price_snapshot?: number | null
          selected_by: string
          selection_group_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          option_id?: string
          price_snapshot?: number | null
          selected_by?: string
          selection_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_selections_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_selections_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_selections_selection_group_id_fkey"
            columns: ["selection_group_id"]
            isOneToOne: false
            referencedRelation: "selection_groups"
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
          leg_id: string
          notes: string | null
          option_id: string
          passenger_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          leg_id: string
          notes?: string | null
          option_id: string
          passenger_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          leg_id?: string
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
            foreignKeyName: "holds_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
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
      invites: {
        Row: {
          accepted_at: string | null
          artist_ids: string[]
          created_at: string | null
          created_by: string
          email: string
          expires_at: string
          id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          artist_ids?: string[]
          created_at?: string | null
          created_by: string
          email: string
          expires_at?: string
          id?: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          artist_ids?: string[]
          created_at?: string | null
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leg_passengers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_individual: boolean
          leg_id: string
          notes: string | null
          passenger_id: string
          treat_as_individual: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_individual?: boolean
          leg_id: string
          notes?: string | null
          passenger_id: string
          treat_as_individual?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_individual?: boolean
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
          origin_city: string | null
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
          origin_city?: string | null
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
          origin_city?: string | null
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
      notification_events: {
        Row: {
          actor_user_id: string | null
          artist_id: string
          body: string | null
          created_at: string
          id: string
          leg_id: string | null
          project_id: string | null
          severity: string
          title: string
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          artist_id: string
          body?: string | null
          created_at?: string
          id?: string
          leg_id?: string | null
          project_id?: string | null
          severity?: string
          title: string
          type: string
        }
        Update: {
          actor_user_id?: string | null
          artist_id?: string
          body?: string | null
          created_at?: string
          id?: string
          leg_id?: string | null
          project_id?: string | null
          severity?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          event_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          airline_iata: string | null
          airline_name: string | null
          arr_iata: string | null
          arr_time_local: string | null
          arrival_time: string | null
          baggage_allowance: string | null
          component_order: number
          cost: number | null
          created_at: string
          currency: string | null
          day_offset: number | null
          dep_iata: string | null
          dep_time_local: string | null
          departure_time: string | null
          duration_minutes: number | null
          enriched_aircraft_name: string | null
          enriched_aircraft_type: string | null
          enriched_arr_gate: string | null
          enriched_arr_scheduled: string | null
          enriched_arr_terminal: string | null
          enriched_dep_gate: string | null
          enriched_dep_scheduled: string | null
          enriched_dep_terminal: string | null
          enriched_duration: number | null
          enriched_status: string | null
          enriched_terminal_gate: Json | null
          enrichment_fetched_at: string | null
          enrichment_source: string | null
          flight_number: string | null
          id: string
          meal_service: string | null
          navitas_text: string
          option_id: string
          seat_configuration: string | null
          stops: number | null
          updated_at: string
        }
        Insert: {
          aircraft_type?: string | null
          airline?: string | null
          airline_iata?: string | null
          airline_name?: string | null
          arr_iata?: string | null
          arr_time_local?: string | null
          arrival_time?: string | null
          baggage_allowance?: string | null
          component_order?: number
          cost?: number | null
          created_at?: string
          currency?: string | null
          day_offset?: number | null
          dep_iata?: string | null
          dep_time_local?: string | null
          departure_time?: string | null
          duration_minutes?: number | null
          enriched_aircraft_name?: string | null
          enriched_aircraft_type?: string | null
          enriched_arr_gate?: string | null
          enriched_arr_scheduled?: string | null
          enriched_arr_terminal?: string | null
          enriched_dep_gate?: string | null
          enriched_dep_scheduled?: string | null
          enriched_dep_terminal?: string | null
          enriched_duration?: number | null
          enriched_status?: string | null
          enriched_terminal_gate?: Json | null
          enrichment_fetched_at?: string | null
          enrichment_source?: string | null
          flight_number?: string | null
          id?: string
          meal_service?: string | null
          navitas_text: string
          option_id: string
          seat_configuration?: string | null
          stops?: number | null
          updated_at?: string
        }
        Update: {
          aircraft_type?: string | null
          airline?: string | null
          airline_iata?: string | null
          airline_name?: string | null
          arr_iata?: string | null
          arr_time_local?: string | null
          arrival_time?: string | null
          baggage_allowance?: string | null
          component_order?: number
          cost?: number | null
          created_at?: string
          currency?: string | null
          day_offset?: number | null
          dep_iata?: string | null
          dep_time_local?: string | null
          departure_time?: string | null
          duration_minutes?: number | null
          enriched_aircraft_name?: string | null
          enriched_aircraft_type?: string | null
          enriched_arr_gate?: string | null
          enriched_arr_scheduled?: string | null
          enriched_arr_terminal?: string | null
          enriched_dep_gate?: string | null
          enriched_dep_scheduled?: string | null
          enriched_dep_terminal?: string | null
          enriched_duration?: number | null
          enriched_status?: string | null
          enriched_terminal_gate?: Json | null
          enrichment_fetched_at?: string | null
          enrichment_source?: string | null
          flight_number?: string | null
          id?: string
          meal_service?: string | null
          navitas_text?: string
          option_id?: string
          seat_configuration?: string | null
          stops?: number | null
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
          class_of_service: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_available: boolean
          is_recommended: boolean
          is_split: boolean
          leg_id: string
          name: string
          notes: string | null
          price_currency: string
          price_total: number
          seats_available: number | null
          segments: Json
          source: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          class_of_service?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_available?: boolean
          is_recommended?: boolean
          is_split?: boolean
          leg_id: string
          name: string
          notes?: string | null
          price_currency?: string
          price_total?: number
          seats_available?: number | null
          segments?: Json
          source?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          class_of_service?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_available?: boolean
          is_recommended?: boolean
          is_split?: boolean
          leg_id?: string
          name?: string
          notes?: string | null
          price_currency?: string
          price_total?: number
          seats_available?: number | null
          segments?: Json
          source?: string | null
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
      selection_groups: {
        Row: {
          created_at: string
          id: string
          label: string
          leg_id: string
          passenger_ids: string[]
          type: Database["public"]["Enums"]["selection_group_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          leg_id: string
          passenger_ids?: string[]
          type?: Database["public"]["Enums"]["selection_group_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          leg_id?: string
          passenger_ids?: string[]
          type?: Database["public"]["Enums"]["selection_group_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_groups_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
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
      ticketings: {
        Row: {
          currency: string
          id: string
          leg_id: string
          option_id: string
          passenger_id: string
          pnr: string
          price_paid: number
          ticketed_at: string
          ticketed_by: string
        }
        Insert: {
          currency?: string
          id?: string
          leg_id: string
          option_id: string
          passenger_id: string
          pnr: string
          price_paid: number
          ticketed_at?: string
          ticketed_by: string
        }
        Update: {
          currency?: string
          id?: string
          leg_id?: string
          option_id?: string
          passenger_id?: string
          pnr?: string
          price_paid?: number
          ticketed_at?: string
          ticketed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticketings_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketings_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "tour_personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticketings_ticketed_by_fkey"
            columns: ["ticketed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_documents: {
        Row: {
          file_path: string
          id: string
          kind: string
          leg_id: string | null
          passenger_id: string | null
          project_id: string
          title: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          file_path: string
          id?: string
          kind: string
          leg_id?: string | null
          passenger_id?: string | null
          project_id: string
          title: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          file_path?: string
          id?: string
          kind?: string
          leg_id?: string | null
          passenger_id?: string | null
          project_id?: string
          title?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_documents_leg_id_fkey"
            columns: ["leg_id"]
            isOneToOne: false
            referencedRelation: "legs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "tour_personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          emergency_contact_phone_country: string | null
          emergency_contact_phone_e164: string | null
          emergency_contact_phone_extension: string | null
          emergency_contact_phone_national: string | null
          ff_numbers: string | null
          full_name: string
          id: string
          is_vip: boolean
          nationality: string | null
          notes: string | null
          party: string
          passport_number: string | null
          phone: string | null
          phone_country: string | null
          phone_e164: string | null
          phone_extension: string | null
          phone_national_number: string | null
          project_id: string
          role_title: string | null
          seat_pref: string | null
          special_requests: string | null
          status: string
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
          emergency_contact_phone_country?: string | null
          emergency_contact_phone_e164?: string | null
          emergency_contact_phone_extension?: string | null
          emergency_contact_phone_national?: string | null
          ff_numbers?: string | null
          full_name: string
          id?: string
          is_vip?: boolean
          nationality?: string | null
          notes?: string | null
          party?: string
          passport_number?: string | null
          phone?: string | null
          phone_country?: string | null
          phone_e164?: string | null
          phone_extension?: string | null
          phone_national_number?: string | null
          project_id: string
          role_title?: string | null
          seat_pref?: string | null
          special_requests?: string | null
          status?: string
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
          emergency_contact_phone_country?: string | null
          emergency_contact_phone_e164?: string | null
          emergency_contact_phone_extension?: string | null
          emergency_contact_phone_national?: string | null
          ff_numbers?: string | null
          full_name?: string
          id?: string
          is_vip?: boolean
          nationality?: string | null
          notes?: string | null
          party?: string
          passport_number?: string | null
          phone?: string | null
          phone_country?: string | null
          phone_e164?: string | null
          phone_extension?: string | null
          phone_national_number?: string | null
          project_id?: string
          role_title?: string | null
          seat_pref?: string | null
          special_requests?: string | null
          status?: string
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
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_invite: {
        Args: {
          p_artist_ids: string[]
          p_created_by: string
          p_email: string
          p_role: string
        }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      deactivate_selection_for_passenger: {
        Args: { p_leg_id: string; p_passenger_id: string }
        Returns: undefined
      }
      expire_holds: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_invite_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_employee_unread_count: {
        Args: { p_artist_id?: string; p_user_id: string }
        Returns: {
          total_unread: number
        }[]
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
      selection_group_type: "individual" | "group"
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
      selection_group_type: ["individual", "group"],
      selection_status: ["client_choice", "held", "ticketed", "expired"],
      user_role: ["client", "agent", "admin"],
    },
  },
} as const