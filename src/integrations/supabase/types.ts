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
      files: {
        Row: {
          created_at: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          original_name: string
          storage_path: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          original_name: string
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          original_name?: string
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      note_embeddings: {
        Row: {
          created_at: string
          embedding: string
          id: string
          note_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding: string
          id?: string
          note_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embedding?: string
          id?: string
          note_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_note_embeddings_note"
            columns: ["note_id"]
            isOneToOne: true
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_links: {
        Row: {
          anchor_text: string | null
          canonical_slug: string
          canonical_title: string
          created_at: string
          id: string
          source_note_id: string
          target_note_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_text?: string | null
          canonical_slug: string
          canonical_title: string
          created_at?: string
          id?: string
          source_note_id: string
          target_note_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_text?: string | null
          canonical_slug?: string
          canonical_title?: string
          created_at?: string
          id?: string
          source_note_id?: string
          target_note_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_note_links_source"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_note_links_target"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          captured_on: string
          category_type: Database["public"]["Enums"]["category_type"]
          content: string | null
          created_at: string
          id: string
          pinned: boolean
          review_status: Database["public"]["Enums"]["review_status"]
          semantic_enabled: boolean
          slug: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          captured_on?: string
          category_type?: Database["public"]["Enums"]["category_type"]
          content?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          review_status?: Database["public"]["Enums"]["review_status"]
          semantic_enabled?: boolean
          slug?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          captured_on?: string
          category_type?: Database["public"]["Enums"]["category_type"]
          content?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          review_status?: Database["public"]["Enums"]["review_status"]
          semantic_enabled?: boolean
          slug?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tag_analytics: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          tag_name: string
          total_usage_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          tag_name: string
          total_usage_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          tag_name?: string
          total_usage_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tag_backups: {
        Row: {
          backup_data: Json
          backup_name: string
          backup_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          backup_data: Json
          backup_name: string
          backup_type?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          backup_data?: Json
          backup_name?: string
          backup_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tag_relationships: {
        Row: {
          co_occurrence_count: number
          created_at: string
          id: string
          relationship_strength: number
          tag_a: string
          tag_b: string
          updated_at: string
          user_id: string
        }
        Insert: {
          co_occurrence_count?: number
          created_at?: string
          id?: string
          relationship_strength?: number
          tag_a: string
          tag_b: string
          updated_at?: string
          user_id: string
        }
        Update: {
          co_occurrence_count?: number
          created_at?: string
          id?: string
          relationship_strength?: number
          tag_a?: string
          tag_b?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tag_preferences: {
        Row: {
          auto_format_tags: boolean
          created_at: string
          enforce_naming_conventions: boolean
          id: string
          max_tags_per_note: number
          max_total_tags: number
          reserved_words: string[] | null
          suggest_similar_tags: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_format_tags?: boolean
          created_at?: string
          enforce_naming_conventions?: boolean
          id?: string
          max_tags_per_note?: number
          max_total_tags?: number
          reserved_words?: string[] | null
          suggest_similar_tags?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_format_tags?: boolean
          created_at?: string
          enforce_naming_conventions?: boolean
          id?: string
          max_tags_per_note?: number
          max_total_tags?: number
          reserved_words?: string[] | null
          suggest_similar_tags?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      format_tag_name: {
        Args: { tag_name: string }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_notes: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          note_id: string
          similarity: number
          slug: string
          title: string
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      validate_tag_name: {
        Args: { tag_name: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      category_type: "personal" | "work"
      review_status: "not_reviewed" | "reviewed"
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
      category_type: ["personal", "work"],
      review_status: ["not_reviewed", "reviewed"],
    },
  },
} as const
