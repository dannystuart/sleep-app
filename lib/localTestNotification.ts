import * as Notifications from 'expo-notifications';

export async function fireLocalTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Theta Test 🔔',
      body: 'This is a local test notification',
      data: { screen: '/sleep-session' },
      sound: 'default',
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
      seconds: 5 
    }, // will fire 5s after button press
  });
}