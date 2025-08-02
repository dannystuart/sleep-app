# Complete Setup Guide for Theta Sleep App

This guide provides step-by-step instructions to set up the complete functionality for your sleep app.

## Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g @expo/cli`)
- Supabase account and project
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

## Step 1: Project Setup

### 1.1 Install Dependencies

The following packages have been added to your project:

```bash
npm install @react-native-async-storage/async-storage @supabase/supabase-js expo-av
```

### 1.2 Environment Configuration

Create a `.env` file in your project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual Supabase project URL and anon key from your Supabase dashboard.

## Step 2: Supabase Database Setup

### 2.1 Create Database Tables

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Coaches table
CREATE TABLE coaches (
  id             uuid       PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           text       NOT NULL,
  locale         text       NULL,           -- e.g. "British"
  style          text       NULL,           -- e.g. "smooth & calm"
  image_url      text       NOT NULL,       -- public URL in Supabase Storage
  audio_base_url text       NOT NULL,       -- e.g. https://xyz.supabase.co/storage/v1/…/coaches/
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Classes table
CREATE TABLE classes (
  id             uuid       PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           text       NOT NULL,       -- e.g. "Mixed Level 1"
  tags           text[]     NULL,           -- e.g. ['Maths','Memory','Word','Facts']
  audio_base_url text       NOT NULL,       -- folder URL for this class's prompts
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Analytics events table
CREATE TABLE session_events (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type     text        NOT NULL,      -- e.g. "session_start"
  coach_id       uuid        REFERENCES coaches(id),
  class_id       uuid        REFERENCES classes(id),
  timer_seconds  int         NOT NULL,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to coaches" ON coaches FOR SELECT USING (true);
CREATE POLICY "Allow public read access to classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to session_events" ON session_events FOR INSERT WITH CHECK (true);
```

### 2.2 Insert Sample Data

Add sample coaches and classes to test the app:

```sql
-- Insert sample coaches
INSERT INTO coaches (name, locale, style, image_url, audio_base_url) VALUES
('James', 'British', 'smooth & calm', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://your-supabase-url.supabase.co/storage/v1/object/public/audio/coaches/'),
('Nathan', 'British', 'engaging & warm', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://your-supabase-url.supabase.co/storage/v1/object/public/audio/coaches/'),
('Autumn', 'American', 'reflective & soothing', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400', 'https://your-supabase-url.supabase.co/storage/v1/object/public/audio/coaches/');

-- Insert sample classes
INSERT INTO classes (name, tags, audio_base_url) VALUES
('Mixed Level 1', ARRAY['Maths', 'Memory', 'Word', 'Facts'], 'https://your-supabase-url.supabase.co/storage/v1/object/public/audio/classes/'),
('Maths Focus', ARRAY['Maths', 'Calculation'], 'https://your-supabase-url.supabase.co/storage/v1/object/public/audio/classes/'),
('Memory Training', ARRAY['Memory', 'Recall'], 'https://your-supabase-url.supabase.co/storage/v1/object/public/audio/classes/');
```

**Important**: Replace `your-supabase-url` with your actual Supabase project URL.

## Step 3: Supabase Storage Setup

### 3.1 Create Storage Buckets

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create two buckets:
   - `audio` (for audio files)
   - `images` (for coach images)

### 3.2 Set Storage Policies

Run these SQL commands to allow public read access:

```sql
-- Allow public read access to audio files
CREATE POLICY "Allow public read access to audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio');

-- Allow public read access to images
CREATE POLICY "Allow public read access to images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
```

### 3.3 Upload Audio Files

Organize your audio files in the storage buckets:

```
audio/
├── coaches/
│   ├── coach-id-1.mp3
│   ├── coach-id-2.mp3
│   └── coach-id-3.mp3
└── classes/
    ├── class-id-1.mp3
    ├── class-id-2.mp3
    └── class-id-3.mp3
```

**Note**: The coach and class IDs in the filenames should match the UUIDs from your database.

## Step 4: Code Implementation

The following files have been created/updated in your project:

### 4.1 Type Definitions (`types/index.ts`)
- Defines TypeScript interfaces for Coach, Class, SessionEvent, and AppState
- Provides type safety throughout the application

### 4.2 Supabase Client (`lib/supabase.ts`)
- Configures Supabase client with proper TypeScript types
- Handles database connections and queries

### 4.3 Storage Helpers (`lib/storage.ts`)
- Manages AsyncStorage operations for user preferences
- Provides consistent storage key management

### 4.4 App Context (`contexts/AppContext.tsx`)
- Central state management for the entire app
- Handles data fetching, persistence, and analytics
- Provides methods for updating user selections

### 4.5 Updated Screens
- **Home Screen**: Now displays selected coach, class, and timer
- **Settings Screen**: Shows current selections and allows navigation to selection screens
- **Choose Coach**: Lists all coaches with selection functionality
- **Choose Class**: Lists all classes with tags and selection functionality
- **Sleep Timer**: Allows timer duration selection
- **Sleep Session**: Full audio playback with progress tracking and analytics

## Step 5: Testing the Implementation

### 5.1 Start the Development Server

```bash
npm run dev
```

### 5.2 Test the App Flow

1. **Home Screen**: Should display selected coach, class, and timer
2. **Settings**: Navigate to settings and verify current selections
3. **Coach Selection**: Choose a coach and verify it updates on home screen
4. **Class Selection**: Choose a class and verify it updates on home screen
5. **Timer Selection**: Choose a timer and verify it updates on home screen
6. **Session Start**: Press "Start Session" and verify analytics logging

### 5.3 Verify Analytics

Check your Supabase `session_events` table to see if events are being logged:
- `select_coach` events when coaches are selected
- `select_class` events when classes are selected
- `select_timer` events when timers are selected
- `session_start` events when sessions begin
- `session_complete` events when sessions end

## Step 6: Audio Implementation

### 6.1 Audio File Requirements

- Format: MP3
- Quality: 128kbps or higher
- Duration: Varies by coach/class
- Naming: Must match database UUIDs

### 6.2 Audio Playback Flow

1. **Coach Audio**: Plays first (introduction/guidance)
2. **Class Audio**: Plays second (mental tasks)
3. **Timer**: Controls total session duration

### 6.3 Audio Configuration

The app is configured for:
- Background playback
- Silent mode playback
- Automatic audio ducking
- Progress tracking

## Step 7: Production Deployment

### 7.1 Environment Variables

Ensure your production environment has the correct Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

### 7.2 Build Commands

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Web
npm run build:web
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase URL and anon key
   - Check network connectivity
   - Ensure RLS policies are correct

2. **Audio Not Playing**
   - Verify audio file URLs are accessible
   - Check audio file format and naming
   - Ensure storage policies allow public read access

3. **Storage Issues**
   - Check AsyncStorage permissions
   - Verify storage keys are correct
   - Clear app data if needed

4. **Analytics Not Logging**
   - Check database permissions
   - Verify event types match expected values
   - Check network connectivity

### Debug Mode

Enable debug logging by adding console.log statements in the AppContext:

```typescript
// In contexts/AppContext.tsx
const logEvent = async (event: Omit<SessionEvent, 'id' | 'occurred_at'>) => {
  try {
    console.log('Logging event:', event);
    await supabase.from('session_events').insert([event]);
    console.log('Event logged successfully');
  } catch (error) {
    console.error('Error logging event:', error);
  }
};
```

## Next Steps

1. **Add Real Audio Files**: Upload actual coach and class audio files to Supabase Storage
2. **Customize UI**: Adjust styling and branding to match your design
3. **Add User Authentication**: Implement user accounts if needed
4. **Enhanced Analytics**: Add more detailed tracking and reporting
5. **Offline Support**: Implement offline audio caching
6. **Push Notifications**: Add session reminders and notifications

## Support

If you encounter any issues during setup:

1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure Supabase tables and policies are created properly
4. Test with sample data before adding real content

The implementation is now complete and ready for testing and customization! 