import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Dimensions, Modal, TouchableWithoutFeedback,
  TouchableOpacity, StyleSheet, View, Text, SafeAreaView, Image
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

type Variant =
  | { type: 'streak_plus'; streak: number }
  | { type: 'reward_unlocked'; streak: number; rewardId: string };

interface Props {
  visible: boolean;
  onClose: () => void;
  variant: Variant | null;
}

export function AnnouncementSheet({ visible, onClose, variant }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scaleIn = useRef(new Animated.Value(0.9)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, bounciness: 8, useNativeDriver: true }),
      ]).start(() => {
        Animated.parallel([
          Animated.spring(scaleIn, { toValue: 1, bounciness: 6, useNativeDriver: true }),
          Animated.timing(fadeIn, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  if (!modalVisible || !variant) return null;

  const isReward = variant.type === 'reward_unlocked';

  return (
    <Modal transparent animationType="none" visible={modalVisible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: sheetY }] }]}>
        <SafeAreaView style={styles.sheet}>
          <Animated.View style={[styles.inner, { transform: [{ scale: scaleIn }], opacity: fadeIn }]}>
            {isReward ? (
              <>
                <Text style={styles.title}>You unlocked a surprise!</Text>
                {/* Placeholder icon; you can swap based on rewardId */}
                <Image source={require('../assets/images/brain-icon.png')} style={styles.icon} />
                <Text style={styles.sub}>Added to your collection.</Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Streak +1</Text>
                <Text style={styles.big}>{variant.streak} days running</Text>
                <Text style={styles.sub}>Keep it going tonight.</Text>
              </>
            )}

            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.closeBtn}>
              <Text style={styles.closeText}>{isReward ? 'Close' : 'Nice'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.2)' },
  sheetWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SHEET_HEIGHT },
  sheet: { flex: 1, backgroundColor: '#15131A', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, alignItems: 'center', justifyContent: 'center' },
  title: { color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 10, fontWeight: '300' },
  big: { color: 'white', fontSize: 24, textAlign: 'center', marginBottom: 8, fontWeight: '500' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  icon: { width: 48, height: 48, marginVertical: 8, tintColor: '#F99393' },
  closeBtn: { marginTop: 8, alignSelf: 'center', backgroundColor: 'rgba(121, 75, 214, 0.3)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  closeText: { color: 'white', fontSize: 14, fontWeight: '300' },
}); 