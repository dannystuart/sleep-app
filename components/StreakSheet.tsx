import React, { useState, useRef, useEffect } from 'react';
import {
  Animated, Easing, Dimensions, Modal, TouchableWithoutFeedback,
  TouchableOpacity, StyleSheet, View, Text, SafeAreaView, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

interface DayItem { label: string; done: boolean }
interface Props {
  visible: boolean;
  onClose: () => void;
  days: DayItem[];        // for mode 'row': earliest->today (all done=true)
  currentStreak: number;
  bestStreak: number;
  mode?: 'row' | 'big';
}

export function StreakSheet({ visible, onClose, days, currentStreak, bestStreak, mode = 'row' }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, bounciness: 8, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  if (!modalVisible) return null;

  return (
    <Modal transparent animationType="none" visible={modalVisible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: sheetY }] }]}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.inner}>
            {mode === 'big' ? (
              <>
                <Text style={styles.title}>Your streak</Text>
                <Image
                  source={require('../assets/images/moon-icon.png')}
                  style={styles.bigMoon}
                />
                <Text style={styles.bigStreakCount}>{currentStreak} nights</Text>
                <Text style={styles.bestStreak}>Best streak: {bestStreak}</Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Your streak</Text>
                <View style={styles.streakInfo}>
                  <View style={styles.currentStreakButton}>
                    <Text style={styles.currentStreakText}>{currentStreak} nights</Text>
                  </View>
                  <Text style={styles.bestStreak}>Best streak: {bestStreak} nights</Text>
                </View>
                <View style={styles.daysRow}>
                  {days.map((d, i) => (
                    <View key={i} style={styles.day}>
                      <Image
                        source={require('../assets/images/moon-icon.png')}
                        style={[styles.moon, { opacity: d.done ? 1 : 0.3 }]}
                      />
                      <Text style={styles.dayText}>{d.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Motivational text above button */}
            <Text style={styles.motivationalText}>
              Keep building your streak to unlock more rewards.
            </Text>

            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.doneWrapper}>
              <LinearGradient
                colors={['#794BD6', '#585ED2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneButton}
              >
                <Text style={styles.doneText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.2)' },
  sheetWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SHEET_HEIGHT },
  sheet: { flex: 1, backgroundColor: '#15131A', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  title: { color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 20, fontWeight: '300' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  
  // Big mode styles
  bigMoon: { width: 80, height: 80, marginBottom: 16, alignSelf: 'center' },
  bigStreakCount: { color: 'white', fontSize: 32, textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  bestStreak: { color: 'white', fontSize: 14, textAlign: 'center', marginBottom: 24, fontWeight: '300' },
  
  // Row mode styles
  streakInfo: { alignItems: 'center', marginBottom: 24 },
  currentStreakButton: { 
    backgroundColor: 'rgba(255, 215, 0, 0.1)', 
    borderWidth: 1, 
    borderColor: '#FFD700', 
    borderRadius: 20, 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    marginBottom: 8 
  },
  currentStreakText: { color: 'white', fontSize: 16, fontWeight: '500' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  day: { alignItems: 'center', width: '14.2%' },
  moon: { width: 32, height: 32, marginBottom: 4 },
  dayText: { color: 'white', fontSize: 12, fontWeight: '300' },
  doneWrapper: { marginTop: 16, marginBottom: 32 },
  doneButton: { height: 64, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  doneText: { color: 'white', fontSize: 16, fontWeight: '500' },
  motivationalText: { color: 'white', fontSize: 14, textAlign: 'center', marginBottom: 24, fontWeight: '300', lineHeight: 20 },
});
