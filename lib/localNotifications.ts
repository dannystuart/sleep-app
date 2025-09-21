// lib/localNotifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DAILY_NOTIFICATIONS, getEnabledNotifications, DailyNotificationConfig } from './notificationConfig';

// Foreground behaviour is already set in your existing file via Notifications.setNotificationHandler.
// If you want different behaviour for locals, you could set it there instead.

// Ensure Android has a default channel (locals need a channel to show properly)
async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
    });
  }
}

/** Ask only for notification permission (does NOT fetch Expo push token) */
export async function ensureLocalNotifPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    status = req.status;
  }
  const granted = status === 'granted';
  if (granted) await ensureAndroidChannel();
  return granted;
}

/** Schedule a daily local reminder. We cancel all scheduled first to avoid dupes. */
export async function scheduleDailyReminder(hour = 22, minute = 30) {
  const ok = await ensureLocalNotifPermission();
  if (!ok) throw new Error('Notification permission not granted');

  await Notifications.cancelAllScheduledNotificationsAsync();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bedtime routine',
      body: 'Keep your streak going with a quick session 🌙',
      data: { screen: '/sleep-session' }, // expo-router deep link
      sound: 'default',
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR, 
      hour, 
      minute, 
      repeats: true 
    },
  });
}

/** Cancel all scheduled local notifications (simple MVP) */
export async function cancelAllLocalReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** One-off local notification in N seconds (great for testing) */
export async function scheduleOneOffIn(seconds = 10, title = 'Test', body = 'Local notification') {
  const ok = await ensureLocalNotifPermission();
  if (!ok) throw new Error('Notification permission not granted');

  return Notifications.scheduleNotificationAsync({
    content: { 
      title, 
      body, 
      data: { screen: '/sleep-session' },
      sound: 'default',
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
      seconds 
    },
  });
}

/** Schedule a single daily notification by ID */
export async function scheduleNotificationById(id: string) {
  const config = DAILY_NOTIFICATIONS.find(n => n.id === id);
  if (!config) throw new Error(`Notification config not found for id: ${id}`);
  if (!config.enabled) throw new Error(`Notification ${id} is disabled`);

  const ok = await ensureLocalNotifPermission();
  if (!ok) throw new Error('Notification permission not granted');

  return Notifications.scheduleNotificationAsync({
    content: {
      title: config.title,
      body: config.body,
      data: { screen: config.deepLink },
      sound: 'default',
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR, 
      hour: config.hour, 
      minute: config.minute, 
      repeats: true 
    },
  });
}

/** Schedule all enabled daily notifications */
export async function scheduleAllDailyNotifications() {
  const ok = await ensureLocalNotifPermission();
  if (!ok) {
    console.log('❌ Notification permission not granted - skipping daily notifications');
    return [];
  }

  const enabledNotifications = getEnabledNotifications();
  const results = [];

  for (const config of enabledNotifications) {
    try {
      const notificationId = await scheduleNotificationById(config.id);
      results.push({ id: config.id, notificationId, success: true });
      console.log(`✅ Scheduled ${config.id} notification for ${config.hour}:${config.minute.toString().padStart(2, '0')}`);
    } catch (error) {
      console.error(`❌ Failed to schedule ${config.id} notification:`, error);
      results.push({ id: config.id, error: String(error), success: false });
    }
  }

  return results;
}

// Legacy functions for backward compatibility
export async function scheduleBedtimeReminder() {
  return scheduleNotificationById('bedtime');
}

export async function scheduleMorningReminder() {
  return scheduleNotificationById('morning');
}

/** Dev helpers in global for quick testing without any UI */
export function attachLocalDevGlobals() {
  if ((globalThis as any).__thetaLocal) return;
  (globalThis as any).__thetaLocal = {
    perm: ensureLocalNotifPermission,
    daily: scheduleDailyReminder,
    bedtime: scheduleBedtimeReminder,
    morning: scheduleMorningReminder,
    scheduleById: scheduleNotificationById,
    scheduleAll: scheduleAllDailyNotifications,
    cancel: cancelAllLocalReminders,
    test: scheduleOneOffIn,
    list: Notifications.getAllScheduledNotificationsAsync,
    config: DAILY_NOTIFICATIONS, // Access to config for debugging
  };
  // Usage in console:
  //   await __thetaLocal.perm()
  //   await __thetaLocal.test(5)
  //   await __thetaLocal.scheduleAll()        // Schedule all enabled notifications
  //   await __thetaLocal.scheduleById('bedtime') // Schedule specific notification
  //   await __thetaLocal.bedtime()            // Legacy: schedule bedtime
  //   await __thetaLocal.morning()            // Legacy: schedule morning
  //   await __thetaLocal.list()               // List scheduled notifications
  //   await __thetaLocal.cancel()             // Cancel all
  //   __thetaLocal.config                     // View notification config
}
