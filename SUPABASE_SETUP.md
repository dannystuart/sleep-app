# Supabase Setup Guide for Theta Sleep App

Follow these steps to set up Supabase for your sleep app:

## Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up or log in** to your account
3. **Click "New Project"**
4. **Fill in project details**:
   - Organization: Choose your org
   - Name: `theta-sleep-app` (or your preferred name)
   - Database Password: Create a strong password (save this!)
   - Region: Choose closest to you
5. **Click "Create new project"**
6. **Wait for setup to complete** (2-3 minutes)

## Step 2: Get Your Project Credentials

1. **In your Supabase dashboard, go to Settings → API**
2. **Copy these values**:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)

## Step 3: Create Environment File

1. **In your project root, create a `.env` file**
2. **Add your credentials**:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace the placeholder values with your actual credentials from Step 2.**

## Step 4: Set Up Database Tables

1. **In Supabase dashboard, go to SQL Editor**
2. **Copy and paste the contents of `supabase-setup.sql`**
3. **Replace `YOUR_PROJECT_URL` with your actual project URL**
4. **Click "Run" to execute the SQL**

This will create:
- `coaches` table with sample data
- `classes` table with sample data  
- `session_events` table for analytics
- Proper security policies

## Step 5: Set Up Storage (Optional for now)

1. **Go to Storage in Supabase dashboard**
2. **Create two buckets**:
   - `audio` (for audio files)
   - `images` (for coach images)
3. **Set bucket policies** (run in SQL Editor):

```sql
-- Allow public read access to audio files
CREATE POLICY "Allow public read access to audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio');

-- Allow public read access to images  
CREATE POLICY "Allow public read access to images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
```

## Step 6: Test the Setup

1. **Restart your Expo development server**:
   ```bash
   npm run dev
   ```

2. **Check the app** - it should now:
   - Load coaches and classes from the database
   - Allow selection and persistence
   - Log analytics events

## Troubleshooting

### "Supabase URL error"
- Check your `.env` file exists and has correct values
- Restart the development server after creating `.env`
- Verify your Supabase project is active

### "Database connection failed"
- Check your anon key is correct
- Verify RLS policies are set up
- Ensure tables exist in your database

### "No data showing"
- Check the sample data was inserted correctly
- Verify the `coaches` and `classes` tables have data
- Check browser console for errors

## Next Steps

Once Supabase is working:
1. **Upload real coach images** to the `images` bucket
2. **Upload audio files** to the `audio` bucket
3. **Update the sample data** with real coach and class information
4. **Test the complete user flow**

## Quick Test

After setup, you should see:
- ✅ Home screen shows selected coach, class, and timer
- ✅ Settings screen allows navigation to selection screens
- ✅ Coach selection works and persists
- ✅ Class selection works and persists  
- ✅ Timer selection works and persists
- ✅ Analytics events are logged in the database

Your app is now fully connected to Supabase! 🎉 