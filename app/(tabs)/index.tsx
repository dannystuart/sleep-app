import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import ErrorBoundary from '../../components/ErrorBoundary';
import { NetworkStatus } from '../../components/NetworkStatus';
import { SafeAreaView } from '../../components/SafeAreaView';
import PlayButton from '../../components/PlayButton';
import { useApp } from '../../contexts/AppContext';

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width, 400);

export default function HomeScreen() {
  const router = useRouter();
  const { coaches, classes, selectedCoachId, selectedClassId, timerSeconds, isLoading } = useApp();

  const selectedCoach = coaches.find(c => c.id === selectedCoachId);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Get the display name for the selected class
  const getClassDisplayName = () => {
    if (selectedClassId === 'mixed-level-1') {
      return 'All Tasks';
    }
    
    // For individual classes, map the ID to display name
    const classDisplayNames: { [key: string]: string } = {
      'maths': 'Maths',
      'memory': 'Memory', 
      'word': 'Word',
      'facts': 'Facts'
    };
    
    return classDisplayNames[selectedClassId] || selectedClass?.name || 'Select Class';
  };

  const handlePlayButtonPress = () => {
    router.push('/sleep-session');
  };

  // Prefetch the background image for smooth transitions
  useEffect(() => {
    Asset.loadAsync(require('../../assets/images/THETA-BG.png'));
  }, []);

  if (isLoading) {
    return (
      <View style={styles.screenContainer}>
        <SafeAreaView style={styles.container}>
          <View style={[styles.mobileContainer, { maxWidth }]}>
            <View style={styles.content}>
              <ActivityIndicator size="large" color="#F99393" />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.screenContainer}>
        <SafeAreaView style={styles.container}>
          <NetworkStatus />
          
          {/* Mobile Container */}
          <View style={[styles.mobileContainer, { maxWidth }]}>
            {/* App Content */}
            <View style={styles.content}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <View style={styles.logoContent}>
                  <Image 
                    source={require('../../assets/images/brain-icon.png')}
                    style={styles.brainIcon}
                  />
                  <Text style={styles.logo}>theta</Text>
                </View>
              </View>

              {/* Current Streak Card */}
              <View style={styles.streakCard}>
                <View style={styles.streakContent}>
                  <View style={styles.streakLeft}>
                    <Text style={styles.streakTitle}>Your Streak</Text>
                    
                    <View style={styles.daysContainer}>
                      {['Mo', 'Tu', 'We', 'Th', 'Fr'].map((day, index) => (
                        <View key={day} style={styles.dayItem}>
                          <Image 
                            source={require('../../assets/images/moon-icon.png')}
                            style={styles.moonIcon}
                          />
                          <Text style={styles.dayText}>{day}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.streakRight}>
                    <Text style={styles.streakMessage}>
                      One more to unlock a new sleep task.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sleep Session */}
              <View style={styles.sessionSection}>
                <Text style={styles.sessionTitle}>Sleep Session</Text>
                
                {/* Cards Grid */}
                <View style={styles.cardsGrid}>
                  {/* Coach Card */}
                  <View style={[styles.glassCard, styles.coachCard]}>
                    <View style={styles.coachInfo}>
                      <Text style={styles.cardTitle}>Coach</Text>
                      <Text style={styles.cardSubtitle}>{selectedCoach?.name || 'Select Coach'}</Text>
                    </View>
                    <View style={styles.coachImageContainer}>
                      <Image 
                        source={{ uri: selectedCoach?.image_url || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                        style={styles.coachImage}
                      />
                    </View>
                  </View>

                  {/* Right Column Cards */}
                  <View style={styles.rightColumn}>
                    {/* Class Card */}
                    <View style={[styles.glassCard, styles.smallCard]}>
                      <Text style={styles.cardTitle}>Class</Text>
                      <Text style={styles.cardSubtitle}>{getClassDisplayName()}</Text>
                    </View>

                    {/* Timer Card */}
                    <View style={[styles.glassCard, styles.smallCard]}>
                      <Text style={styles.cardTitle}>Timer</Text>
                      <Text style={styles.cardSubtitle}>{timerSeconds} minutes</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Start Session */}
              <View style={styles.startSession}>
                <Text style={styles.startSessionText}>Start Session</Text>
                <PlayButton onPress={handlePlayButtonPress} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </ErrorBoundary>
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
    paddingTop: 0,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brainIcon: {
    width: 20,
    height: 20,
    tintColor: '#F99393',
  },
  logo: {
    color: '#F99393',
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '200',
    fontFamily: 'Dongle-Regular',
    paddingTop: 18,
  },
  streakCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 24,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  streakContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
  },
  streakLeft: {
    flex: 1,
  },
  streakTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '300',
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: -6,
  },
  dayItem: {
    alignItems: 'center',
    width: '25%',
  },
  moonIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  dayText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  streakRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  streakMessage: {
    color: 'white',
    fontSize: 12,
    fontWeight: '300',
    textAlign: 'right',
  },
  sessionSection: {
    marginBottom: 12,
  },
  sessionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 24,
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  glassCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coachCard: {
    flex: 1,
    padding: 16,
    paddingBottom: 16,
  },
  rightColumn: {
    flex: 1,
    gap: 16,
  },
  smallCard: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  coachInfo: {
    marginBottom: 16,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    marginBottom: 12,
  },
  cardSubtitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '300',
  },
  coachImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  coachImage: {
    width: '100%',
    height: 96,
  },
  startSession: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  startSessionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
  },
});