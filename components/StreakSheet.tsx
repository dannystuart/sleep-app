import React, { useState, useRef, useEffect } from 'react';
import {
  Animated, Easing, Dimensions, Modal, TouchableWithoutFeedback,
  TouchableOpacity, StyleSheet, View, Text, SafeAreaView, Image
} from 'react-native';

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
                <Image
                  source={require('../assets/images/moon-icon.png')}
                  style={{ width: 64, height: 64, marginBottom: 12 }}
                />
                <Text style={styles.title}>{currentStreak} days</Text>
                <Text style={styles.sub}>Longest run: {bestStreak}</Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Your streak</Text>
                <Text style={styles.sub}>{currentStreak} days running • Best {bestStreak}</Text>
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

            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
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
  title: { color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 6, fontWeight: '300' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', width: '14.2%' },
  moon: { width: 24, height: 24, marginBottom: 4 },
  dayText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  closeBtn: { marginTop: 24, alignSelf: 'center', backgroundColor: 'rgba(121, 75, 214, 0.3)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  closeText: { color: 'white', fontSize: 14, fontWeight: '300' },
});
