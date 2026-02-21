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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          item_type: string
          stripe_price_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id: string
          is_active?: boolean | null
          item_type: string
          stripe_price_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          item_type?: string
          stripe_price_id?: string
        }
        Relationships: []
      }
      admin_2fa_settings: {
        Row: {
          enforce_2fa: boolean | null
          grace_period_hours: number | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          enforce_2fa?: boolean | null
          grace_period_hours?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          enforce_2fa?: boolean | null
          grace_period_hours?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          clicks: number | null
          code: string
          created_at: string | null
          credits_cents: number | null
          signups: number | null
          user_id: string
        }
        Insert: {
          clicks?: number | null
          code: string
          created_at?: string | null
          credits_cents?: number | null
          signups?: number | null
          user_id: string
        }
        Update: {
          clicks?: number | null
          code?: string
          created_at?: string | null
          credits_cents?: number | null
          signups?: number | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          operation: string
          row_id: string | null
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          operation: string
          row_id?: string | null
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          operation?: string
          row_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_schedule: {
        Row: {
          audit_type: string
          created_at: string
          enabled: boolean | null
          frequency: string
          id: string
          last_run: string | null
          next_run: string | null
          updated_at: string
        }
        Insert: {
          audit_type: string
          created_at?: string
          enabled?: boolean | null
          frequency?: string
          id?: string
          last_run?: string | null
          next_run?: string | null
          updated_at?: string
        }
        Update: {
          audit_type?: string
          created_at?: string
          enabled?: boolean | null
          frequency?: string
          id?: string
          last_run?: string | null
          next_run?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      backup_jobs: {
        Row: {
          backup_type: string
          created_at: string
          id: string
          priority: string
          scheduled_for: string
          status: string
        }
        Insert: {
          backup_type: string
          created_at?: string
          id?: string
          priority?: string
          scheduled_for: string
          status?: string
        }
        Update: {
          backup_type?: string
          created_at?: string
          id?: string
          priority?: string
          scheduled_for?: string
          status?: string
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_size: number | null
          backup_type: string
          created_at: string
          details: Json | null
          id: string
          status: string
        }
        Insert: {
          backup_size?: number | null
          backup_type: string
          created_at?: string
          details?: Json | null
          id?: string
          status: string
        }
        Update: {
          backup_size?: number | null
          backup_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      backup_test: {
        Row: {
          id: string
          test: string | null
          timestamp: string | null
        }
        Insert: {
          id?: string
          test?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: string
          test?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      bundles: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          name: string
          price_monthly: number
          pterodactyl_env: Json | null
          pterodactyl_limits_patch: Json | null
          slug: string
          stripe_price_id_annual: string | null
          stripe_price_id_biannual: string | null
          stripe_price_id_monthly: string | null
          stripe_price_id_quarterly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          name: string
          price_monthly: number
          pterodactyl_env?: Json | null
          pterodactyl_limits_patch?: Json | null
          slug: string
          stripe_price_id_annual?: string | null
          stripe_price_id_biannual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_quarterly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          price_monthly?: number
          pterodactyl_env?: Json | null
          pterodactyl_limits_patch?: Json | null
          slug?: string
          stripe_price_id_annual?: string | null
          stripe_price_id_biannual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_quarterly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dependency_audits: {
        Row: {
          audit_id: string | null
          created_at: string
          current_version: string
          has_vulnerabilities: boolean | null
          id: string
          latest_version: string | null
          package_name: string
          update_recommendation: string | null
          vulnerability_count: number | null
          vulnerability_details: Json | null
        }
        Insert: {
          audit_id?: string | null
          created_at?: string
          current_version: string
          has_vulnerabilities?: boolean | null
          id?: string
          latest_version?: string | null
          package_name: string
          update_recommendation?: string | null
          vulnerability_count?: number | null
          vulnerability_details?: Json | null
        }
        Update: {
          audit_id?: string | null
          created_at?: string
          current_version?: string
          has_vulnerabilities?: boolean | null
          id?: string
          latest_version?: string | null
          package_name?: string
          update_recommendation?: string | null
          vulnerability_count?: number | null
          vulnerability_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dependency_audits_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "security_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          error_message: string
          error_type: string
          id: string
          ip_address: string | null
          request_id: string | null
          severity: string
          stack_trace: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          ip_address?: string | null
          request_id?: string | null
          severity?: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          ip_address?: string | null
          request_id?: string | null
          severity?: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      external_accounts: {
        Row: {
          last_synced_at: string | null
          panel_username: string | null
          pterodactyl_user_id: number | null
          user_id: string
        }
        Insert: {
          last_synced_at?: string | null
          panel_username?: string | null
          pterodactyl_user_id?: number | null
          user_id: string
        }
        Update: {
          last_synced_at?: string | null
          panel_username?: string | null
          pterodactyl_user_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      financial_audit: {
        Row: {
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          operation: string
          row_id: string
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          row_id: string
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          row_id?: string
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      financial_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          operation_count: number | null
          operation_type: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          operation_count?: number | null
          operation_type: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          operation_count?: number | null
          operation_type?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          docker_image: string
          egg_id: number | null
          icon_url: string | null
          id: string
          name: string
          nest_id: number | null
          slug: string
          startup_command: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          docker_image: string
          egg_id?: number | null
          icon_url?: string | null
          id?: string
          name: string
          nest_id?: number | null
          slug: string
          startup_command?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          docker_image?: string
          egg_id?: number | null
          icon_url?: string | null
          id?: string
          name?: string
          nest_id?: number | null
          slug?: string
          startup_command?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: false
            referencedRelation: "pterodactyl_nests"
            referencedColumns: ["nest_id"]
          },
        ]
      }
      gdpr_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          request_details: Json | null
          request_type: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          request_details?: Json | null
          request_type: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          request_details?: Json | null
          request_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      modpacks: {
        Row: {
          created_at: string | null
          display_name: string
          game: string
          id: string
          is_active: boolean | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          game: string
          id: string
          is_active?: boolean | null
          slug: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          game?: string
          id?: string
          is_active?: boolean | null
          slug?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          addons: Json | null
          created_at: string | null
          id: string
          item_type: string
          modpack_id: string | null
          node_id: number | null
          plan_id: string
          pterodactyl_server_id: number | null
          pterodactyl_server_identifier: string | null
          region: string
          server_name: string
          status: string
          stripe_sub_id: string | null
          term: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          addons?: Json | null
          created_at?: string | null
          id?: string
          item_type: string
          modpack_id?: string | null
          node_id?: number | null
          plan_id: string
          pterodactyl_server_id?: number | null
          pterodactyl_server_identifier?: string | null
          region: string
          server_name: string
          status?: string
          stripe_sub_id?: string | null
          term: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          addons?: Json | null
          created_at?: string | null
          id?: string
          item_type?: string
          modpack_id?: string | null
          node_id?: number | null
          plan_id?: string
          pterodactyl_server_id?: number | null
          pterodactyl_server_identifier?: string | null
          region?: string
          server_name?: string
          status?: string
          stripe_sub_id?: string | null
          term?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_modpack_id_fkey"
            columns: ["modpack_id"]
            isOneToOne: false
            referencedRelation: "modpacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "ptero_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          panel_user_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          panel_user_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          panel_user_id?: number
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          display_name: string
          game: string | null
          id: string
          is_active: boolean | null
          item_type: string
          plan_code: string | null
          ram_gb: number
          ssd_gb: number
          stripe_price_id: string
          vcores: number
        }
        Insert: {
          created_at?: string | null
          display_name: string
          game?: string | null
          id: string
          is_active?: boolean | null
          item_type: string
          plan_code?: string | null
          ram_gb: number
          ssd_gb: number
          stripe_price_id: string
          vcores: number
        }
        Update: {
          created_at?: string | null
          display_name?: string
          game?: string | null
          id?: string
          is_active?: boolean | null
          item_type?: string
          plan_code?: string | null
          ram_gb?: number
          ssd_gb?: number
          stripe_price_id?: string
          vcores?: number
        }
        Relationships: []
      }
      pricing_items: {
        Row: {
          active: boolean
          category: string
          display_name: string
          sku: string
          stripe_price_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          display_name: string
          sku: string
          stripe_price_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          display_name?: string
          sku?: string
          stripe_price_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ptero_nodes: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: number
          last_seen_at: string | null
          max_disk_gb: number
          max_ram_gb: number
          name: string
          pterodactyl_node_id: number
          region: string
          reserved_headroom_gb: number | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: number
          last_seen_at?: string | null
          max_disk_gb: number
          max_ram_gb: number
          name: string
          pterodactyl_node_id: number
          region: string
          reserved_headroom_gb?: number | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: number
          last_seen_at?: string | null
          max_disk_gb?: number
          max_ram_gb?: number
          name?: string
          pterodactyl_node_id?: number
          region?: string
          reserved_headroom_gb?: number | null
        }
        Relationships: []
      }
      pterodactyl_eggs: {
        Row: {
          config_files: Json | null
          created_at: string
          description: string | null
          docker_image: string
          egg_id: number
          environment_variables: Json | null
          id: number
          name: string
          nest_id: number
          startup_command: string
          updated_at: string
        }
        Insert: {
          config_files?: Json | null
          created_at?: string
          description?: string | null
          docker_image: string
          egg_id: number
          environment_variables?: Json | null
          id?: number
          name: string
          nest_id: number
          startup_command: string
          updated_at?: string
        }
        Update: {
          config_files?: Json | null
          created_at?: string
          description?: string | null
          docker_image?: string
          egg_id?: number
          environment_variables?: Json | null
          id?: number
          name?: string
          nest_id?: number
          startup_command?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pterodactyl_eggs_nest_id_fkey"
            columns: ["nest_id"]
            isOneToOne: false
            referencedRelation: "pterodactyl_nests"
            referencedColumns: ["nest_id"]
          },
        ]
      }
      pterodactyl_nests: {
        Row: {
          author: string | null
          created_at: string
          description: string | null
          id: number
          name: string
          nest_id: number
          updated_at: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          description?: string | null
          id?: number
          name: string
          nest_id: number
          updated_at?: string
        }
        Update: {
          author?: string | null
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          nest_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_requests: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          ip_address: string | null
          rate_limit_key: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          ip_address?: string | null
          rate_limit_key: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          ip_address?: string | null
          rate_limit_key?: string
        }
        Relationships: []
      }
      rate_limit_violations: {
        Row: {
          blocked_until: string
          created_at: string
          endpoint: string
          id: string
          identifier: string
          rate_limit_key: string
          violation_count: number | null
        }
        Insert: {
          blocked_until: string
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          rate_limit_key: string
          violation_count?: number | null
        }
        Update: {
          blocked_until?: string
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          rate_limit_key?: string
          violation_count?: number | null
        }
        Relationships: []
      }
      security_audits: {
        Row: {
          audit_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          findings: Json | null
          id: string
          recommendations: Json | null
          severity_counts: Json | null
          status: string
        }
        Insert: {
          audit_type: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          findings?: Json | null
          id?: string
          recommendations?: Json | null
          severity_counts?: Json | null
          status?: string
        }
        Update: {
          audit_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          findings?: Json | null
          id?: string
          recommendations?: Json | null
          severity_counts?: Json | null
          status?: string
        }
        Relationships: []
      }
      server_stats_cache: {
        Row: {
          cpu_percent: number | null
          disk_bytes: number | null
          last_updated: string | null
          memory_bytes: number | null
          order_id: string
          state: string
          uptime_ms: number | null
        }
        Insert: {
          cpu_percent?: number | null
          disk_bytes?: number | null
          last_updated?: string | null
          memory_bytes?: number | null
          order_id: string
          state: string
          uptime_ms?: number | null
        }
        Update: {
          cpu_percent?: number | null
          disk_bytes?: number | null
          last_updated?: string | null
          memory_bytes?: number | null
          order_id?: string
          state?: string
          uptime_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "server_stats_cache_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          allocation: number | null
          created_at: string | null
          game: string
          id: string
          modpack: string | null
          name: string
          panel_server_id: number
          panel_user_id: number
          plan_id: string
          region: string
          status: string
          user_id: string
        }
        Insert: {
          allocation?: number | null
          created_at?: string | null
          game: string
          id?: string
          modpack?: string | null
          name: string
          panel_server_id: number
          panel_user_id: number
          plan_id: string
          region: string
          status?: string
          user_id: string
        }
        Update: {
          allocation?: number | null
          created_at?: string | null
          game?: string
          id?: string
          modpack?: string | null
          name?: string
          panel_server_id?: number
          panel_user_id?: number
          plan_id?: string
          region?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          closed_at: string | null
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          analytics: boolean | null
          cookies: boolean | null
          created_at: string
          id: string
          marketing_emails: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics?: boolean | null
          cookies?: boolean | null
          created_at?: string
          id?: string
          marketing_emails?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics?: boolean | null
          cookies?: boolean | null
          created_at?: string
          id?: string
          marketing_emails?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_requires_2fa: { Args: never; Returns: boolean }
      calculate_next_audit_run: {
        Args: { frequency_param: string }
        Returns: string
      }
      check_my_rate_limit: {
        Args: { max_ops?: number; operation_name: string }
        Returns: boolean
      }
      cleanup_user_data: { Args: never; Returns: Json }
      create_missing_profile_with_pterodactyl: {
        Args: {
          display_name_param?: string
          email_param: string
          pterodactyl_password_param?: string
          pterodactyl_user_id_param?: number
          user_id_param: string
        }
        Returns: Json
      }
      create_user_profile: {
        Args: {
          new_display_name?: string
          new_email: string
          new_user_id: string
        }
        Returns: string
      }
      create_user_stats: { Args: { user_id_param: string }; Returns: string }
      decrypt_sensitive_data: {
        Args: { encrypted_data: string }
        Returns: string
      }
      encrypt_sensitive_data: { Args: { data: string }; Returns: string }
      get_my_financial_summary: {
        Args: never
        Returns: {
          avg_order_value: number
          last_purchase_date: string
          total_orders: number
          total_spent: number
        }[]
      }
      get_my_pterodactyl_credentials: {
        Args: never
        Returns: {
          email: string
          panel_url: string
          password: string
          pterodactyl_user_id: number
        }[]
      }
      get_safe_financial_summary: {
        Args: never
        Returns: {
          user_avg_order: number
          user_last_purchase: string
          user_total_orders: number
          user_total_spent: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_data: { Args: { data: string }; Returns: string }
      initialize_user_data: { Args: never; Returns: Json }
      is_admin: { Args: { _user_id?: string }; Returns: boolean }
      log_user_action: {
        Args: { action_name: string; details?: Json }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
