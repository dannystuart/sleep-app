import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Foreground behaviour (banner/sound while app is open)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return { token: null, error: 'Must use physical device for push notifications' };

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return { token: null, error: 'Permission not granted' };
  }

  // Android channels are required for importance/sound
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    // (optional) projectId avoids auto-detection issues in dev client
    // projectId: 'your-expo-project-id'
  });

  return { token: tokenData.data, error: null };
}
