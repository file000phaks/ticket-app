export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      equipment: {
        Row: {
          id: string
          equipment_id: string
          name: string
          type: string | null
          location: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          equipment_id: string
          name: string
          type?: string | null
          location?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          equipment_id?: string
          name?: string
          type?: string | null
          location?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          ticket_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          is_read: boolean
          sent_email: boolean
          sent_push: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticket_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          is_read?: boolean
          sent_email?: boolean
          sent_push?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticket_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          is_read?: boolean
          sent_email?: boolean
          sent_push?: boolean
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_activities: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          type: Database["public"]["Enums"]["activity_type"]
          description: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          type: Database["public"]["Enums"]["activity_type"]
          description: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          description?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activities_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      ticket_media: {
        Row: {
          id: string
          ticket_id: string
          file_name: string
          file_type: string
          file_size: number | null
          storage_path: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          file_name: string
          file_type: string
          file_size?: number | null
          storage_path: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          file_name?: string
          file_type?: string
          file_size?: number | null
          storage_path?: string
          uploaded_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_media_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          type: Database["public"]["Enums"]["ticket_type"]
          status: Database["public"]["Enums"]["ticket_status"]
          priority: Database["public"]["Enums"]["ticket_priority"]
          location: string
          equipment_id: string | null
          latitude: number | null
          longitude: number | null
          created_by: string
          assigned_to: string | null
          verified_by: string | null
          created_at: string
          updated_at: string
          assigned_at: string | null
          resolved_at: string | null
          verified_at: string | null
          due_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          cost_estimate: number | null
          actual_cost: number | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          type?: Database["public"]["Enums"]["ticket_type"]
          status?: Database["public"]["Enums"]["ticket_status"]
          priority?: Database["public"]["Enums"]["ticket_priority"]
          location: string
          equipment_id?: string | null
          latitude?: number | null
          longitude?: number | null
          created_by: string
          assigned_to?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
          assigned_at?: string | null
          resolved_at?: string | null
          verified_at?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          cost_estimate?: number | null
          actual_cost?: number | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          type?: Database["public"]["Enums"]["ticket_type"]
          status?: Database["public"]["Enums"]["ticket_status"]
          priority?: Database["public"]["Enums"]["ticket_priority"]
          location?: string
          equipment_id?: string | null
          latitude?: number | null
          longitude?: number | null
          created_by?: string
          assigned_to?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
          assigned_at?: string | null
          resolved_at?: string | null
          verified_at?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          cost_estimate?: number | null
          actual_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          department: string | null
          phone: string | null
          is_active: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          department?: string | null
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          department?: string | null
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      work_sessions: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          start_time: string
          end_time: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          start_time: string
          end_time?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          start_time?: string
          end_time?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_overdue_tickets: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      escalate_tickets: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_dashboard_stats: {
        Args: {
          user_uuid: string
        }
        Returns: {
          user_role: Database["public"]["Enums"]["user_role"]
          total_tickets: number
          open_tickets: number
          assigned_tickets: number
          in_progress_tickets: number
          resolved_tickets: number
          critical_tickets: number
          overdue_tickets: number
        }[]
      }
      get_user_ticket_stats: {
        Args: {
          user_uuid: string
        }
        Returns: {
          total_created: number
          total_assigned: number
          open_assigned: number
          in_progress_assigned: number
          resolved_this_week: number
          avg_resolution_hours: number
        }[]
      }
    }
    Enums: {
      activity_type: "created" | "assigned" | "status_change" | "comment" | "media_upload" | "verification" | "note"
      notification_type: "ticket_assigned" | "status_change" | "overdue" | "escalated" | "verified"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "open" | "assigned" | "in_progress" | "resolved" | "verified" | "closed"
      ticket_type: "fault" | "maintenance" | "inspection" | "upgrade"
      user_role: "admin" | "supervisor" | "field_engineer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
