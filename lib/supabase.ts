import { createClient } from '@supabase/supabase-js';
import { Coach, Class, SessionAudio, SessionEvent } from '../types';

// You'll need to add these to your environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fvqaqorrrdfvldwpebko.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cWFxb3JycmRmdmxkd3BlYmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTI5MzgsImV4cCI6MjA2OTY4ODkzOH0.I6HKzjFHnBGeGFnM8alaLusinRSDS_jvM8rjpeWVbcA';

export const supabase = createClient<{
  public: {
    Tables: {
      coaches: {
        Row: Coach;
        Insert: Omit<Coach, 'id' | 'created_at'>;
        Update: Partial<Omit<Coach, 'id' | 'created_at'>>;
      };
      classes: {
        Row: Class;
        Insert: Omit<Class, 'id' | 'created_at'>;
        Update: Partial<Omit<Class, 'id' | 'created_at'>>;
      };
      session_audio: {
        Row: SessionAudio;
        Insert: Omit<SessionAudio, 'id' | 'created_at'>;
        Update: Partial<Omit<SessionAudio, 'id' | 'created_at'>>;
      };
      session_events: {
        Row: SessionEvent;
        Insert: Omit<SessionEvent, 'id' | 'occurred_at'>;
        Update: Partial<Omit<SessionEvent, 'id' | 'occurred_at'>>;
      };
    };
  };
}>(SUPABASE_URL, SUPABASE_ANON_KEY); 