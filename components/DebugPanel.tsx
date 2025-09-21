import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { setStorageItem } from '../lib/storage';
import { useRouter } from 'expo-router';
import type { DiaryEntry } from '../types';

interface DebugPanelProps {
  onClose?: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ onClose }) => {
  const { diary, streak, devPushAnnouncement, devShowTestAnnouncement, announcements, coaches, scheduleDailyReminder, scheduleBedtimeReminder, scheduleMorningReminder, scheduleAllDailyNotifications, cancelAllLocalReminders, ensureLocalNotifPermission } = useApp() as any;
  const router = useRouter();
  const [streakData, setStreakData] = React.useState<any>(null);

  React.useEffect(() => {
    const loadStreak = async () => {
      const data = await streak.getState();
      setStreakData(data);
      console.log('🔍 Debug panel - streak data:', data);
    };
    loadStreak();
  }, [streak]);

  // Debug: Check if functions are available
  React.useEffect(() => {
    console.log('🔧 Debug Panel - Available functions:', {
      devShowTestAnnouncement: typeof devShowTestAnnouncement,
      devPushAnnouncement: typeof devPushAnnouncement,
      announcements: announcements?.length
    });
  }, [devShowTestAnnouncement, devPushAnnouncement, announcements]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Debug Panel</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Streak Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Streak Controls</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[1,3,5,7,11].map(n => (
              <Text
                key={n}
                style={[styles.text, { textDecorationLine: 'underline' }]}
                onPress={() => streak.devSetStreakDays?.(n)}
              >
                Set {n}
              </Text>
            ))}
            <Text
              style={[styles.text, { textDecorationLine: 'underline', marginLeft: 6 }]}
              onPress={() => streak.devResetStreak?.()}
            >
              Reset
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Streak Data</Text>
          <Text style={styles.text}>Current: {streakData?.current || 0}</Text>
          <Text style={styles.text}>Best: {streakData?.best || 0}</Text>
          <Text style={styles.text}>Next Milestone: {streakData?.nextMilestone || 'None'}</Text>
          <Text style={styles.text}>Days to Next: {streakData?.daysToNext || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Last 7 Days</Text>
          {streakData?.last7?.map((day: any, index: number) => (
            <Text key={index} style={styles.text}>
              {day.key}: {day.done ? '✅' : '❌'}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Diary Entries ({diary.length})</Text>
          {diary.slice(0, 5).map((entry: DiaryEntry, index: number) => (
            <Text key={index} style={styles.text}>
              {entry.dateKey}: {entry.coachName} - {entry.className} ({entry.rating || 'Not rated'})
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Onboarding</Text>
          <TouchableOpacity
            onPress={async () => {
              await setStorageItem('hasOnboarded', 'false');
              router.replace('/onboarding');
            }}
            style={styles.debugButton}
          >
            <Text style={styles.debugButtonText}>Force Onboarding</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
  <Text style={styles.sectionTitle}>📣 Test Announcements</Text>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
    <Text
      style={[styles.text, { textDecorationLine: 'underline', marginRight: 6 }]}
      onPress={() => {
        console.log('🔧 Debug: Forcing Test Streak +1');
        devShowTestAnnouncement?.('streak_plus', {
          streak: (streakData?.current ?? 0) + 1,
        });
      }}
    >
      Test Streak +1
    </Text>
    <Text
      style={[styles.text, { textDecorationLine: 'underline' }]}
      onPress={() => {
        console.log('🔧 Debug: Forcing Test Reward');
        devShowTestAnnouncement?.('reward_unlocked', {
          rewardId: 'moon.crescent',
          streak: streakData?.current ?? 1,
        });
      }}
    >
      Test Reward
    </Text>
  </View>
</View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📣 Announcement Sheets</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text
              style={[styles.text, { textDecorationLine: 'underline', marginRight: 6 }]}
              onPress={async () => {
                console.log('🔧 Debug: Creating streak_plus announcement');
                await devPushAnnouncement?.('streak_plus', { streak: (streakData?.current ?? 0) + 1 });
                console.log('🔧 Debug: Announcement created');
                router.replace('/');
              }}
            >
              Show Streak +1
            </Text>
            <Text
              style={[styles.text, { textDecorationLine: 'underline', marginRight: 6 }]}
              onPress={async () => {
                console.log('🔧 Debug: Creating reward_unlocked announcement');
                await devPushAnnouncement?.('reward_unlocked', { rewardId: 'moon.crescent', streak: streakData?.current ?? 1 });
                console.log('🔧 Debug: Announcement created');
                router.replace('/');
              }}
            >
              Show Reward
            </Text>
            <Text
              style={[styles.text, { textDecorationLine: 'underline' }]}
              onPress={async () => {
                console.log('🔧 Debug: Creating coach_unlocked announcement');
                await devPushAnnouncement?.('coach_unlocked', { 
                  streak: streakData?.current ?? 3
                });
                console.log('🔧 Debug: Coach unlock announcement created');
                router.replace('/');
              }}
            >
              Show Coach Unlock
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Local Notifications</Text>
          <TouchableOpacity
            onPress={async () => {
              const { fireLocalTestNotification } = await import('../lib/localTestNotification');
              await fireLocalTestNotification();
              console.log('✅ Local notification scheduled (fires in 5s)');
            }}
            style={styles.debugButton}
          >
            <Text style={styles.debugButtonText}>Test (5s)</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }}>
            <Text
              style={[styles.text, { textDecorationLine: 'underline', marginRight: 6 }]}
              onPress={async () => {
                await scheduleBedtimeReminder();
                console.log('✅ Bedtime reminder scheduled for 10:00 PM');
              }}
            >
              Bedtime 22:00
            </Text>
            <Text
              style={[styles.text, { textDecorationLine: 'underline', marginRight: 6 }]}
              onPress={async () => {
                await scheduleMorningReminder();
                console.log('✅ Morning reminder scheduled for 8:00 AM');
              }}
            >
              Morning 08:00
            </Text>
            <Text
              style={[styles.text, { textDecorationLine: 'underline', marginRight: 6 }]}
              onPress={async () => {
                await scheduleDailyReminder(22, 30);
                console.log('✅ Daily reminder scheduled for 10:30 PM');
              }}
            >
              Daily 22:30
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }}>
            <Text
              style={[styles.text, { textDecorationLine: 'underline', marginRight: 6 }]}
              onPress={async () => {
                const results = await scheduleAllDailyNotifications();
                console.log('✅ All daily notifications scheduled:', results);
              }}
            >
              Schedule All
            </Text>
            <Text
              style={[styles.text, { textDecorationLine: 'underline', marginRight: 6 }]}
              onPress={async () => {
                await cancelAllLocalReminders();
                console.log('✅ All local reminders cancelled');
              }}
            >
              Cancel All
            </Text>
            <Text
              style={[styles.text, { textDecorationLine: 'underline' }]}
              onPress={async () => {
                const granted = await ensureLocalNotifPermission();
                console.log('✅ Notification permission:', granted ? 'Granted' : 'Denied');
              }}
            >
              Check Perms
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 10,
    width: 180,
    maxHeight: 200,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 8,
    zIndex: 2000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    maxHeight: 150,
  },
  section: {
    marginBottom: 6,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  text: {
    color: 'white',
    fontSize: 7,
    marginBottom: 1,
  },
  debugButton: {
    backgroundColor: 'rgba(124, 58, 237, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 2,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});