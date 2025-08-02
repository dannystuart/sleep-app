# Theta Sleep App

A React Native sleep app with audio playback, coach selection, and analytics tracking.

## Features

- **Coach Selection**: Choose from different voice coaches with unique styles
- **Class Selection**: Select from various mental task classes (Maths, Memory, Word, Facts)
- **Timer Control**: Customizable session duration (5-30 minutes)
- **Audio Playback**: Seamless audio streaming with progress tracking
- **Analytics**: Track user interactions and session data
- **Local Storage**: Persist user preferences locally
- **Database Integration**: Store coaches, classes, and analytics in Supabase

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router
- **State Management**: React Context
- **Database**: Supabase (PostgreSQL)
- **Audio**: Expo AV
- **Storage**: AsyncStorage
- **Styling**: React Native StyleSheet

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase Database Setup

#### Create Tables

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

#### Sample Data

Insert sample coaches and classes:

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

### 4. Supabase Storage Setup

1. Create storage buckets in Supabase:
   - `audio` bucket for audio files
   - `images` bucket for coach images

2. Set up storage policies:

```sql
-- Allow public read access to audio files
CREATE POLICY "Allow public read access to audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio');

-- Allow public read access to images
CREATE POLICY "Allow public read access to images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
```

### 5. Audio File Structure

Organize your audio files in Supabase Storage:

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

## Project Structure

```
project/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home screen
│   │   ├── settings.tsx   # Settings screen
│   │   └── _layout.tsx    # Tab layout
│   ├── choose-coach.tsx   # Coach selection
│   ├── choose-class.tsx   # Class selection
│   ├── sleep-timer.tsx    # Timer selection
│   ├── sleep-session.tsx  # Session playback
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
├── contexts/             # React Context providers
│   └── AppContext.tsx    # Main app state
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase client
│   └── storage.ts        # AsyncStorage helpers
├── types/                # TypeScript type definitions
│   └── index.ts          # App types
└── assets/               # Static assets
```

## Data Flow

### 1. App Initialization
- Fetch coaches and classes from Supabase
- Load user preferences from AsyncStorage
- Initialize app context with default values

### 2. User Interactions
- **Coach Selection**: Updates AsyncStorage and logs analytics event
- **Class Selection**: Updates AsyncStorage and logs analytics event
- **Timer Selection**: Updates AsyncStorage and logs analytics event

### 3. Session Management
- **Session Start**: Logs analytics event and starts audio playback
- **Session Progress**: Tracks audio progress and timer countdown
- **Session End**: Logs completion event and cleans up resources

## Analytics Events

The app tracks the following events in the `session_events` table:

- `select_coach`: When user selects a coach
- `select_class`: When user selects a class
- `select_timer`: When user selects a timer duration
- `session_start`: When a sleep session begins
- `session_complete`: When a sleep session ends

## Local Storage Keys

- `@theta/coachId`: Selected coach ID
- `@theta/classId`: Selected class ID
- `@theta/timerSeconds`: Selected timer duration

## Audio Implementation

The app uses Expo AV for audio playback:

1. **Audio Mode**: Configured for background playback and silent mode
2. **Playback Flow**: Coach audio → Class audio → Timer completion
3. **Progress Tracking**: Real-time progress updates with visual feedback
4. **Error Handling**: Graceful fallback for missing audio files

## Development

### Running the App

```bash
npm run dev
```

### Building for Production

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Web
npm run build:web
```

## Environment Setup

### iOS Development
- Xcode 14+
- iOS Simulator or physical device
- Expo CLI

### Android Development
- Android Studio
- Android SDK
- Android Emulator or physical device

### Web Development
- Modern web browser
- Expo CLI

## Troubleshooting

### Common Issues

1. **Audio not playing**: Check audio file URLs and network connectivity
2. **Database connection**: Verify Supabase credentials and network access
3. **Storage issues**: Ensure AsyncStorage permissions are granted
4. **Build errors**: Clear cache with `npx expo start --clear`

### Debug Mode

Enable debug logging by setting:

```typescript
// In lib/supabase.ts
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 