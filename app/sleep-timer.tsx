import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const timeOptions = [
  { id: '5', name: '5 minutes', isSelected: false },
  { id: '10', name: '10 minutes', isSelected: false },
  { id: '15', name: '15 minutes', isSelected: false },
  { id: '20', name: '20 minutes', isSelected: true },
  { id: '25', name: '25 minutes', isSelected: false },
  { id: '30', name: '30 minutes', isSelected: false },
  { id: '35', name: '35 minutes', isSelected: false },
  { id: '40', name: '40 minutes', isSelected: false },
];

export default function SleepTimerScreen() {
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState('20');

  const handleBackPress = () => {
    router.back();
  };

  const handleTimeSelect = (timeId: string) => {
    setSelectedTime(timeId);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar
        style="light"
        backgroundColor="transparent"
        translucent={true}
      />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Sleep Timer</Text>
          <View style={styles.spacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {timeOptions.map((timeOption) => (
            <TouchableOpacity
              key={timeOption.id}
              style={[
                styles.timeCard,
                selectedTime === timeOption.id && styles.selectedCard
              ]}
              onPress={() => handleTimeSelect(timeOption.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.timeText}>{timeOption.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#15131A',
  },
  container: {
    flex: 1,
    backgroundColor: '#15131A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300',
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 20,
  },
  timeCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCard: {
    backgroundColor: 'rgba(118, 77, 213, 1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '300',
    textAlign: 'center',
  },
}); 