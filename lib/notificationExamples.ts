// lib/notificationExamples.ts
// Example usage of the push notification system

import { sendPushNotification, sendStreakReminder, sendCoachUnlocked, sendRewardUnlocked } from './sendNotification';

// Example 1: Basic notification
export async function sendBasicNotification() {
  const tokens = ['ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]']; // Replace with actual tokens
  
  await sendPushNotification({
    tokens,
    title: 'Test Notification',
    body: 'This is a test notification from Theta',
    data: { screen: '/sleep-session' },
  });
}

// Example 2: Streak reminder
export async function sendStreakReminderExample() {
  const tokens = ['ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]']; // Replace with actual tokens
  const currentStreak = 5;
  
  await sendStreakReminder(tokens, currentStreak);
}

// Example 3: Coach unlocked notification
export async function sendCoachUnlockedExample() {
  const tokens = ['ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]']; // Replace with actual tokens
  const coachName = 'Sarah';
  
  await sendCoachUnlocked(tokens, coachName);
}

// Example 4: Reward unlocked notification
export async function sendRewardUnlockedExample() {
  const tokens = ['ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]']; // Replace with actual tokens
  const rewardName = 'Moon Glow Background';
  
  await sendRewardUnlocked(tokens, rewardName);
}

// Example 5: Custom notification with deep linking
export async function sendCustomNotification() {
  const tokens = ['ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]']; // Replace with actual tokens
  
  await sendPushNotification({
    tokens,
    title: 'Session Complete! 🎉',
    body: 'Great job! Rate your session in the diary.',
    data: { 
      screen: '/diary',
      action: 'rate_session',
      sessionId: 'session_123'
    },
  });
}

// Example 6: Batch notifications to multiple users
export async function sendBatchNotifications() {
  const tokens = [
    'ExponentPushToken[user1_token]',
    'ExponentPushToken[user2_token]',
    'ExponentPushToken[user3_token]',
  ];
  
  await sendPushNotification({
    tokens,
    title: 'App Update Available',
    body: 'New features and improvements are ready!',
    data: { screen: '/settings' },
  });
}
