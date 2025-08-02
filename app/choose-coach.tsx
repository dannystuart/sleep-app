import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const coaches = [
  {
    id: 1,
    name: 'Nathan',
    description: 'British, smooth & calm',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 2,
    name: 'James',
    description: 'American, husky & engaging',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 3,
    name: 'Autumn',
    description: 'American & reflective',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 4,
    name: 'Jennifer',
    description: 'British, soft & soothing',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 5,
    name: 'Adam',
    description: 'British, middle-aged, serious',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 6,
    name: 'Samantha',
    description: 'American, calm & thoughtful',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

export default function ChooseCoachScreen() {
  const router = useRouter();
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(1); // Default to first coach

  const handleBackPress = () => {
    router.back();
  };

  const handleCoachSelect = (coachId: number) => {
    setSelectedCoachId(coachId);
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
          <Text style={styles.title}>Choose Coach</Text>
          <View style={styles.spacer} />
        </View>

        {/* Coach List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {coaches.map((coach) => (
            <TouchableOpacity 
              key={coach.id} 
              style={[
                styles.coachCard,
                selectedCoachId === coach.id && styles.selectedCoachCard
              ]}
              activeOpacity={0.8}
              onPress={() => handleCoachSelect(coach.id)}
            >
              <View style={styles.coachContent}>
                <Image 
                  source={{ uri: coach.image }}
                  style={styles.coachImage}
                />
                <View style={styles.coachInfo}>
                  <Text style={styles.coachName}>{coach.name}</Text>
                  <Text style={styles.coachDescription}>{coach.description}</Text>
                </View>
                <View style={styles.playButton}>
                  <View style={styles.playIcon}>
                    <View style={styles.playTriangle} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300',
  },
  spacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  coachCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCoachCard: {
    backgroundColor: 'rgba(118, 77, 213, 1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  coachContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '300',
    marginBottom: 4,
  },
  coachDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 0,
    borderBottomWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'white',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
  },
}); 