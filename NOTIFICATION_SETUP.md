# Push Notifications Setup Guide

This guide explains how to set up and use push notifications in your Theta sleep app.

## Prerequisites

1. **Expo Notifications & Device packages** (already installed):
   ```bash
   expo install expo-notifications expo-device
   ```

2. **Supabase Edge Functions** enabled in your project

## Setup Steps

### 1. Deploy the Edge Function

Deploy the push notification Edge Function to Supabase:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-push
```

### 2. Environment Variables

Add the following to your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

### 3. Database Table (Optional)

Create a `push_subscriptions` table to store user push tokens:

```sql
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  expo_push_token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_token ON push_subscriptions(expo_push_token);
```

## Usage

### Client-Side (React Native)

The notification system is automatically initialized in `AppContext.tsx`. Users will be prompted for notification permissions on first app launch.

### Sending Notifications

Use the utility functions in `lib/sendNotification.ts`:

```typescript
import { sendPushNotification, sendStreakReminder } from './lib/sendNotification';

// Basic notification
await sendPushNotification({
  tokens: ['ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'],
  title: 'Keep your streak 🔥',
  body: 'Tonight\'s session is ready. Start now?',
  data: { screen: '/sleep-session' },
});

// Streak reminder
await sendStreakReminder(tokens, 5);
```

### Server-Side (Admin/Debug Panel)

You can send notifications from your admin panel or debug interface:

```typescript
// Get tokens from database
const { data: subscriptions } = await supabase
  .from('push_subscriptions')
  .select('expo_push_token')
  .eq('user_id', userId);

const tokens = subscriptions?.map(s => s.expo_push_token) || [];

// Send notification
await sendPushNotification({
  tokens,
  title: 'Keep your streak 🔥',
  body: 'Tonight\'s session is ready. Start now?',
  data: { screen: '/sleep-session' },
});
```

## Notification Types

### 1. Streak Reminders
- Sent when user hasn't completed a session
- Deep links to sleep session screen

### 2. Coach Unlocked
- Sent when user unlocks a new coach
- Deep links to coach selection screen

### 3. Reward Unlocked
- Sent when user earns a new reward
- Deep links to diary screen

### 4. Session Complete
- Sent after session completion
- Deep links to diary for rating

## Deep Linking

Notifications support deep linking to specific screens:

```typescript
data: { 
  screen: '/sleep-session',  // expo-router path
  action: 'rate_session',    // optional action
  sessionId: 'session_123'   // optional data
}
```

## Testing

### 1. Test on Physical Device
Push notifications only work on physical devices, not simulators.

### 2. Debug Panel
Use the debug panel in your app to test notifications:

```typescript
// In your debug panel component
const testNotification = async () => {
  const tokens = ['YOUR_TEST_TOKEN'];
  await sendPushNotification({
    tokens,
    title: 'Test Notification',
    body: 'This is a test from the debug panel',
    data: { screen: '/sleep-session' },
  });
};
```

### 3. Expo Push Tool
Use the Expo Push Tool for testing: https://expo.dev/notifications

## Troubleshooting

### Common Issues

1. **"Must use physical device"** - Push notifications don't work in simulators
2. **Permission denied** - User needs to grant notification permissions
3. **Token not found** - Check if token is properly saved to database
4. **Function not found** - Ensure Edge Function is deployed correctly

### Debug Steps

1. Check notification permissions in device settings
2. Verify token is generated and saved
3. Test Edge Function directly with curl
4. Check Supabase logs for errors

## Security Considerations

- Store push tokens securely in your database
- Implement proper user authentication
- Validate notification data before sending
- Consider rate limiting for notification sending
