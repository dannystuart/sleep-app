import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { setStorageItem } from '../lib/storage';
import { useRouter } from 'expo-router';
import type { DiaryEntry } from '../types';

export const DebugPanel: React.FC = () => {
  const { diary, streak, devPushAnnouncement, devShowTestAnnouncement, announcements, coaches } = useApp() as any;
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
      <Text style={styles.title}>🔧 Debug Panel</Text>
      
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
  title: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
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