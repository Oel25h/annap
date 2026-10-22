export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      blog_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          body: string;
          category: string;
          cover_url: string | null;
          created_at: string;
          excerpt: string | null;
          id: string;
          publish_date: string;
          read_time: string | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string;
          category: string;
          cover_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          publish_date?: string;
          read_time?: string | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          category?: string;
          cover_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          publish_date?: string;
          read_time?: string | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      book_reviews: {
        Row: {
          book_id: string;
          by_name: string;
          created_at: string;
          id: string;
          quote: string;
          sort_order: number;
        };
        Insert: {
          book_id: string;
          by_name: string;
          created_at?: string;
          id?: string;
          quote: string;
          sort_order?: number;
        };
        Update: {
          book_id?: string;
          by_name?: string;
          created_at?: string;
          id?: string;
          quote?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      books: {
        Row: {
          amazon_url: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          ebook_url: string | null;
          formats: string[];
          id: string;
          sample_text: string | null;
          slug: string;
          sort_order: number;
          status: string;
          tagline: string | null;
          title: string;
          updated_at: string;
          who_for: string | null;
        };
        Insert: {
          amazon_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          ebook_url?: string | null;
          formats?: string[];
          id?: string;
          sample_text?: string | null;
          slug: string;
          sort_order?: number;
          status?: string;
          tagline?: string | null;
          title: string;
          updated_at?: string;
          who_for?: string | null;
        };
        Update: {
          amazon_url?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          ebook_url?: string | null;
          formats?: string[];
          id?: string;
          sample_text?: string | null;
          slug?: string;
          sort_order?: number;
          status?: string;
          tagline?: string | null;
          title?: string;
          updated_at?: string;
          who_for?: string | null;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          enquiry_type: string;
          id: string;
          message: string;
          name: string;
          read: boolean;
        };
        Insert: {
          created_at?: string;
          email: string;
          enquiry_type?: string;
          id?: string;
          message: string;
          name: string;
          read?: boolean;
        };
        Update: {
          created_at?: string;
          email?: string;
          enquiry_type?: string;
          id?: string;
          message?: string;
          name?: string;
          read?: boolean;
        };
        Relationships: [];
      };
      gallery_images: {
        Row: {
          caption: string | null;
          chapter: string;
          created_at: string;
          id: string;
          image_url: string;
          section_id: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          caption?: string | null;
          chapter: string;
          created_at?: string;
          id?: string;
          image_url: string;
          section_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          caption?: string | null;
          chapter?: string;
          created_at?: string;
          id?: string;
          image_url?: string;
          section_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gallery_images_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "gallery_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      gallery_sections: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      masterclass: {
        Row: {
          dates: string;
          description: string;
          enroll_url: string | null;
          id: string;
          included: string;
          price: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          dates?: string;
          description?: string;
          enroll_url?: string | null;
          id?: string;
          included?: string;
          price?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          dates?: string;
          description?: string;
          enroll_url?: string | null;
          id?: string;
          included?: string;
          price?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      newsletters: {
        Row: {
          body: string;
          created_at: string;
          filter_source: string | null;
          header_image: string | null;
          id: string;
          recipient_count: number;
          sent_at: string | null;
          status: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          filter_source?: string | null;
          header_image?: string | null;
          id?: string;
          recipient_count?: number;
          sent_at?: string | null;
          status?: string;
          subject: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          filter_source?: string | null;
          header_image?: string | null;
          id?: string;
          recipient_count?: number;
          sent_at?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      page_content: {
        Row: {
          block_key: string;
          id: string;
          page: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          block_key: string;
          id?: string;
          page: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          block_key?: string;
          id?: string;
          page?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      content_translations: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          locale: string;
          fields: Json;
          status: string;
          source_hash: string | null;
          approved_at: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          locale?: string;
          fields?: Json;
          status?: string;
          source_hash?: string | null;
          approved_at?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          locale?: string;
          fields?: Json;
          status?: string;
          source_hash?: string | null;
          approved_at?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          product_id: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url: string;
          product_id: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          product_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          category_id: string | null;
          checkout_url: string | null;
          created_at: string;
          description: string | null;
          featured: boolean;
          id: string;
          image_url: string | null;
          included: string | null;
          name: string;
          price: string | null;
          product_type: string;
          sale_price: string | null;
          slug: string;
          sort_order: number;
          status: string;
          stock_note: string | null;
          updated_at: string;
          who_for: string | null;
        };
        Insert: {
          category_id?: string | null;
          checkout_url?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          included?: string | null;
          name: string;
          price?: string | null;
          product_type?: string;
          sale_price?: string | null;
          slug: string;
          sort_order?: number;
          status?: string;
          stock_note?: string | null;
          updated_at?: string;
          who_for?: string | null;
        };
        Update: {
          category_id?: string | null;
          checkout_url?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          included?: string | null;
          name?: string;
          price?: string | null;
          product_type?: string;
          sale_price?: string | null;
          slug?: string;
          sort_order?: number;
          status?: string;
          stock_note?: string | null;
          updated_at?: string;
          who_for?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      start_page_links: {
        Row: {
          created_at: string;
          enabled: boolean;
          href: string | null;
          icon: string;
          id: string;
          is_internal: boolean;
          label: string;
          sort_order: number;
          sub: string | null;
          to_path: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          href?: string | null;
          icon?: string;
          id?: string;
          is_internal?: boolean;
          label: string;
          sort_order?: number;
          sub?: string | null;
          to_path?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          href?: string | null;
          icon?: string;
          id?: string;
          is_internal?: boolean;
          label?: string;
          sort_order?: number;
          sub?: string | null;
          to_path?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      start_page_settings: {
        Row: {
          featured_enabled: boolean;
          featured_href: string | null;
          featured_icon: string;
          featured_label: string | null;
          featured_sub: string | null;
          footer_tag: string;
          hero_eyebrow: string;
          hero_subtitle: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          featured_enabled?: boolean;
          featured_href?: string | null;
          featured_icon?: string;
          featured_label?: string | null;
          featured_sub?: string | null;
          footer_tag?: string;
          hero_eyebrow?: string;
          hero_subtitle?: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          featured_enabled?: boolean;
          featured_href?: string | null;
          featured_icon?: string;
          featured_label?: string | null;
          featured_sub?: string | null;
          footer_tag?: string;
          hero_eyebrow?: string;
          hero_subtitle?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      start_page_socials: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          platform: string;
          sort_order: number;
          updated_at: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          platform: string;
          sort_order?: number;
          updated_at?: string;
          url?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          platform?: string;
          sort_order?: number;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      subscribers: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string | null;
          source: string | null;
          status: string;
          unsubscribe_token: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          name?: string | null;
          source?: string | null;
          status?: string;
          unsubscribe_token?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string | null;
          source?: string | null;
          status?: string;
          unsubscribe_token?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const;
