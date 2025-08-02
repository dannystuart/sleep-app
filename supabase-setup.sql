-- Theta Sleep App Database Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Coaches table (removed audio_base_url)
CREATE TABLE coaches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  locale text,
  style text,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Classes table (removed audio columns)
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Session Audio table (NEW - links coach+class to specific audio file)
CREATE TABLE session_audio (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id uuid REFERENCES coaches(id) NOT NULL,
  class_id uuid REFERENCES classes(id) NOT NULL,
  audio_url text NOT NULL,  -- full URL to the specific audio file for this coach+class combination
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id, class_id)  -- ensure one audio file per coach+class combination
);

-- Analytics events table
CREATE TABLE session_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type text NOT NULL,
  coach_id uuid REFERENCES coaches(id),
  class_id uuid REFERENCES classes(id),
  timer_seconds integer NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to coaches and classes
CREATE POLICY "Allow public read access to coaches" ON coaches
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to classes" ON classes
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to session_audio" ON session_audio
  FOR SELECT USING (true);

-- Create policies for public insert access to session_events
CREATE POLICY "Allow public insert access to session_events" ON session_events
  FOR INSERT WITH CHECK (true);

-- Insert sample data (replace YOUR_PROJECT_URL with your actual Supabase project URL)
INSERT INTO coaches (name, locale, style, image_url) VALUES
  ('Sarah', 'British', 'Smooth & Calm', 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/coaches/sarah.jpg'),
  ('Michael', 'American', 'Deep & Soothing', 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/coaches/michael.jpg'),
  ('Emma', 'Australian', 'Gentle & Warm', 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/coaches/emma.jpg');

INSERT INTO classes (name, tags) VALUES
  ('Mixed Level 1', ARRAY['Maths', 'Memory', 'Word', 'Facts']),
  ('Maths', ARRAY['Maths']),
  ('Memory', ARRAY['Memory']),
  ('Word', ARRAY['Word']),
  ('Facts', ARRAY['Facts']);

-- Insert session audio combinations (coach + class = specific audio file)
-- You'll need to replace the audio URLs with your actual audio files
INSERT INTO session_audio (coach_id, class_id, audio_url) VALUES
  -- Sarah's audio files
  ((SELECT id FROM coaches WHERE name = 'Sarah'), (SELECT id FROM classes WHERE name = 'Mixed Level 1'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/sarah-mixed-level-1.mp3'),
  ((SELECT id FROM coaches WHERE name = 'Sarah'), (SELECT id FROM classes WHERE name = 'Maths'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/sarah-maths.mp3'),
  ((SELECT id FROM coaches WHERE name = 'Sarah'), (SELECT id FROM classes WHERE name = 'Memory'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/sarah-memory.mp3'),
  
  -- Michael's audio files
  ((SELECT id FROM coaches WHERE name = 'Michael'), (SELECT id FROM classes WHERE name = 'Mixed Level 1'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/michael-mixed-level-1.mp3'),
  ((SELECT id FROM coaches WHERE name = 'Michael'), (SELECT id FROM classes WHERE name = 'Maths'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/michael-maths.mp3'),
  ((SELECT id FROM coaches WHERE name = 'Michael'), (SELECT id FROM classes WHERE name = 'Memory'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/michael-memory.mp3'),
  
  -- Emma's audio files
  ((SELECT id FROM coaches WHERE name = 'Emma'), (SELECT id FROM classes WHERE name = 'Mixed Level 1'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/emma-mixed-level-1.mp3'),
  ((SELECT id FROM coaches WHERE name = 'Emma'), (SELECT id FROM classes WHERE name = 'Maths'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/emma-maths.mp3'),
  ((SELECT id FROM coaches WHERE name = 'Emma'), (SELECT id FROM classes WHERE name = 'Memory'), 'https://YOUR_PROJECT_URL.supabase.co/storage/v1/object/public/audio/emma-memory.mp3'); 