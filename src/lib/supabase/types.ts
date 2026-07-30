/**
 * Database types for the RishAlgo AI Supabase project.
 *
 * Regenerate after any migration with:
 *   npx supabase gen types typescript --project-id tdhjywyfaciqbgxawrqk > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string | null;
          name: string | null;
          email: string | null;
          photo_url: string | null;
          bio: string | null;
          college: string | null;
          github: string | null;
          linkedin: string | null;
          leetcode: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle?: string | null;
          name?: string | null;
          email?: string | null;
          photo_url?: string | null;
          bio?: string | null;
          college?: string | null;
          github?: string | null;
          linkedin?: string | null;
          leetcode?: string | null;
          is_public?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      progress: {
        Row: {
          user_id: string;
          easy: number;
          medium: number;
          hard: number;
          xp: number;
          coins: number;
          streak: number;
          contest_rating: number;
          last_active_day: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          easy?: number;
          medium?: number;
          hard?: number;
          xp?: number;
          coins?: number;
          streak?: number;
          contest_rating?: number;
          last_active_day?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["progress"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          preferred_language: string;
          editor_theme: string;
          ui_theme: string;
          voice_enabled: boolean;
          editor_font_size: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          preferred_language?: string;
          editor_theme?: string;
          ui_theme?: string;
          voice_enabled?: boolean;
          editor_font_size?: number;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
      badges: {
        Row: { id: string; user_id: string; badge_id: string; earned_at: string };
        Insert: { id?: string; user_id: string; badge_id: string; earned_at?: string };
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
        Relationships: [];
      };
      problems: {
        Row: {
          slug: string;
          title: string;
          difficulty: string;
          topics: string[];
          companies: string[];
          acceptance: number;
          created_at: string;
        };
        Insert: {
          slug: string;
          title: string;
          difficulty: string;
          topics?: string[];
          companies?: string[];
          acceptance?: number;
        };
        Update: Partial<Database["public"]["Tables"]["problems"]["Insert"]>;
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          user_id: string;
          problem_slug: string;
          language: string;
          code: string;
          status: string;
          passed: number;
          total: number;
          runtime_ms: number | null;
          memory_kb: number | null;
          duration_sec: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_slug: string;
          language: string;
          code: string;
          status: string;
          passed?: number;
          total?: number;
          runtime_ms?: number | null;
          memory_kb?: number | null;
          duration_sec?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["submissions"]["Insert"]>;
        Relationships: [];
      };
      saved_code: {
        Row: {
          user_id: string;
          problem_slug: string;
          language: string;
          code: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          problem_slug: string;
          language: string;
          code: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_code"]["Insert"]>;
        Relationships: [];
      };
      problem_notes: {
        Row: { user_id: string; problem_slug: string; note: string; updated_at: string };
        Insert: { user_id: string; problem_slug: string; note?: string };
        Update: Partial<Database["public"]["Tables"]["problem_notes"]["Insert"]>;
        Relationships: [];
      };
      bookmarks: {
        Row: { user_id: string; problem_slug: string; created_at: string };
        Insert: { user_id: string; problem_slug: string };
        Update: Partial<Database["public"]["Tables"]["bookmarks"]["Insert"]>;
        Relationships: [];
      };
      recent_views: {
        Row: { user_id: string; problem_slug: string; viewed_at: string };
        Insert: { user_id: string; problem_slug: string; viewed_at?: string };
        Update: Partial<Database["public"]["Tables"]["recent_views"]["Insert"]>;
        Relationships: [];
      };
      custom_test_cases: {
        Row: {
          id: string;
          user_id: string;
          problem_slug: string;
          args: Json;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_slug: string;
          args: Json;
          label?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["custom_test_cases"]["Insert"]>;
        Relationships: [];
      };
      hints_used: {
        Row: {
          id: string;
          user_id: string;
          problem_slug: string;
          level: number;
          created_at: string;
        };
        Insert: { id?: string; user_id: string; problem_slug: string; level: number };
        Update: Partial<Database["public"]["Tables"]["hints_used"]["Insert"]>;
        Relationships: [];
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          pack_id: string;
          company: string;
          mode: string;
          problem_slug: string | null;
          difficulty: string | null;
          overall_score: number;
          verdict: string | null;
          scores: Json;
          strengths: string[];
          recommendations: string[];
          metrics: Json;
          duration_sec: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pack_id: string;
          company: string;
          mode: string;
          problem_slug?: string | null;
          difficulty?: string | null;
          overall_score?: number;
          verdict?: string | null;
          scores?: Json;
          strengths?: string[];
          recommendations?: string[];
          metrics?: Json;
          duration_sec?: number;
        };
        Update: Partial<Database["public"]["Tables"]["interview_sessions"]["Insert"]>;
        Relationships: [];
      };
      interview_messages: {
        Row: {
          id: string;
          session_id: string;
          speaker: string;
          message: string;
          t_seconds: number;
          stage: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          speaker: string;
          message: string;
          t_seconds?: number;
          stage?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["interview_messages"]["Insert"]>;
        Relationships: [];
      };
      ai_chats: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          problem_slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          problem_slug?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ai_chats"]["Insert"]>;
        Relationships: [];
      };
      ai_chat_messages: {
        Row: {
          id: string;
          chat_id: string;
          role: string;
          content: string;
          source: string | null;
          hint_level: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: string;
          content: string;
          source?: string | null;
          hint_level?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["ai_chat_messages"]["Insert"]>;
        Relationships: [];
      };
      saved_visualizations: {
        Row: {
          id: string;
          user_id: string;
          algorithm_id: string;
          algorithm_name: string;
          input: Json;
          step_count: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          algorithm_id: string;
          algorithm_name: string;
          input: Json;
          step_count?: number;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["saved_visualizations"]["Insert"]>;
        Relationships: [];
      };
      contest_results: {
        Row: {
          id: string;
          user_id: string;
          contest_id: string;
          contest_name: string;
          rank: number | null;
          participants: number | null;
          solved: number;
          total: number;
          rating_change: number;
          rating_after: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contest_id: string;
          contest_name: string;
          rank?: number | null;
          participants?: number | null;
          solved?: number;
          total?: number;
          rating_change?: number;
          rating_after?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["contest_results"]["Insert"]>;
        Relationships: [];
      };
      roadmap_progress: {
        Row: { user_id: string; topic_id: string; status: string; updated_at: string };
        Insert: { user_id: string; topic_id: string; status?: string };
        Update: Partial<Database["public"]["Tables"]["roadmap_progress"]["Insert"]>;
        Relationships: [];
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          filename: string | null;
          content: string;
          projects: string[];
          version: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename?: string | null;
          content: string;
          projects?: string[];
          version?: number;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["resumes"]["Insert"]>;
        Relationships: [];
      };
      certificates: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          issued_for: string | null;
          url: string | null;
          issued_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          issued_for?: string | null;
          url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["certificates"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      record_submission: {
        Args: {
          p_problem_slug: string;
          p_language: string;
          p_code: string;
          p_status: string;
          p_passed: number;
          p_total: number;
          p_runtime_ms?: number;
          p_memory_kb?: number;
          p_duration_sec?: number;
        };
        Returns: Database["public"]["Tables"]["progress"]["Row"];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type ProgressRow = Tables<"progress">;
export type SubmissionRow = Tables<"submissions">;
export type InterviewSessionRow = Tables<"interview_sessions">;
export type InterviewMessageRow = Tables<"interview_messages">;
export type AiChatRow = Tables<"ai_chats">;
export type AiChatMessageRow = Tables<"ai_chat_messages">;
export type SavedVizRow = Tables<"saved_visualizations">;
