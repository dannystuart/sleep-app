import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../components/SafeAreaView';
import { useApp } from '../contexts/AppContext';
import { ChevronLeft } from 'lucide-react-native';
import { track } from '../lib/analytics';

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width, 400);

const TIMER_PRESETS = [5, 10, 15, 20, 25, 30];

export default function SleepTimerScreen() {
  const router = useRouter();
  const { timerSeconds, setTimer } = useApp();
  const [tempSelectedTimer, setTempSelectedTimer] = useState(timerSeconds);

  const handleTimerSelect = (seconds: number) => {
    setTempSelectedTimer(seconds);
    track('select_timer', { timer_seconds: seconds }).catch(() => {});
  };

  const handleBackPress = async () => {
    if (tempSelectedTimer !== timerSeconds) {
      await setTimer(tempSelectedTimer);
    }
    router.back();
  };

  const renderTimer = ({ item }: { item: number }) => (
    <TouchableOpacity
      style={[
        styles.timerCard,
        item === tempSelectedTimer && styles.selectedTimerCard
      ]}
      onPress={() => handleTimerSelect(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.timerText}>{item} minutes</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.mobileContainer, { maxWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Choose Timer</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Description */}
          <Text style={styles.description}>
            You can change this during a sleep sequence as well.
          </Text>

          {/* Timer Options */}
          <FlatList
            data={TIMER_PRESETS}
            renderItem={renderTimer}
            keyExtractor={(item) => item.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#15131A', // Solid dark background
  },
  container: {
    flex: 1,
    backgroundColor: '#15131A', // Ensure container also has background
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
  placeholder: {
    width: 40,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'DMSans',
  },
  listContainer: {
    paddingBottom: 20,
  },
  timerCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedTimerCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'DMSans',
  },
}); 