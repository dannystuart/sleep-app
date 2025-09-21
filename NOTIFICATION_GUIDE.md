# 📱 Daily Notifications Guide

Your Theta sleep app now has **automatic daily notifications** that schedule themselves when the app launches (if permissions are granted).

## 🚀 **Current Notifications**

### 🌙 **Bedtime Reminder** (10:00 PM)
- **Title**: "Bedtime Reminder 🌙"
- **Body**: "Time to wind down and prepare for sleep"
- **Links to**: Home/Index screen
- **Status**: ✅ Enabled

### ☀️ **Morning Reminder** (8:00 AM)
- **Title**: "Good Morning! ☀️"
- **Body**: "How did you sleep? Rate your session in the diary"
- **Links to**: Diary screen
- **Status**: ✅ Enabled

## ⚙️ **How It Works**

1. **Automatic Scheduling**: Notifications are scheduled when the app launches
2. **Permission Check**: Only schedules if user has granted notification permissions
3. **Daily Recurring**: Each notification repeats daily at the same time
4. **Deep Linking**: Tapping notifications navigates to the correct screen

## ✏️ **Easy to Edit/Add Notifications**

### **To Edit Existing Notifications:**
Open `lib/notificationConfig.ts` and modify the `DAILY_NOTIFICATIONS` array:

```typescript
{
  id: 'bedtime',
  title: 'Your New Title 🌙',        // ← Edit this
  body: 'Your new message here',     // ← Edit this
  hour: 22,                          // ← Edit time (24-hour format)
  minute: 0,                         // ← Edit minutes
  deepLink: '/(tabs)',               // ← Edit where it links to
  enabled: true,                     // ← Enable/disable
}
```

### **To Add New Notifications:**
Simply add a new object to the `DAILY_NOTIFICATIONS` array:

```typescript
{
  id: 'afternoon',
  title: 'Afternoon Check-in 🌤️',
  body: 'How are you feeling? Take a moment to reflect',
  hour: 15,                          // 3:00 PM
  minute: 0,
  deepLink: '/(tabs)/diary',
  enabled: true,                     // Set to false to disable
},
```

### **To Disable a Notification:**
Set `enabled: false`:

```typescript
{
  id: 'bedtime',
  // ... other properties
  enabled: false,  // ← This disables the notification
}
```

## 🎮 **Debug Panel Controls**

- **"Bedtime 22:00"** - Schedule bedtime reminder only
- **"Morning 08:00"** - Schedule morning reminder only  
- **"Schedule All"** - Schedule all enabled notifications
- **"Cancel All"** - Cancel all scheduled notifications
- **"Check Perms"** - Check notification permission status

## 🔧 **Dev Console Commands**

```javascript
// Schedule all enabled notifications
await __thetaLocal.scheduleAll()

// Schedule specific notification by ID
await __thetaLocal.scheduleById('bedtime')

// View notification configuration
__thetaLocal.config

// List currently scheduled notifications
await __thetaLocal.list()

// Cancel all notifications
await __thetaLocal.cancel()
```

## 📱 **Testing**

1. **Open app** on physical device (notifications don't work in simulators)
2. **Grant permissions** when prompted
3. **Check console logs** - you should see scheduling confirmations
4. **Wait for notification time** or use debug panel to test immediately

## 🎯 **Deep Link Paths**

- `/(tabs)` - Home/Index screen
- `/(tabs)/diary` - Diary screen
- `/(tabs)/settings` - Settings screen
- `/sleep-session` - Sleep session screen
- `/choose-coach` - Coach selection screen
- `/choose-class` - Class selection screen

## ⚠️ **Important Notes**

- **Physical Device Required**: Notifications only work on real devices
- **Permission Required**: Users must grant notification permissions
- **Automatic Scheduling**: Happens on every app launch (idempotent)
- **Sound Enabled**: All notifications play sound
- **Android Vibration**: Android devices will also vibrate

Your notification system is now fully automated and easy to customize! 🎉
