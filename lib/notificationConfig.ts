// lib/notificationConfig.ts
// Centralized configuration for all daily notifications
// Easy to add new notifications or edit existing ones

export interface DailyNotificationConfig {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  deepLink: string;
  enabled: boolean;
}

export const DAILY_NOTIFICATIONS: DailyNotificationConfig[] = [
  {
    id: 'bedtime',
    title: 'Bedtime Reminder 🌙',
    body: 'Time to wind down and prepare for sleep',
    hour: 22, // 10:00 PM
    minute: 0,
    deepLink: '/(tabs)', // Links to home/index
    enabled: true,
  },
  {
    id: 'morning',
    title: 'Good Morning! ☀️',
    body: 'How did you sleep? Rate your session in the diary',
    hour: 8, // 8:00 AM
    minute: 0,
    deepLink: '/(tabs)/diary',
    enabled: true,
  },
  // Add more notifications here easily:
  // {
  //   id: 'afternoon',
  //   title: 'Afternoon Check-in 🌤️',
  //   body: 'How are you feeling? Take a moment to reflect',
  //   hour: 15, // 3:00 PM
  //   minute: 0,
  //   deepLink: '/(tabs)/diary',
  //   enabled: false, // Disabled by default
  // },
  // {
  //   id: 'evening',
  //   title: 'Evening Wind-down 🌆',
  //   body: 'Prepare for a restful night ahead',
  //   hour: 20, // 8:00 PM
  //   minute: 0,
  //   deepLink: '/(tabs)',
  //   enabled: false, // Disabled by default
  // },
];

// Helper function to get enabled notifications
export function getEnabledNotifications(): DailyNotificationConfig[] {
  return DAILY_NOTIFICATIONS.filter(notification => notification.enabled);
}

// Helper function to get notification by ID
export function getNotificationById(id: string): DailyNotificationConfig | undefined {
  return DAILY_NOTIFICATIONS.find(notification => notification.id === id);
}
