import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Dimensions, Modal, TouchableWithoutFeedback,
  TouchableOpacity, StyleSheet, View, Text, SafeAreaView, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../contexts/AppContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

type Variant =
  | { type: 'streak_plus'; streak: number }
  | { type: 'reward_unlocked'; streak: number; rewardId: string }
  | { type: 'coach_unlocked'; streak: number; coachId: string; coachName: string };

interface Props {
  visible: boolean;
  onClose: () => void;
  variant: Variant | null;
}

export function AnnouncementSheet({ visible, onClose, variant }: Props) {
  console.log('🔧 AnnouncementSheet: Rendered', { visible, variant });
  const [modalVisible, setModalVisible] = useState(visible);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const scaleIn = useRef(new Animated.Value(0.9)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  
  const router = useRouter();
  const { coaches } = useApp();
  
  // Look up coach if this is a coach unlock variant
  const unlockedCoach = variant?.type === 'coach_unlocked' 
    ? coaches.find(c => c.id === variant.coachId)
    : null;

  useEffect(() => {
    console.log('🔧 AnnouncementSheet: visible changed', { visible, modalVisible });
    if (visible) {
      // ensure we mount immediately, then animate on next frame
      setModalVisible(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(sheetY, { toValue: 0, bounciness: 8, useNativeDriver: true }),
        ]).start(() => {
          Animated.parallel([
            Animated.spring(scaleIn, { toValue: 1, bounciness: 6, useNativeDriver: true }),
            Animated.timing(fadeIn, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]).start();
        });
      });
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const shouldRender = (visible || modalVisible);
  console.log('🔧 AnnouncementSheet: Return check', { modalVisible, visible, variant, willReturnNull: !shouldRender || !variant });
  if (!shouldRender || !variant) {
    console.log('🔧 AnnouncementSheet: Returning null');
    return null;
  }
  console.log('🔧 AnnouncementSheet: Rendering Modal');

  const isReward = variant.type === 'reward_unlocked';
  const isCoachUnlock = variant.type === 'coach_unlocked';

  return (
    <Modal transparent animationType="none" visible={visible || modalVisible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheetWrapper, { transform: [{ translateY: sheetY }] }]}>
        <SafeAreaView style={styles.sheet}>
          <Animated.View style={[styles.inner, { transform: [{ scale: scaleIn }], opacity: fadeIn }]}>
            {isCoachUnlock ? (
              <>
                <Text style={styles.title}>New Coach Unlocked</Text>
                {/* Show coach avatar if available, fallback to brain icon */}
                {unlockedCoach?.image_url ? (
                  <Image 
                    source={{ uri: unlockedCoach.image_url }} 
                    style={styles.coachAvatar} 
                  />
                ) : (
                  <Image source={require('../assets/images/brain-icon.png')} style={styles.icon} />
                )}
                <Text style={styles.big}>{unlockedCoach?.name || variant.coachName}</Text>
                <Text style={styles.sub}>{unlockedCoach?.name || variant.coachName} is now available.</Text>
                {unlockedCoach?.style && (
                  <Text style={styles.coachStyle}>{unlockedCoach.style}</Text>
                )}
              </>
            ) : isReward ? (
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

            {isCoachUnlock ? (
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  onPress={() => {
                    onClose();
                    router.push('/choose-coach');
                  }} 
                  activeOpacity={0.8} 
                  style={[styles.closeBtn, styles.ctaBtn]}
                >
                  <Text style={styles.closeText}>Choose Coach</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>Later</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.closeBtn}>
                <Text style={styles.closeText}>{isReward ? 'Close' : 'Nice'}</Text>
              </TouchableOpacity>
            )}
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
  coachAvatar: { width: 80, height: 80, borderRadius: 40, marginVertical: 8 },
  coachStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
  buttonContainer: { flexDirection: 'column', gap: 12, marginTop: 8, alignItems: 'center' },
  closeBtn: { marginTop: 8, alignSelf: 'center', backgroundColor: 'rgba(121, 75, 214, 0.3)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  ctaBtn: { backgroundColor: 'rgba(121, 75, 214, 0.8)', borderColor: 'rgba(121, 75, 214, 1)', marginTop: 0 },
  secondaryBtn: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  closeText: { color: 'white', fontSize: 14, fontWeight: '300' },
  secondaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '300' },
}); 