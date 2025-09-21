// lib/sendNotification.ts
// Client utility for sending push notifications via Supabase Edge Function

interface SendNotificationParams {
  tokens: string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
}

export async function sendPushNotification(params: SendNotificationParams) {
  const { tokens, title, body, data } = params;
  
  if (!tokens || tokens.length === 0) {
    throw new Error('No tokens provided');
  }

  const supabaseFunctionUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL;
  if (!supabaseFunctionUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_FUNCTION_URL not configured');
  }

  try {
    const response = await fetch(`${supabaseFunctionUrl}/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        title: title ?? 'Theta',
        body: body ?? '',
        data: data ?? {},
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

// Convenience function for common notification types
export async function sendStreakReminder(tokens: string[], streakCount: number) {
  return sendPushNotification({
    tokens,
    title: 'Keep your streak 🔥',
    body: `You're on a ${streakCount}-day streak! Tonight's session is ready.`,
    data: { screen: '/sleep-session' },
  });
}

export async function sendCoachUnlocked(tokens: string[], coachName: string) {
  return sendPushNotification({
    tokens,
    title: 'New Coach Unlocked! 🎉',
    body: `${coachName} is now available for your sessions.`,
    data: { screen: '/choose-coach' },
  });
}

export async function sendRewardUnlocked(tokens: string[], rewardName: string) {
  return sendPushNotification({
    tokens,
    title: 'Reward Unlocked! ✨',
    body: `You've earned a new reward: ${rewardName}`,
    data: { screen: '/diary' },
  });
}
