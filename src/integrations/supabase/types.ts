export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audiobook_tracks: {
        Row: {
          audio_media_id: string | null;
          audiobook_id: string;
          created_at: string;
          duration_seconds: number | null;
          free_to_stream: boolean;
          id: string;
          opening_line: string;
          position: number;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          audio_media_id?: string | null;
          audiobook_id: string;
          created_at?: string;
          duration_seconds?: number | null;
          free_to_stream?: boolean;
          id?: string;
          opening_line?: string;
          position?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          audio_media_id?: string | null;
          audiobook_id?: string;
          created_at?: string;
          duration_seconds?: number | null;
          free_to_stream?: boolean;
          id?: string;
          opening_line?: string;
          position?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audiobook_tracks_audio_media_id_fkey";
            columns: ["audio_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audiobook_tracks_audiobook_id_fkey";
            columns: ["audiobook_id"];
            isOneToOne: false;
            referencedRelation: "audiobooks";
            referencedColumns: ["id"];
          },
        ];
      };
      audiobooks: {
        Row: {
          book_id: string | null;
          cover_media_id: string | null;
          created_at: string;
          description: string;
          featured: boolean;
          id: string;
          locale: string;
          narrator: string;
          position: number;
          published_at: string | null;
          status: string;
          subtitle: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          book_id?: string | null;
          cover_media_id?: string | null;
          created_at?: string;
          description?: string;
          featured?: boolean;
          id?: string;
          locale: string;
          narrator?: string;
          position?: number;
          published_at?: string | null;
          status?: string;
          subtitle?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          book_id?: string | null;
          cover_media_id?: string | null;
          created_at?: string;
          description?: string;
          featured?: boolean;
          id?: string;
          locale?: string;
          narrator?: string;
          position?: number;
          published_at?: string | null;
          status?: string;
          subtitle?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audiobooks_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audiobooks_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          changed: string[];
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          changed?: string[];
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          changed?: string[];
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
        };
        Relationships: [];
      };
      blog_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
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
          category_id: string | null;
          cover_media_id: string | null;
          cover_url: string | null;
          created_at: string;
          excerpt: string | null;
          featured: boolean;
          id: string;
          publish_date: string;
          published_at: string | null;
          read_time: string | null;
          reading_minutes: number | null;
          seo_description: string;
          seo_title: string;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          category: string;
          category_id?: string | null;
          cover_media_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          featured?: boolean;
          id?: string;
          publish_date?: string;
          published_at?: string | null;
          read_time?: string | null;
          reading_minutes?: number | null;
          seo_description?: string;
          seo_title?: string;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          category?: string;
          category_id?: string | null;
          cover_media_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          featured?: boolean;
          id?: string;
          publish_date?: string;
          published_at?: string | null;
          read_time?: string | null;
          reading_minutes?: number | null;
          seo_description?: string;
          seo_title?: string;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "blog_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blog_posts_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      book_files: {
        Row: {
          book_id: string;
          created_at: string;
          id: string;
          locale: string;
          media_id: string;
          purpose: string;
        };
        ComputedFields: never;
        Insert: {
          book_id: string;
          created_at?: string;
          id?: string;
          locale: string;
          media_id: string;
          purpose: string;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          id?: string;
          locale?: string;
          media_id?: string;
          purpose?: string;
        };
        Relationships: [
          {
            foreignKeyName: "book_files_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "book_files_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      book_formats: {
        Row: {
          available: boolean;
          book_id: string;
          created_at: string;
          currency: string;
          delivery_media_id: string | null;
          external_url: string | null;
          format: string;
          id: string;
          isbn: string;
          locale: string | null;
          position: number;
          price_cents: number | null;
          retailer: string;
          stripe_price_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          available?: boolean;
          book_id: string;
          created_at?: string;
          currency?: string;
          delivery_media_id?: string | null;
          external_url?: string | null;
          format: string;
          id?: string;
          isbn?: string;
          locale?: string | null;
          position?: number;
          price_cents?: number | null;
          retailer?: string;
          stripe_price_id?: string | null;
          updated_at?: string;
        };
        Update: {
          available?: boolean;
          book_id?: string;
          created_at?: string;
          currency?: string;
          delivery_media_id?: string | null;
          external_url?: string | null;
          format?: string;
          id?: string;
          isbn?: string;
          locale?: string | null;
          position?: number;
          price_cents?: number | null;
          retailer?: string;
          stripe_price_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "book_formats_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "book_formats_delivery_media_id_fkey";
            columns: ["delivery_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      book_reviews: {
        Row: {
          book_id: string;
          by_name: string;
          created_at: string;
          id: string;
          published: boolean;
          quote: string;
          sort_order: number;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          book_id: string;
          by_name: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          quote: string;
          sort_order?: number;
          source?: string;
        };
        Update: {
          book_id?: string;
          by_name?: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          quote?: string;
          sort_order?: number;
          source?: string;
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
          cover_media_id: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          ebook_url: string | null;
          featured: boolean;
          formats: string[];
          id: string;
          published_at: string | null;
          sample_text: string | null;
          sections: NonNullable<Json>;
          seo_description: string;
          seo_title: string;
          slug: string;
          sort_order: number;
          status: string;
          subtitle: string;
          tagline: string | null;
          title: string;
          updated_at: string;
          who_for: string | null;
        };
        ComputedFields: never;
        Insert: {
          amazon_url?: string | null;
          cover_media_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          ebook_url?: string | null;
          featured?: boolean;
          formats?: string[];
          id?: string;
          published_at?: string | null;
          sample_text?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug: string;
          sort_order?: number;
          status?: string;
          subtitle?: string;
          tagline?: string | null;
          title: string;
          updated_at?: string;
          who_for?: string | null;
        };
        Update: {
          amazon_url?: string | null;
          cover_media_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          ebook_url?: string | null;
          featured?: boolean;
          formats?: string[];
          id?: string;
          published_at?: string | null;
          sample_text?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug?: string;
          sort_order?: number;
          status?: string;
          subtitle?: string;
          tagline?: string | null;
          title?: string;
          updated_at?: string;
          who_for?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "books_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      consent_texts: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          key: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key: string;
          version: number;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key?: string;
          version?: number;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          archived_at: string | null;
          created_at: string;
          email: string;
          enquiry_type: string;
          id: string;
          locale: string;
          message: string;
          name: string;
          read: boolean;
          read_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          email: string;
          enquiry_type?: string;
          id?: string;
          locale?: string;
          message: string;
          name: string;
          read?: boolean;
          read_at?: string | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          email?: string;
          enquiry_type?: string;
          id?: string;
          locale?: string;
          message?: string;
          name?: string;
          read?: boolean;
          read_at?: string | null;
        };
        Relationships: [];
      };
      content_drafts: {
        Row: {
          data: NonNullable<Json>;
          entity_id: string;
          entity_type: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          data: NonNullable<Json>;
          entity_id: string;
          entity_type: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          data?: NonNullable<Json>;
          entity_id?: string;
          entity_type?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      content_translations: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          draft_fields: Json | null;
          english_hash: string | null;
          entity_id: string;
          entity_type: string;
          field_hashes: NonNullable<Json>;
          fields: NonNullable<Json>;
          id: string;
          is_stale: boolean | null;
          locale: string;
          origin: string;
          show_english: boolean;
          source_hash: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          draft_fields?: Json | null;
          english_hash?: string | null;
          entity_id: string;
          entity_type: string;
          field_hashes?: NonNullable<Json>;
          fields?: NonNullable<Json>;
          id?: string;
          is_stale?: never;
          locale?: string;
          origin?: string;
          show_english?: boolean;
          source_hash?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          draft_fields?: Json | null;
          english_hash?: string | null;
          entity_id?: string;
          entity_type?: string;
          field_hashes?: NonNullable<Json>;
          fields?: NonNullable<Json>;
          id?: string;
          is_stale?: never;
          locale?: string;
          origin?: string;
          show_english?: boolean;
          source_hash?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      content_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          snapshot: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          snapshot: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          snapshot?: NonNullable<Json>;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          amount_cents: number;
          anonymous: boolean;
          created_at: string;
          currency: string;
          donor_email: string | null;
          donor_name: string | null;
          id: string;
          interval: string;
          locale: string;
          message: string | null;
          paid_at: string | null;
          return_path: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_invoice_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_session_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          anonymous?: boolean;
          created_at?: string;
          currency?: string;
          donor_email?: string | null;
          donor_name?: string | null;
          id?: string;
          interval?: string;
          locale?: string;
          message?: string | null;
          paid_at?: string | null;
          return_path?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_invoice_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          anonymous?: boolean;
          created_at?: string;
          currency?: string;
          donor_email?: string | null;
          donor_name?: string | null;
          id?: string;
          interval?: string;
          locale?: string;
          message?: string | null;
          paid_at?: string | null;
          return_path?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_invoice_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      download_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          last_used_at: string | null;
          lead_id: string | null;
          max_uses: number;
          media_id: string;
          order_item_id: string | null;
          token_hash: string;
          uses: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          last_used_at?: string | null;
          lead_id?: string | null;
          max_uses?: number;
          media_id: string;
          order_item_id?: string | null;
          token_hash: string;
          uses?: number;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          last_used_at?: string | null;
          lead_id?: string | null;
          max_uses?: number;
          media_id?: string;
          order_item_id?: string | null;
          token_hash?: string;
          uses?: number;
        };
        Relationships: [
          {
            foreignKeyName: "download_tokens_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "download_tokens_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "download_tokens_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      email_outbox: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          last_error: string | null;
          locale: string;
          newsletter_id: string | null;
          params: Json | null;
          provider_id: string | null;
          send_after: string;
          sent_at: string | null;
          status: string;
          subject: string;
          template: string;
          to_email: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          locale?: string;
          newsletter_id?: string | null;
          params?: Json | null;
          provider_id?: string | null;
          send_after?: string;
          sent_at?: string | null;
          status?: string;
          subject?: string;
          template: string;
          to_email: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          locale?: string;
          newsletter_id?: string | null;
          params?: Json | null;
          provider_id?: string | null;
          send_after?: string;
          sent_at?: string | null;
          status?: string;
          subject?: string;
          template?: string;
          to_email?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_outbox_newsletter_id_fkey";
            columns: ["newsletter_id"];
            isOneToOne: false;
            referencedRelation: "newsletters";
            referencedColumns: ["id"];
          },
        ];
      };
      email_templates: {
        Row: {
          body: string;
          key: string;
          subject: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          key: string;
          subject: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          body?: string;
          key?: string;
          subject?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          city: string;
          cover_media_id: string | null;
          created_at: string;
          ends_at: string | null;
          id: string;
          online: boolean;
          published_at: string | null;
          sections: NonNullable<Json>;
          seo_description: string;
          seo_title: string;
          slug: string;
          starts_at: string;
          status: string;
          summary: string;
          ticket_url: string | null;
          time_zone: string;
          title: string;
          updated_at: string;
          venue: string;
        };
        ComputedFields: never;
        Insert: {
          city?: string;
          cover_media_id?: string | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          online?: boolean;
          published_at?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug: string;
          starts_at: string;
          status?: string;
          summary?: string;
          ticket_url?: string | null;
          time_zone?: string;
          title: string;
          updated_at?: string;
          venue?: string;
        };
        Update: {
          city?: string;
          cover_media_id?: string | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          online?: boolean;
          published_at?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug?: string;
          starts_at?: string;
          status?: string;
          summary?: string;
          ticket_url?: string | null;
          time_zone?: string;
          title?: string;
          updated_at?: string;
          venue?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      foundation_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
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
      foundation_settings: {
        Row: {
          created_at: string;
          cta_href: string | null;
          cta_label: string | null;
          donate_href: string | null;
          donate_label: string | null;
          eyebrow: string;
          headline: string;
          hero_image_url: string | null;
          id: string;
          mission: string | null;
          subheadline: string | null;
          updated_at: string;
          vision: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          donate_href?: string | null;
          donate_label?: string | null;
          eyebrow?: string;
          headline?: string;
          hero_image_url?: string | null;
          id?: string;
          mission?: string | null;
          subheadline?: string | null;
          updated_at?: string;
          vision?: string | null;
        };
        Update: {
          created_at?: string;
          cta_href?: string | null;
          cta_label?: string | null;
          donate_href?: string | null;
          donate_label?: string | null;
          eyebrow?: string;
          headline?: string;
          hero_image_url?: string | null;
          id?: string;
          mission?: string | null;
          subheadline?: string | null;
          updated_at?: string;
          vision?: string | null;
        };
        Relationships: [];
      };
      foundation_stories: {
        Row: {
          anonymise: boolean;
          body: string;
          category: string;
          consent_recorded: boolean;
          cover_media_id: string | null;
          cover_url: string | null;
          created_at: string;
          featured: boolean;
          id: string;
          location: string | null;
          person_name: string;
          published_at: string | null;
          sections: NonNullable<Json>;
          seo_description: string;
          seo_title: string;
          slug: string;
          sort_order: number;
          status: string;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          anonymise?: boolean;
          body?: string;
          category?: string;
          consent_recorded?: boolean;
          cover_media_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          featured?: boolean;
          id?: string;
          location?: string | null;
          person_name: string;
          published_at?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug: string;
          sort_order?: number;
          status?: string;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          anonymise?: boolean;
          body?: string;
          category?: string;
          consent_recorded?: boolean;
          cover_media_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          featured?: boolean;
          id?: string;
          location?: string | null;
          person_name?: string;
          published_at?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug?: string;
          sort_order?: number;
          status?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "foundation_stories_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      gallery_images: {
        Row: {
          caption: string | null;
          chapter: string;
          created_at: string;
          id: string;
          image_url: string | null;
          media_id: string | null;
          published: boolean;
          section_id: string | null;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          chapter: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          media_id?: string | null;
          published?: boolean;
          section_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          caption?: string | null;
          chapter?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          media_id?: string | null;
          published?: boolean;
          section_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gallery_images_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
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
          cover_media_id: string | null;
          created_at: string;
          description: string;
          id: string;
          name: string;
          published: boolean;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cover_media_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          published?: boolean;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          cover_media_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          published?: boolean;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gallery_sections_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_secrets: {
        Row: {
          checked_at: string | null;
          ciphertext: string | null;
          config: NonNullable<Json>;
          iv: string | null;
          last_error: string | null;
          last4: string;
          locked_until: string | null;
          provider: string;
          status: string;
          synced_at: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          checked_at?: string | null;
          ciphertext?: string | null;
          config?: NonNullable<Json>;
          iv?: string | null;
          last_error?: string | null;
          last4?: string;
          locked_until?: string | null;
          provider: string;
          status?: string;
          synced_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          checked_at?: string | null;
          ciphertext?: string | null;
          config?: NonNullable<Json>;
          iv?: string | null;
          last_error?: string | null;
          last4?: string;
          locked_until?: string | null;
          provider?: string;
          status?: string;
          synced_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          book_id: string | null;
          consent_key: string;
          consent_version: number;
          created_at: string;
          email: string;
          email_normalized: string | null;
          first_name: string;
          id: string;
          last_requested_at: string;
          locale: string;
          newsletter_opt_in: boolean;
          source: string;
          subscriber_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          book_id?: string | null;
          consent_key: string;
          consent_version: number;
          created_at?: string;
          email: string;
          email_normalized?: never;
          first_name: string;
          id?: string;
          last_requested_at?: string;
          locale?: string;
          newsletter_opt_in?: boolean;
          source: string;
          subscriber_id?: string | null;
        };
        Update: {
          book_id?: string | null;
          consent_key?: string;
          consent_version?: number;
          created_at?: string;
          email?: string;
          email_normalized?: never;
          first_name?: string;
          id?: string;
          last_requested_at?: string;
          locale?: string;
          newsletter_opt_in?: boolean;
          source?: string;
          subscriber_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_subscriber_id_fkey";
            columns: ["subscriber_id"];
            isOneToOne: false;
            referencedRelation: "subscribers";
            referencedColumns: ["id"];
          },
        ];
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
        ComputedFields: never;
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
      masterclasses: {
        Row: {
          availability: string;
          cover_media_id: string | null;
          created_at: string;
          description: string;
          ends_at: string | null;
          enrol_product_id: string | null;
          enrol_url: string | null;
          format: string;
          id: string;
          included: string;
          location: string;
          position: number;
          price_label: string;
          published_at: string | null;
          schedule_note: string;
          sections: NonNullable<Json>;
          seo_description: string;
          seo_title: string;
          slug: string;
          starts_at: string | null;
          status: string;
          summary: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          availability?: string;
          cover_media_id?: string | null;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          enrol_product_id?: string | null;
          enrol_url?: string | null;
          format?: string;
          id?: string;
          included?: string;
          location?: string;
          position?: number;
          price_label?: string;
          published_at?: string | null;
          schedule_note?: string;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug: string;
          starts_at?: string | null;
          status?: string;
          summary?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          availability?: string;
          cover_media_id?: string | null;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          enrol_product_id?: string | null;
          enrol_url?: string | null;
          format?: string;
          id?: string;
          included?: string;
          location?: string;
          position?: number;
          price_label?: string;
          published_at?: string | null;
          schedule_note?: string;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug?: string;
          starts_at?: string | null;
          status?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "masterclasses_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "masterclasses_enrol_product_id_fkey";
            columns: ["enrol_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          alt: string;
          bucket: string;
          bytes: number;
          caption: string;
          created_at: string;
          created_by: string | null;
          credit: string;
          dominant_color: string | null;
          duration_seconds: number | null;
          focal_x: number;
          focal_y: number;
          height: number | null;
          id: string;
          kind: string;
          mime: string;
          original_name: string | null;
          path: string;
          status: string;
          updated_at: string;
          variants: NonNullable<Json>;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          alt?: string;
          bucket: string;
          bytes?: number;
          caption?: string;
          created_at?: string;
          created_by?: string | null;
          credit?: string;
          dominant_color?: string | null;
          duration_seconds?: number | null;
          focal_x?: number;
          focal_y?: number;
          height?: number | null;
          id?: string;
          kind: string;
          mime: string;
          original_name?: string | null;
          path: string;
          status?: string;
          updated_at?: string;
          variants?: NonNullable<Json>;
          width?: number | null;
        };
        Update: {
          alt?: string;
          bucket?: string;
          bytes?: number;
          caption?: string;
          created_at?: string;
          created_by?: string | null;
          credit?: string;
          dominant_color?: string | null;
          duration_seconds?: number | null;
          focal_x?: number;
          focal_y?: number;
          height?: number | null;
          id?: string;
          kind?: string;
          mime?: string;
          original_name?: string | null;
          path?: string;
          status?: string;
          updated_at?: string;
          variants?: NonNullable<Json>;
          width?: number | null;
        };
        Relationships: [];
      };
      navigation_items: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          label: string;
          menu: string;
          page_id: string | null;
          parent_id: string | null;
          position: number;
          updated_at: string;
          url: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          label: string;
          menu: string;
          page_id?: string | null;
          parent_id?: string | null;
          position?: number;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          label?: string;
          menu?: string;
          page_id?: string | null;
          parent_id?: string | null;
          position?: number;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "navigation_items_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_items_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "navigation_items";
            referencedColumns: ["id"];
          },
        ];
      };
      newsletters: {
        Row: {
          body: string;
          created_at: string;
          filter_source: string | null;
          header_image: string | null;
          id: string;
          locale_mode: string;
          recipient_count: number;
          scheduled_for: string | null;
          sent_at: string | null;
          status: string;
          subject: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          created_at?: string;
          filter_source?: string | null;
          header_image?: string | null;
          id?: string;
          locale_mode?: string;
          recipient_count?: number;
          scheduled_for?: string | null;
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
          locale_mode?: string;
          recipient_count?: number;
          scheduled_for?: string | null;
          sent_at?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          item_type: string;
          order_id: string;
          quantity: number;
          title: string;
          total_cents: number;
          unit_cents: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          item_type: string;
          order_id: string;
          quantity?: number;
          title: string;
          total_cents: number;
          unit_cents: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          item_type?: string;
          order_id?: string;
          quantity?: number;
          title?: string;
          total_cents?: number;
          unit_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          currency: string;
          email: string | null;
          fulfilment_status: string;
          id: string;
          locale: string;
          name: string | null;
          paid_at: string | null;
          refunded_at: string | null;
          return_path: string;
          shipped_at: string | null;
          shipping_address: Json | null;
          shipping_cents: number;
          status: string;
          stripe_payment_intent_id: string | null;
          stripe_session_id: string | null;
          subtotal_cents: number;
          tax_cents: number;
          total_cents: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          currency?: string;
          email?: string | null;
          fulfilment_status?: string;
          id?: string;
          locale?: string;
          name?: string | null;
          paid_at?: string | null;
          refunded_at?: string | null;
          return_path?: string;
          shipped_at?: string | null;
          shipping_address?: Json | null;
          shipping_cents?: number;
          status?: string;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          subtotal_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          email?: string | null;
          fulfilment_status?: string;
          id?: string;
          locale?: string;
          name?: string | null;
          paid_at?: string | null;
          refunded_at?: string | null;
          return_path?: string;
          shipped_at?: string | null;
          shipping_address?: Json | null;
          shipping_cents?: number;
          status?: string;
          stripe_payment_intent_id?: string | null;
          stripe_session_id?: string | null;
          subtotal_cents?: number;
          tax_cents?: number;
          total_cents?: number;
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
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          block_key: string;
          id?: string;
          page: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Update: {
          block_key?: string;
          id?: string;
          page?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          locked: boolean;
          noindex: boolean;
          og_image_id: string | null;
          path: string;
          published_at: string | null;
          sections: NonNullable<Json>;
          seo_description: string;
          seo_title: string;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind?: string;
          locked?: boolean;
          noindex?: boolean;
          og_image_id?: string | null;
          path: string;
          published_at?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          status?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          locked?: boolean;
          noindex?: boolean;
          og_image_id?: string | null;
          path?: string;
          published_at?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pages_og_image_id_fkey";
            columns: ["og_image_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      press_mentions: {
        Row: {
          created_at: string;
          headline: string;
          id: string;
          logo_media_id: string | null;
          outlet: string;
          position: number;
          published: boolean;
          published_on: string | null;
          updated_at: string;
          url: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          headline: string;
          id?: string;
          logo_media_id?: string | null;
          outlet: string;
          position?: number;
          published?: boolean;
          published_on?: string | null;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          headline?: string;
          id?: string;
          logo_media_id?: string | null;
          outlet?: string;
          position?: number;
          published?: boolean;
          published_on?: string | null;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "press_mentions_logo_media_id_fkey";
            columns: ["logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      preview_tokens: {
        Row: {
          created_at: string;
          created_by: string | null;
          entity_id: string;
          entity_type: string;
          expires_at: string;
          id: string;
          revoked_at: string | null;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          entity_id: string;
          entity_type: string;
          expires_at: string;
          id?: string;
          revoked_at?: string | null;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          entity_id?: string;
          entity_type?: string;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          token_hash?: string;
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
        ComputedFields: never;
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
          image_url: string | null;
          media_id: string | null;
          product_id: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          media_id?: string | null;
          product_id: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          media_id?: string | null;
          product_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_media_id_fkey";
            columns: ["media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
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
          compare_at_cents: number | null;
          cover_media_id: string | null;
          created_at: string;
          currency: string;
          delivery_media_id: string | null;
          description: string | null;
          featured: boolean;
          id: string;
          image_url: string | null;
          included: string | null;
          name: string;
          price: string | null;
          price_cents: number | null;
          product_type: string;
          published_at: string | null;
          sale_price: string | null;
          sections: NonNullable<Json>;
          seo_description: string;
          seo_title: string;
          slug: string;
          sort_order: number;
          status: string;
          stock: number | null;
          stock_note: string | null;
          stripe_price_id: string | null;
          updated_at: string;
          who_for: string | null;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          checkout_url?: string | null;
          compare_at_cents?: number | null;
          cover_media_id?: string | null;
          created_at?: string;
          currency?: string;
          delivery_media_id?: string | null;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          included?: string | null;
          name: string;
          price?: string | null;
          price_cents?: number | null;
          product_type?: string;
          published_at?: string | null;
          sale_price?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug: string;
          sort_order?: number;
          status?: string;
          stock?: number | null;
          stock_note?: string | null;
          stripe_price_id?: string | null;
          updated_at?: string;
          who_for?: string | null;
        };
        Update: {
          category_id?: string | null;
          checkout_url?: string | null;
          compare_at_cents?: number | null;
          cover_media_id?: string | null;
          created_at?: string;
          currency?: string;
          delivery_media_id?: string | null;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          included?: string | null;
          name?: string;
          price?: string | null;
          price_cents?: number | null;
          product_type?: string;
          published_at?: string | null;
          sale_price?: string | null;
          sections?: NonNullable<Json>;
          seo_description?: string;
          seo_title?: string;
          slug?: string;
          sort_order?: number;
          status?: string;
          stock?: number | null;
          stock_note?: string | null;
          stripe_price_id?: string | null;
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
          {
            foreignKeyName: "products_cover_media_id_fkey";
            columns: ["cover_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_delivery_media_id_fkey";
            columns: ["delivery_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      redirects: {
        Row: {
          created_at: string;
          enabled: boolean;
          from_path: string;
          hits: number;
          id: string;
          last_hit_at: string | null;
          status_code: number;
          to_path: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          enabled?: boolean;
          from_path: string;
          hits?: number;
          id?: string;
          last_hit_at?: string | null;
          status_code?: number;
          to_path: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          from_path?: string;
          hits?: number;
          id?: string;
          last_hit_at?: string | null;
          status_code?: number;
          to_path?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          charity_number: string;
          company_number: string;
          contact_email: string;
          default_seo_description: string;
          default_seo_title: string;
          favicon_media_id: string | null;
          footer_text: string;
          id: string;
          legal_address: string;
          legal_name: string;
          logo_media_id: string | null;
          site_name: string;
          social_image_id: string | null;
          tagline: string;
          updated_at: string;
          updated_by: string | null;
          vat_number: string;
        };
        ComputedFields: never;
        Insert: {
          charity_number?: string;
          company_number?: string;
          contact_email?: string;
          default_seo_description?: string;
          default_seo_title?: string;
          favicon_media_id?: string | null;
          footer_text?: string;
          id?: string;
          legal_address?: string;
          legal_name?: string;
          logo_media_id?: string | null;
          site_name?: string;
          social_image_id?: string | null;
          tagline?: string;
          updated_at?: string;
          updated_by?: string | null;
          vat_number?: string;
        };
        Update: {
          charity_number?: string;
          company_number?: string;
          contact_email?: string;
          default_seo_description?: string;
          default_seo_title?: string;
          favicon_media_id?: string | null;
          footer_text?: string;
          id?: string;
          legal_address?: string;
          legal_name?: string;
          logo_media_id?: string | null;
          site_name?: string;
          social_image_id?: string | null;
          tagline?: string;
          updated_at?: string;
          updated_by?: string | null;
          vat_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_settings_favicon_media_id_fkey";
            columns: ["favicon_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_settings_logo_media_id_fkey";
            columns: ["logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_settings_social_image_id_fkey";
            columns: ["social_image_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      social_links: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          label: string;
          platform: string;
          position: number;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          label?: string;
          platform: string;
          position?: number;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          label?: string;
          platform?: string;
          position?: number;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
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
        ComputedFields: never;
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
        ComputedFields: never;
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
        ComputedFields: never;
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
      stripe_events: {
        Row: {
          id: string;
          received_at: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          received_at?: string;
          type: string;
        };
        Update: {
          id?: string;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
      };
      subscribers: {
        Row: {
          confirm_sent_at: string | null;
          confirm_token_hash: string | null;
          confirmed_at: string | null;
          consent_key: string | null;
          consent_source: string | null;
          consent_version: number | null;
          created_at: string;
          email: string;
          id: string;
          locale: string;
          name: string | null;
          source: string | null;
          status: string;
          unsubscribe_token: string;
          unsubscribed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          confirm_sent_at?: string | null;
          confirm_token_hash?: string | null;
          confirmed_at?: string | null;
          consent_key?: string | null;
          consent_source?: string | null;
          consent_version?: number | null;
          created_at?: string;
          email: string;
          id?: string;
          locale?: string;
          name?: string | null;
          source?: string | null;
          status?: string;
          unsubscribe_token?: string;
          unsubscribed_at?: string | null;
        };
        Update: {
          confirm_sent_at?: string | null;
          confirm_token_hash?: string | null;
          confirmed_at?: string | null;
          consent_key?: string | null;
          consent_source?: string | null;
          consent_version?: number | null;
          created_at?: string;
          email?: string;
          id?: string;
          locale?: string;
          name?: string | null;
          source?: string | null;
          status?: string;
          unsubscribe_token?: string;
          unsubscribed_at?: string | null;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          book_id: string | null;
          created_at: string;
          id: string;
          name: string;
          photo_media_id: string | null;
          position: number;
          published: boolean;
          quote: string;
          role: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          book_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          photo_media_id?: string | null;
          position?: number;
          published?: boolean;
          quote: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          book_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          photo_media_id?: string | null;
          position?: number;
          published?: boolean;
          quote?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "testimonials_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonials_photo_media_id_fkey";
            columns: ["photo_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      ui_string_reviews: {
        Row: {
          approved_at: string;
          approved_by: string;
          key: string;
          locale: string;
          text_hash: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string;
          approved_by: string;
          key: string;
          locale?: string;
          text_hash: string;
        };
        Update: {
          approved_at?: string;
          approved_by?: string;
          key?: string;
          locale?: string;
          text_hash?: string;
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
        ComputedFields: never;
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
      videos: {
        Row: {
          created_at: string;
          description: string;
          duration_seconds: number | null;
          featured: boolean;
          hidden: boolean;
          id: string;
          position: number | null;
          published_at: string | null;
          synced_at: string;
          thumbnail_media_id: string | null;
          title: string;
          updated_at: string;
          youtube_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string;
          duration_seconds?: number | null;
          featured?: boolean;
          hidden?: boolean;
          id?: string;
          position?: number | null;
          published_at?: string | null;
          synced_at?: string;
          thumbnail_media_id?: string | null;
          title: string;
          updated_at?: string;
          youtube_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          duration_seconds?: number | null;
          featured?: boolean;
          hidden?: boolean;
          id?: string;
          position?: number | null;
          published_at?: string | null;
          synced_at?: string;
          thumbnail_media_id?: string | null;
          title?: string;
          updated_at?: string;
          youtube_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "videos_thumbnail_media_id_fkey";
            columns: ["thumbnail_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_outbox: {
        Args: { p_limit?: number };
        Returns: Database["public"]["Tables"]["email_outbox"]["Row"][];
        SetofOptions: { from: "*"; to: "email_outbox"; isOneToOne: false; isSetofReturn: true };
      };
      draft_protected_columns: { Args: Record<PropertyKey, never>; Returns: string[] };
      entity_table: { Args: { _entity_type: string }; Returns: string };
      free_download_locales: {
        Args: { _book_ids: string[] };
        Returns: {
          book_id: string;
          locale: string;
        }[];
      };
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string };
        Returns: boolean;
      };
      hit_rate_limit: {
        Args: { _key: string; _limit: number; _window_seconds: number };
        Returns: boolean;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_translator: { Args: Record<PropertyKey, never>; Returns: boolean };
      public_integrations: { Args: Record<PropertyKey, never>; Returns: Json };
      publish_draft: {
        Args: {
          _english_hashes?: Json;
          _entity_id: string;
          _entity_type: string;
          _status?: string;
        };
        Returns: Json;
      };
      purge_expired: { Args: Record<PropertyKey, never>; Returns: Json };
      restore_version: { Args: { _version_id: string }; Returns: Json };
      session_is_active: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "translator";
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "translator"],
    },
  },
} as const;
