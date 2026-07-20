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
      account_requests: {
        Row: {
          apartamento_info: string | null
          cnpj: string | null
          cnpj_propriedade: string | null
          cobranca_bairro: string | null
          cobranca_cep: string | null
          cobranca_email: string | null
          cobranca_municipio: string | null
          cobranca_numero: string | null
          cobranca_rua: string | null
          cobranca_telefone: string | null
          contact_email: string
          cpf: string | null
          created_at: string
          email: string
          estado_propriedade: string | null
          fazenda: string | null
          full_name: string
          id: string
          inscricao_estadual: string | null
          is_apartamento: boolean | null
          municipio_propriedade: string | null
          nome_propriedade: string | null
          phone: string
          requested_type: Database["public"]["Enums"]["requested_account_type"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["account_request_status"]
          uf: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apartamento_info?: string | null
          cnpj?: string | null
          cnpj_propriedade?: string | null
          cobranca_bairro?: string | null
          cobranca_cep?: string | null
          cobranca_email?: string | null
          cobranca_municipio?: string | null
          cobranca_numero?: string | null
          cobranca_rua?: string | null
          cobranca_telefone?: string | null
          contact_email: string
          cpf?: string | null
          created_at?: string
          email: string
          estado_propriedade?: string | null
          fazenda?: string | null
          full_name: string
          id?: string
          inscricao_estadual?: string | null
          is_apartamento?: boolean | null
          municipio_propriedade?: string | null
          nome_propriedade?: string | null
          phone: string
          requested_type: Database["public"]["Enums"]["requested_account_type"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["account_request_status"]
          uf: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apartamento_info?: string | null
          cnpj?: string | null
          cnpj_propriedade?: string | null
          cobranca_bairro?: string | null
          cobranca_cep?: string | null
          cobranca_email?: string | null
          cobranca_municipio?: string | null
          cobranca_numero?: string | null
          cobranca_rua?: string | null
          cobranca_telefone?: string | null
          contact_email?: string
          cpf?: string | null
          created_at?: string
          email?: string
          estado_propriedade?: string | null
          fazenda?: string | null
          full_name?: string
          id?: string
          inscricao_estadual?: string | null
          is_apartamento?: boolean | null
          municipio_propriedade?: string | null
          nome_propriedade?: string | null
          phone?: string
          requested_type?: Database["public"]["Enums"]["requested_account_type"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["account_request_status"]
          uf?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url: string
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalogs: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          activated_count: number
          admin_id: string | null
          created_at: string
          created_count: number
          deactivated_count: number
          error_count: number
          error_details: Json
          filename: string
          id: string
          total: number
          updated_count: number
        }
        Insert: {
          activated_count?: number
          admin_id?: string | null
          created_at?: string
          created_count?: number
          deactivated_count?: number
          error_count?: number
          error_details?: Json
          filename: string
          id?: string
          total?: number
          updated_count?: number
        }
        Update: {
          activated_count?: number
          admin_id?: string | null
          created_at?: string
          created_count?: number
          deactivated_count?: number
          error_count?: number
          error_details?: Json
          filename?: string
          id?: string
          total?: number
          updated_count?: number
        }
        Relationships: []
      }
      institutional_ads: {
        Row: {
          active: boolean
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          link_url: string | null
          media: string[]
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          media?: string[]
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          media?: string[]
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          altura: number | null
          comprimento: number | null
          created_at: string
          id: string
          largura: number | null
          name: string
          order_id: string
          peso: number | null
          product_code: string | null
          product_id: string | null
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          altura?: number | null
          comprimento?: number | null
          created_at?: string
          id?: string
          largura?: number | null
          name: string
          order_id: string
          peso?: number | null
          product_code?: string | null
          product_id?: string | null
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          altura?: number | null
          comprimento?: number | null
          created_at?: string
          id?: string
          largura?: number | null
          name?: string
          order_id?: string
          peso?: number | null
          product_code?: string | null
          product_id?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          customer_name: string
          delivered_at: string | null
          delivery_notified: boolean
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          email: string
          estado: string
          id: string
          mp_expires_at: string | null
          mp_payment_id: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          mp_ticket_url: string | null
          notes: string | null
          numero: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          rua: string
          shipping_cost: number
          shipping_deadline_days: number | null
          shipping_service: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bairro: string
          cep: string
          cidade: string
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          customer_name: string
          delivered_at?: string | null
          delivery_notified?: boolean
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          email: string
          estado: string
          id?: string
          mp_expires_at?: string | null
          mp_payment_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          notes?: string | null
          numero: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          rua: string
          shipping_cost?: number
          shipping_deadline_days?: number | null
          shipping_service?: string | null
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          customer_name?: string
          delivered_at?: string | null
          delivery_notified?: boolean
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          email?: string
          estado?: string
          id?: string
          mp_expires_at?: string | null
          mp_payment_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          notes?: string | null
          numero?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          rua?: string
          shipping_cost?: number
          shipping_deadline_days?: number | null
          shipping_service?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          altura: number | null
          brand: string | null
          catalog_id: string | null
          category_id: string | null
          category_position: number | null
          code: string
          comprimento: number | null
          consumer_pix_price: number | null
          consumer_price: number | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          images: string[]
          installments: number
          largura: number | null
          name: string
          peso: number | null
          pix_price: number | null
          price: number
          producer_pix_price: number | null
          producer_price: number | null
          reseller_pix_price: number | null
          reseller_price: number | null
          slug: string
          stock: number
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          altura?: number | null
          brand?: string | null
          catalog_id?: string | null
          category_id?: string | null
          category_position?: number | null
          code: string
          comprimento?: number | null
          consumer_pix_price?: number | null
          consumer_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          installments?: number
          largura?: number | null
          name: string
          peso?: number | null
          pix_price?: number | null
          price?: number
          producer_pix_price?: number | null
          producer_price?: number | null
          reseller_pix_price?: number | null
          reseller_price?: number | null
          slug: string
          stock?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          altura?: number | null
          brand?: string | null
          catalog_id?: string | null
          category_id?: string | null
          category_position?: number | null
          code?: string
          comprimento?: number | null
          consumer_pix_price?: number | null
          consumer_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          installments?: number
          largura?: number | null
          name?: string
          peso?: number | null
          pix_price?: number | null
          price?: number
          producer_pix_price?: number | null
          producer_price?: number | null
          reseller_pix_price?: number | null
          reseller_price?: number | null
          slug?: string
          stock?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          apartamento_info: string | null
          approval_notified: boolean
          avatar_url: string | null
          cnpj: string | null
          cnpj_propriedade: string | null
          cobranca_bairro: string | null
          cobranca_cep: string | null
          cobranca_email: string | null
          cobranca_municipio: string | null
          cobranca_numero: string | null
          cobranca_rua: string | null
          cobranca_telefone: string | null
          contact_email: string | null
          cpf: string | null
          created_at: string
          email: string | null
          estado_propriedade: string | null
          fazenda: string | null
          full_name: string | null
          id: string
          inscricao_estadual: string | null
          is_apartamento: boolean | null
          municipio_propriedade: string | null
          nome_propriedade: string | null
          phone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          apartamento_info?: string | null
          approval_notified?: boolean
          avatar_url?: string | null
          cnpj?: string | null
          cnpj_propriedade?: string | null
          cobranca_bairro?: string | null
          cobranca_cep?: string | null
          cobranca_email?: string | null
          cobranca_municipio?: string | null
          cobranca_numero?: string | null
          cobranca_rua?: string | null
          cobranca_telefone?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          estado_propriedade?: string | null
          fazenda?: string | null
          full_name?: string | null
          id: string
          inscricao_estadual?: string | null
          is_apartamento?: boolean | null
          municipio_propriedade?: string | null
          nome_propriedade?: string | null
          phone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          apartamento_info?: string | null
          approval_notified?: boolean
          avatar_url?: string | null
          cnpj?: string | null
          cnpj_propriedade?: string | null
          cobranca_bairro?: string | null
          cobranca_cep?: string | null
          cobranca_email?: string | null
          cobranca_municipio?: string | null
          cobranca_numero?: string | null
          cobranca_rua?: string | null
          cobranca_telefone?: string | null
          contact_email?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          estado_propriedade?: string | null
          fazenda?: string | null
          full_name?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_apartamento?: boolean | null
          municipio_propriedade?: string | null
          nome_propriedade?: string | null
          phone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sellers: {
        Row: {
          active: boolean
          banner_url: string | null
          created_at: string
          cutout_url: string | null
          display_order: number
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          region: string | null
          role: string | null
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          banner_url?: string | null
          created_at?: string
          cutout_url?: string | null
          display_order?: number
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          region?: string | null
          role?: string | null
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          banner_url?: string | null
          created_at?: string
          cutout_url?: string | null
          display_order?: number
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          region?: string | null
          role?: string | null
          slug?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_by_admin: boolean
          read_by_user: boolean
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_by_admin?: boolean
          read_by_user?: boolean
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_by_admin?: boolean
          read_by_user?: boolean
          sender_id?: string
          sender_role?: string
          ticket_id?: string
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
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["ticket_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          updated_at?: string
          user_id?: string
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
      [_ in never]: never
    }
    Functions: {
      approve_account_request: {
        Args: { _request_id: string; _reviewer: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_request_status: "pending" | "approved" | "rejected"
      account_type: "cliente" | "revendedor" | "produtor" | "admin" | "empresa"
      app_role: "admin" | "user"
      delivery_status: "preparando" | "a_caminho" | "entregue"
      payment_method: "pix" | "card"
      payment_status:
        | "pending"
        | "in_process"
        | "approved"
        | "rejected"
        | "cancelled"
        | "refunded"
      requested_account_type: "revendedor" | "produtor" | "empresa"
      ticket_status: "open" | "in_progress" | "closed"
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
      account_request_status: ["pending", "approved", "rejected"],
      account_type: ["cliente", "revendedor", "produtor", "admin", "empresa"],
      app_role: ["admin", "user"],
      delivery_status: ["preparando", "a_caminho", "entregue"],
      payment_method: ["pix", "card"],
      payment_status: [
        "pending",
        "in_process",
        "approved",
        "rejected",
        "cancelled",
        "refunded",
      ],
      requested_account_type: ["revendedor", "produtor", "empresa"],
      ticket_status: ["open", "in_progress", "closed"],
    },
  },
} as const
