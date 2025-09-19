import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../contexts/AppContext';

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width, 400);

export default function SettingsScreen() {
  const router = useRouter();
  const { coaches, classes, selectedCoachId, selectedClassId, timerSeconds, isLoading } = useApp();

  const selectedCoach = coaches.find(c => c.id === selectedCoachId);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Get the display name and tags for the selected class
  const getClassDisplayInfo = () => {
    if (!selectedClass) {
      return {
        name: 'Select Class',
        tags: []
      };
    }
    
    // Check if it's a mixed level class by tags
    if (selectedClass.tags && selectedClass.tags.length > 1) {
      return {
        name: 'All Tasks',
        tags: selectedClass.tags
      };
    }
    
    // For individual classes, use the actual name
    return {
      name: selectedClass.name || 'Select Class',
      tags: selectedClass.tags || []
    };
  };

  const classDisplayInfo = getClassDisplayInfo();

  const handleCoachPress = () => {
    router.push('/choose-coach');
  };

  const handleClassPress = () => {
    router.push('/choose-class');
  };

  const handleTimerPress = () => {
    router.push('/sleep-timer');
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.mobileContainer, { maxWidth }]}>
          <View style={styles.content}>
            {/* Header */}
            <Text style={styles.title}>Change sleep sequence</Text>

            {/* Coach Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Coach</Text>
              <TouchableOpacity style={styles.glassCard} activeOpacity={0.8} onPress={handleCoachPress}>
                <View style={styles.coachRow}>
                  <Image 
                    source={{ uri: selectedCoach?.image_url || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                    style={styles.coachAvatar}
                  />
                  <Text style={styles.coachName}>{selectedCoach?.name || 'Select Coach'}</Text>
                  <ChevronRight color="white" size={20} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Class Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Class</Text>
              <TouchableOpacity style={styles.glassCard} activeOpacity={0.8} onPress={handleClassPress}>
                <View style={styles.classContent}>
                  <View style={styles.classHeader}>
                    <Text style={styles.className}>{classDisplayInfo.name}</Text>
                    <ChevronRight color="white" size={20} />
                  </View>
                  <View style={styles.tagsContainer}>
                    {classDisplayInfo.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Timer Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Timer</Text>
              <Text style={styles.timerDescription}>
                You can change this during a sleep sequence as well.
              </Text>
              <TouchableOpacity style={styles.glassCard} activeOpacity={0.8} onPress={handleTimerPress}>
                <View style={styles.timerRow}>
                  <Text style={styles.timerText}>{timerSeconds} minutes</Text>
                  <ChevronRight color="white" size={20} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Dev Section */}
            {__DEV__ && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Development</Text>
                <TouchableOpacity
                  style={[styles.glassCard, { marginTop: 8 }]}
                  onPress={async () => {
                    try {
                      const { setStorageItem } = await import('../../lib/storage');
                      await setStorageItem('hasOnboarded', '');
                      console.log('🔄 Onboarding flag cleared, navigating to onboarding...');
                      router.replace('/onboarding');
                    } catch (error) {
                      console.error('Error clearing onboarding flag:', error);
                      alert('Error clearing onboarding flag. Please try again.');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.className}>Reset onboarding (DEV)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to let root background show through
  },
  container: {
    flex: 1,
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingBottom: 120,
    paddingTop: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'DMSans',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    fontFamily: 'DMSans',
  },
  glassCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  coachName: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
  classContent: {
    gap: 16,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  className: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(121, 75, 214, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
  timerDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: 'DMSans',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
});