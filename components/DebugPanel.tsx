import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { setStorageItem } from '../lib/storage';
import { useRouter } from 'expo-router';

export const DebugPanel: React.FC = () => {
  const { diary, streak } = useApp();
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
          {diary.slice(0, 5).map((entry, index) => (
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    width: 180,
    maxHeight: 200,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
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