import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import PlayButton from '../components/PlayButton';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SleepSession() {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <ImageBackground
      source={require('../assets/images/THETA-BG.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar style="light" translucent={false} backgroundColor="transparent" />
      <SafeAreaView edges={['top','bottom']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sleep Session</Text>
          
        </View>

        {/* Coach Card */}
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>Coach</Text>
            <Text style={styles.cardSubtitle}>James</Text>
          </View>
          <View style={styles.cardRight}>
            <Image 
              source={{ uri: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400' }}
              style={styles.coachImage}
            />
          </View>
        </View>

        {/* Class Card */}
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>Class</Text>
            <Text style={styles.cardSubtitle}>Mixed Level 1</Text>
          </View>
          <View style={styles.cardRight}>
            <View style={styles.tagsContainer}>
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Maths</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Memory</Text>
                </View>
              </View>
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Word</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Facts</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Play Control Area */}
        <View style={styles.playControlArea}>
          <Text style={styles.durationText}>20 minutes</Text>
          <PlayButton onPress={() => console.log('Play pressed')} />
        </View>

        {/* Audio Progress Bar */}
        <View style={styles.audioProgressContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>00:01</Text>
            <Text style={styles.timeText}>14:34</Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width,
    height,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', // optional overlay tint
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backArrow: {
    color: 'white',
    fontSize: 24,
    fontWeight: '300',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  time: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  statusIcons: {
    flexDirection: 'row',
    gap: 5,
  },
  statusIcon: {
    color: 'white',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '300',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  coachImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  tagsContainer: {
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(121, 75, 214, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '300',
  },
  playControlArea: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  durationText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 20,
  },
  audioProgressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#B3ACE9',
    borderRadius: 1,
    width: '5%', // Small progress to show it's working
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '300',
  },
}); 