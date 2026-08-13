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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          actor_type: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      candidate_codes: {
        Row: {
          active: boolean
          active_device_at: string | null
          active_device_token: string | null
          candidate_email: string | null
          candidate_name: string
          candidate_type: string
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          last_seen_at: string | null
          position_applied: string | null
          used_at: string | null
        }
        Insert: {
          active?: boolean
          active_device_at?: string | null
          active_device_token?: string | null
          candidate_email?: string | null
          candidate_name: string
          candidate_type?: string
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_seen_at?: string | null
          position_applied?: string | null
          used_at?: string | null
        }
        Update: {
          active?: boolean
          active_device_at?: string | null
          active_device_token?: string | null
          candidate_email?: string | null
          candidate_name?: string
          candidate_type?: string
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_seen_at?: string | null
          position_applied?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      candidate_file_versions: {
        Row: {
          candidate_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          uploaded_at: string
          uploader_id: string | null
          uploader_kind: string
          uploader_label: string | null
          version: number
        }
        Insert: {
          candidate_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          uploader_id?: string | null
          uploader_kind: string
          uploader_label?: string | null
          version: number
        }
        Update: {
          candidate_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          uploader_id?: string | null
          uploader_kind?: string
          uploader_label?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_file_versions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_files: {
        Row: {
          candidate_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          uploaded_at: string
        }
        Insert: {
          candidate_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
        }
        Update: {
          candidate_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_files_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_retake_requests: {
        Row: {
          candidate_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          reason: string | null
          requested_by: string | null
          status: string
          test_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason?: string | null
          requested_by?: string | null
          status?: string
          test_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason?: string | null
          requested_by?: string | null
          status?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_retake_requests_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_retake_requests_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_test_access: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          is_open: boolean
          last_reopened_at: string | null
          reason: string | null
          retake_count: number
          test_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          is_open?: boolean
          last_reopened_at?: string | null
          reason?: string | null
          retake_count?: number
          test_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          is_open?: boolean
          last_reopened_at?: string | null
          reason?: string | null
          retake_count?: number
          test_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_test_access_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_test_access_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          address: string | null
          age: number | null
          birth_date: string | null
          birth_place: string | null
          code_id: string | null
          code_snapshot: string | null
          created_at: string
          data_completed: boolean
          education: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          major: string | null
          marital_status: string | null
          nik: string | null
          phone: string | null
          position_applied: string | null
          school_name: string | null
          semester: string | null
          updated_at: string
          work_experience: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          birth_date?: string | null
          birth_place?: string | null
          code_id?: string | null
          code_snapshot?: string | null
          created_at?: string
          data_completed?: boolean
          education?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          major?: string | null
          marital_status?: string | null
          nik?: string | null
          phone?: string | null
          position_applied?: string | null
          school_name?: string | null
          semester?: string | null
          updated_at?: string
          work_experience?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          birth_date?: string | null
          birth_place?: string | null
          code_id?: string | null
          code_snapshot?: string | null
          created_at?: string
          data_completed?: boolean
          education?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          major?: string | null
          marital_status?: string | null
          nik?: string | null
          phone?: string | null
          position_applied?: string | null
          school_name?: string | null
          semester?: string | null
          updated_at?: string
          work_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: true
            referencedRelation: "candidate_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      error_events: {
        Row: {
          actor_label: string | null
          area: string
          context: Json
          id: string
          ip: string | null
          message: string
          occurred_at: string
          resolution_note: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          route: string | null
          source: string
          stack: string | null
          user_agent: string | null
        }
        Insert: {
          actor_label?: string | null
          area?: string
          context?: Json
          id?: string
          ip?: string | null
          message: string
          occurred_at?: string
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          source?: string
          stack?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_label?: string | null
          area?: string
          context?: Json
          id?: string
          ip?: string | null
          message?: string
          occurred_at?: string
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          source?: string
          stack?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      proctor_snapshots: {
        Row: {
          attempt_id: string | null
          candidate_id: string
          captured_at: string
          event: string
          id: string
          image_path: string
          test_id: string | null
        }
        Insert: {
          attempt_id?: string | null
          candidate_id: string
          captured_at?: string
          event?: string
          id?: string
          image_path: string
          test_id?: string | null
        }
        Update: {
          attempt_id?: string | null
          candidate_id?: string
          captured_at?: string
          event?: string
          id?: string
          image_path?: string
          test_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      test_answers: {
        Row: {
          answer: string | null
          attempt_id: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          answer?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          answer?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          candidate_id: string
          finished_at: string | null
          id: string
          result: Json | null
          score: number | null
          started_at: string
          status: string
          test_id: string
        }
        Insert: {
          candidate_id: string
          finished_at?: string | null
          id?: string
          result?: Json | null
          score?: number | null
          started_at?: string
          status?: string
          test_id: string
        }
        Update: {
          candidate_id?: string
          finished_at?: string | null
          id?: string
          result?: Json | null
          score?: number | null
          started_at?: string
          status?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          active: boolean
          correct_answer: string | null
          created_at: string
          dimension: string | null
          id: string
          options: Json | null
          question_number: number
          question_text: string
          test_id: string
        }
        Insert: {
          active?: boolean
          correct_answer?: string | null
          created_at?: string
          dimension?: string | null
          id?: string
          options?: Json | null
          question_number: number
          question_text: string
          test_id: string
        }
        Update: {
          active?: boolean
          correct_answer?: string | null
          created_at?: string
          dimension?: string | null
          id?: string
          options?: Json | null
          question_number?: number
          question_text?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          active: boolean
          audience: string
          code: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          test_type: string
          voice_audio_mime: string | null
          voice_audio_name: string | null
          voice_audio_path: string | null
          voice_autoplay: boolean
          voice_enabled: boolean
          voice_instruction: string | null
          voice_lang: string
          voice_mode: string
          voice_rate: number
        }
        Insert: {
          active?: boolean
          audience?: string
          code: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          test_type: string
          voice_audio_mime?: string | null
          voice_audio_name?: string | null
          voice_audio_path?: string | null
          voice_autoplay?: boolean
          voice_enabled?: boolean
          voice_instruction?: string | null
          voice_lang?: string
          voice_mode?: string
          voice_rate?: number
        }
        Update: {
          active?: boolean
          audience?: string
          code?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          test_type?: string
          voice_audio_mime?: string | null
          voice_audio_name?: string | null
          voice_audio_path?: string | null
          voice_autoplay?: boolean
          voice_enabled?: boolean
          voice_instruction?: string | null
          voice_lang?: string
          voice_mode?: string
          voice_rate?: number
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "hr"
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
      app_role: ["admin", "hr"],
    },
  },
} as const
