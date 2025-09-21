# Local Notifications Usage Guide

Your Theta sleep app now supports both push notifications and local notifications! Here's how to use them.

## 🚀 Quick Start

### 1. **Dev Console Testing** (Development Only)

In development mode, you can test local notifications directly from the console:

```javascript
// In your browser/device console:
await __thetaLocal.perm()           // Check permissions
await __thetaLocal.test(5)          // Test notification in 5 seconds
await __thetaLocal.daily(22, 30)    // Schedule daily reminder at 10:30 PM
await __thetaLocal.list()           // List all scheduled notifications
await __thetaLocal.cancel()         // Cancel all scheduled notifications
```

### 2. **Using in Your App Components**

```typescript
import { useApp } from '../contexts/AppContext';

function MyComponent() {
  const { 
    scheduleDailyReminder, 
    cancelAllLocalReminders, 
    scheduleOneOffIn,
    ensureLocalNotifPermission 
  } = useApp();

  const handleScheduleReminder = async () => {
    try {
      // Schedule daily reminder at 10:30 PM
      await scheduleDailyReminder(22, 30);
      console.log('Daily reminder scheduled!');
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      // Test notification in 10 seconds
      await scheduleOneOffIn(10, 'Test', 'This is a test notification');
    } catch (error) {
      console.error('Failed to schedule test notification:', error);
    }
  };

  return (
    <View>
      <Button title="Schedule Daily Reminder" onPress={handleScheduleReminder} />
      <Button title="Test Notification" onPress={handleTestNotification} />
    </View>
  );
}
```

## 📱 Notification Types

### **Daily Reminders**
Perfect for bedtime routine reminders:

```typescript
// Schedule at 10:30 PM daily
await scheduleDailyReminder(22, 30);

// Schedule at 9:00 PM daily  
await scheduleDailyReminder(21, 0);
```

### **One-off Notifications**
Great for testing or immediate reminders:

```typescript
// Test notification in 5 seconds
await scheduleOneOffIn(5, 'Test', 'Testing local notifications');

// Reminder in 1 hour
await scheduleOneOffIn(3600, 'Session Time!', 'Ready for your sleep session?');
```

### **Permission Management**
Check and request notification permissions:

```typescript
const hasPermission = await ensureLocalNotifPermission();
if (hasPermission) {
  console.log('Notifications enabled!');
} else {
  console.log('Notifications disabled');
}
```

## 🔗 Deep Linking

All notifications support deep linking to any screen in your app:

```typescript
// Navigate to sleep session
data: { screen: '/sleep-session' }

// Navigate to diary
data: { screen: '/(tabs)/diary' }

// Navigate to coach selection
data: { screen: '/choose-coach' }
```

## 🎯 Common Use Cases

### **1. Bedtime Reminder**
```typescript
// In your settings or onboarding
const setupBedtimeReminder = async (hour: number, minute: number) => {
  await cancelAllLocalReminders(); // Clear existing
  await scheduleDailyReminder(hour, minute);
};
```

### **2. Streak Reminder**
```typescript
// When user hasn't completed a session today
const remindAboutStreak = async () => {
  await scheduleOneOffIn(
    3600, // 1 hour from now
    'Keep your streak! 🔥',
    'Don\'t break your streak - complete a session today'
  );
};
```

### **3. Session Complete Follow-up**
```typescript
// After completing a session
const scheduleFollowUp = async () => {
  await scheduleOneOffIn(
    86400, // 24 hours from now
    'Ready for another session?',
    'Your next sleep session is ready'
  );
};
```

## 🛠️ Development Tools

### **Console Commands** (Development Only)
- `__thetaLocal.perm()` - Check permissions
- `__thetaLocal.test(seconds)` - Test notification
- `__thetaLocal.daily(hour, minute)` - Schedule daily
- `__thetaLocal.list()` - List scheduled
- `__thetaLocal.cancel()` - Cancel all

### **Debug Panel Integration**
You can add local notification controls to your existing debug panel:

```typescript
// In your DebugPanel component
const { scheduleDailyReminder, cancelAllLocalReminders } = useApp();

<Button 
  title="Schedule Daily Reminder" 
  onPress={() => scheduleDailyReminder(22, 30)} 
/>
<Button 
  title="Cancel All Reminders" 
  onPress={cancelAllLocalReminders} 
/>
```

## ⚠️ Important Notes

1. **Physical Device Required**: Local notifications only work on physical devices, not simulators
2. **Permission Required**: Users must grant notification permissions
3. **Android Channels**: Android requires notification channels (handled automatically)
4. **Deep Linking**: All notifications support navigation to any screen
5. **Development Only**: Console helpers (`__thetaLocal`) only available in development mode

## 🎉 Ready to Use!

Your local notification system is now fully integrated and ready to enhance your users' sleep routine experience!
