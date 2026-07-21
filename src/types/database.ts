export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          action_type: string
          business_id: string
          conversation_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          expires_at: string
          id: string
          idempotency_key: string
          payload: Json
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          action_type: string
          business_id: string
          conversation_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          expires_at?: string
          id?: string
          idempotency_key: string
          payload: Json
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          action_type?: string
          business_id?: string
          conversation_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          expires_at?: string
          id?: string
          idempotency_key?: string
          payload?: Json
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          business_id: string
          created_at: string
          id: string
          target: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          business_id: string
          created_at?: string
          id?: string
          target?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          business_id?: string
          created_at?: string
          id?: string
          target?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          owner_user_id: string
          settings: Json
          timezone: string
          updated_at: string
          whatsapp_session: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_user_id: string
          settings?: Json
          timezone?: string
          updated_at?: string
          whatsapp_session?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_user_id?: string
          settings?: Json
          timezone?: string
          updated_at?: string
          whatsapp_session?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          awaiting_reply: boolean
          business_id: string
          channel: string
          created_at: string
          customer_id: string | null
          id: string
          last_message_at: string | null
          status: string
        }
        Insert: {
          awaiting_reply?: boolean
          business_id: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
        }
        Update: {
          awaiting_reply?: boolean
          business_id?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          name: string | null
          notes: string | null
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_insights: {
        Row: {
          business_id: string
          created_at: string
          for_date: string
          id: string
          metrics: Json
          summary: string
        }
        Insert: {
          business_id: string
          created_at?: string
          for_date: string
          id?: string
          metrics?: Json
          summary: string
        }
        Update: {
          business_id?: string
          created_at?: string
          for_date?: string
          id?: string
          metrics?: Json
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_insights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          business_id: string
          content: string
          content_hash: string
          created_at: string
          id: string
          source: string
          title: string | null
        }
        Insert: {
          business_id: string
          content: string
          content_hash: string
          created_at?: string
          id?: string
          source: string
          title?: string | null
        }
        Update: {
          business_id?: string
          content?: string
          content_hash?: string
          created_at?: string
          id?: string
          source?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          business_id: string
          content: string
          content_hash: string
          created_at: string
          embedding: string | null
          id: string
          source: string
          source_id: string | null
        }
        Insert: {
          business_id: string
          content: string
          content_hash: string
          created_at?: string
          embedding?: string | null
          id?: string
          source: string
          source_id?: string | null
        }
        Update: {
          business_id?: string
          content?: string
          content_hash?: string
          created_at?: string
          embedding?: string | null
          id?: string
          source?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          business_id: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          business_id: string
          description: string
          id?: string
          invoice_id: string
          line_total: number
          product_id?: string | null
          quantity: number
          unit_price: number
        }
        Update: {
          business_id?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string | null
          id: string
          issued_at: string | null
          number: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          issued_at?: string | null
          number: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          issued_at?: string | null
          number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          business_id: string
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          job_type: string
          last_error: string | null
          payload: Json
          run_after: string
          status: string
          webhook_event_id: string | null
        }
        Insert: {
          attempts?: number
          business_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          job_type: string
          last_error?: string | null
          payload?: Json
          run_after?: string
          status?: string
          webhook_event_id?: string | null
        }
        Update: {
          attempts?: number
          business_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          job_type?: string
          last_error?: string | null
          payload?: Json
          run_after?: string
          status?: string
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          entry_type: string
          id: string
          invoice_id: string | null
          occurred_at: string
        }
        Insert: {
          amount: number
          business_id: string
          category: string
          created_at?: string
          entry_type: string
          id?: string
          invoice_id?: string | null
          occurred_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          entry_type?: string
          id?: string
          invoice_id?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          business_id: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_url: string | null
          provider_message_id: string | null
          sender: string
        }
        Insert: {
          body: string
          business_id: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          media_url?: string | null
          provider_message_id?: string | null
          sender: string
        }
        Update: {
          body?: string
          business_id?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_url?: string | null
          provider_message_id?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_usage: {
        Row: {
          business_id: string
          cost_usd: number
          created_at: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          provider: string
          trace_id: string | null
        }
        Insert: {
          business_id: string
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          provider: string
          trace_id?: string | null
        }
        Update: {
          business_id?: string
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          trace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          id: string
          invoice_id: string | null
          method: string
          paid_at: string
        }
        Insert: {
          amount: number
          business_id: string
          id?: string
          invoice_id?: string | null
          method?: string
          paid_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          id?: string
          invoice_id?: string | null
          method?: string
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          category_id: string | null
          cost: number | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          reorder_level: number
          sku: string | null
          stock_qty: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          category_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          reorder_level?: number
          sku?: string | null
          stock_qty?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          reorder_level?: number
          sku?: string | null
          stock_qty?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
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
      reorders: {
        Row: {
          business_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          status: string
          supplier_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          status?: string
          supplier_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reorders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          business_id: string
          created_at: string
          delta: number
          id: string
          product_id: string
          reason: string
          ref_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          delta: number
          id?: string
          product_id: string
          reason: string
          ref_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          delta?: number
          id?: string
          product_id?: string
          reason?: string
          ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          whatsapp_number: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          external_id: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider?: string
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_customer_cascade: {
        Args: { p_customer_id: string }
        Returns: undefined
      }
      match_embeddings: {
        Args: {
          match_count?: number
          p_business_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          source: string
          source_id: string
        }[]
      }
      record_sale: { Args: { p_invoice_id: string }; Returns: undefined }
    }
    Enums: {
      approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
        | "executed"
        | "failed"
      invoice_status: "draft" | "sent" | "paid" | "void"
      member_role: "owner" | "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<
  DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
  Row: infer R
}
  ? R
  : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T] extends {
  Insert: infer I
}
  ? I
  : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T] extends {
  Update: infer U
}
  ? U
  : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
