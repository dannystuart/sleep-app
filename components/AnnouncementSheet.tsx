import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Dimensions, Modal, TouchableWithoutFeedback,
  TouchableOpacity, StyleSheet, View, Text, SafeAreaView, Image, Image as RNImage
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [currentVariant, setCurrentVariant] = useState<Variant | null>(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  
  const router = useRouter();
  const { coaches } = useApp();

  const [unlockImageUri, setUnlockImageUri] = useState<string | undefined>(undefined);
  const [imageVersion, setImageVersion] = useState(0);

  // --- Coach unlock card intro animation (RN Animated) ---
  const cardTx = useRef(new Animated.Value(0)).current;      // translateX (px)
  const cardRot = useRef(new Animated.Value(0)).current;     // 1 -> 0 maps to 12deg -> 0deg
  const cardOpacity = useRef(new Animated.Value(0)).current; // 0 -> 1

  const cardAnimatedStyle = {
    opacity: cardOpacity,
    transform: [
      { translateX: cardTx },
      { rotateZ: cardRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '12deg'] }) },
    ],
  } as const;

// Cache variant on open so we can animate out smoothly even if parent clears it
useEffect(() => {
  if (visible && variant) {
    setCurrentVariant(variant);
  }
}, [visible, variant]);

useEffect(() => {
  if (modalVisible && currentVariant?.type === 'coach_unlocked') {
    // Start off-canvas to the right with a slight forward tilt
    cardTx.setValue(360);
    cardRot.setValue(1);   // 1 corresponds to 12deg via interpolation
    cardOpacity.setValue(0);

    const delayMs = 500;
    const slideMs = 600;

    Animated.sequence([
      Animated.delay(delayMs),
      Animated.parallel([
        Animated.timing(cardTx, { toValue: 0, duration: slideMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardRot, { toValue: 0, duration: slideMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
  } else {
    // Reset when not visible or variant changes away
    cardTx.setValue(0);
    cardRot.setValue(0);
    cardOpacity.setValue(1);
  }
}, [modalVisible, currentVariant?.type]);

  // Normalise a possible Supabase Storage path into a public URL (no-op if already a URL)
  function resolveUnlockCardUrl(raw?: string | null) {
    if (!raw) return undefined;
    const val = String(raw).trim();
    if (!val || val.toUpperCase() === 'NULL') return undefined;
    // Absolute URL: allow only Supabase public storage by default
    if (/^https?:\/\//i.test(val)) {
      // Accept only Supabase public storage URLs
      if (/supabase\.co\/storage\/v1\/object\/public\//i.test(val)) return val;
      // Block any other external URL (like Pexels) to avoid placeholders
      return undefined;
    }
    // If the DB stores a storage path like `unlock-cards/coach-3.png`,
    // expect an env/public base like `process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BASE`.
    // Fallback to `https://YOUR-PROJECT.supabase.co/storage/v1/object/public/` if provided.
    const base = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BASE; // e.g. .../storage/v1/object/public/coaches/
    if (base) {
      return `${base.replace(/\/$/, '')}/${val.replace(/^\//, '')}`;
    }
    return undefined;
  }
  
  // Look up coach if this is a coach unlock variant
const unlockedCoach = currentVariant?.type === 'coach_unlocked' 
  ? coaches.find(c => String(c.id) === String(currentVariant.coachId))
    : null;

  const resolvedCardUrl = resolveUnlockCardUrl(unlockedCoach?.unlock_card);

  // Debug logging
  console.log('🔧 AnnouncementSheet: Coach lookup debug', {
    variant,
    coachesCount: Array.isArray(coaches) ? coaches.length : -1,
    unlockedCoach,
    unlockCardRaw: unlockedCoach?.unlock_card,
    resolvedCardUrl,
    hasUnlockCard: !!resolvedCardUrl,
  });

useEffect(() => {
  console.log('🔧 AnnouncementSheet: visible changed', { visible, modalVisible, variant: variant?.type, currentVariant: currentVariant?.type });
  if (visible) {
    const v = variant || currentVariant;
    const startY = v?.type === 'coach_unlocked' ? SCREEN_HEIGHT * 0.7 : SHEET_HEIGHT;
    sheetY.setValue(startY);

    setModalVisible(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, bounciness: 8, useNativeDriver: true }),
    ]).start();
  } else {
    const v = currentVariant || variant;
    const targetHeight = v?.type === 'coach_unlocked' ? SCREEN_HEIGHT * 0.7 : SHEET_HEIGHT;
    console.log('🔧 AnnouncementSheet: Closing with target height', { targetHeight, variant: v?.type });
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: targetHeight, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      console.log('🔧 AnnouncementSheet: Close animation completed, setting modalVisible to false');
      setModalVisible(false);
      setCurrentVariant(null);
    });
  }
}, [visible]);

useEffect(() => {
  if (currentVariant?.type === 'coach_unlocked') {
    const coach = coaches.find(c => String(c.id) === String(currentVariant.coachId));
    const resolved = resolveUnlockCardUrl(coach?.unlock_card);
      setUnlockImageUri(resolved);
      setImageVersion(v => v + 1);
      if (resolved) {
        RNImage.prefetch(resolved)
          .then(() => console.log('🔧 AnnouncementSheet: Prefetched unlock card', resolved))
          .catch((err) => console.warn('🔧 AnnouncementSheet: Prefetch failed', { resolved, err }));
      }
    } else {
      setUnlockImageUri(undefined);
    }
}, [currentVariant, coaches]);


if (!modalVisible || !currentVariant) {
    return null;
  }

const isReward = currentVariant.type === 'reward_unlocked';
const isCoachUnlock = currentVariant.type === 'coach_unlocked';

  return (
    <Modal transparent animationType="none" visible={modalVisible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[
        styles.sheetWrapper, 
        { 
          transform: [{ translateY: sheetY }],
          height: isCoachUnlock ? SCREEN_HEIGHT * 0.7 : SHEET_HEIGHT
        }
      ]}>
        <SafeAreaView style={styles.sheet}>
          <View 
            style={[
              styles.inner, 
              { 
                justifyContent: isCoachUnlock ? 'flex-start' : 'center'
              }
            ]}
          >
            {isCoachUnlock ? (
              <>
                <Text style={styles.title}>You unlocked a new coach!</Text>
                {/* Show unlock card if available, fallback to coach avatar, then brain icon */}
                {unlockImageUri ? (
                  <Animated.View style={[styles.cardAnimHolder, cardAnimatedStyle]}>
                    <Image
                      key={`${unlockImageUri}-${imageVersion}`}
                      source={{ uri: unlockImageUri }}
                      style={styles.unlockCard}
                      onError={(e) => console.warn('🔧 AnnouncementSheet: unlock card failed to load', { unlockImageUri, e: e?.nativeEvent })}
                      onLoad={() => console.log('🔧 AnnouncementSheet: unlock card loaded', unlockImageUri)}
                      resizeMode="cover"
                    />
                  </Animated.View>
                ) : unlockedCoach?.image_url ? (
                  <Animated.View style={[styles.cardAnimHolder, cardAnimatedStyle]}>
                    <Image
                      source={{ uri: unlockedCoach.image_url }}
                      style={[styles.unlockCard, styles.coachAvatar]}
                      onError={(e) => console.warn('🔧 AnnouncementSheet: coach avatar failed to load', { image_url: unlockedCoach.image_url, e: e?.nativeEvent })}
                      resizeMode="cover"
                    />
                  </Animated.View>
                ) : (
                  <Image source={require('../assets/images/brain-icon.png')} style={styles.icon} />
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
                <Text style={styles.big}>{currentVariant.streak} days running</Text>
                <Text style={styles.sub}>Keep it going tonight.</Text>
              </>
            )}

            {isCoachUnlock ? (
              <TouchableOpacity 
                onPress={onClose} 
                activeOpacity={0.8} 
                style={styles.doneWrapper}
              >
                <LinearGradient
                  colors={['#794BD6', '#585ED2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.doneButton}
                >
                  <Text style={styles.doneText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.closeBtn}>
                <Text style={styles.closeText}>{isReward ? 'Close' : 'Nice'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.2)' },
  sheetWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: { flex: 1, backgroundColor: '#15131A', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, alignItems: 'center' },
  title: { color: 'white', fontSize: 24, textAlign: 'center', marginBottom: 32, fontWeight: '500', fontFamily: 'DMSans' },
  big: { color: 'white', fontSize: 24, textAlign: 'center', marginBottom: 8, fontWeight: '500', fontFamily: 'DMSans' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', marginBottom: 16, fontFamily: 'DMSans' },
  icon: { width: 48, height: 48, marginVertical: 8, tintColor: '#F99393' },
  coachAvatar: { marginVertical: 8 },
  unlockCard: { width: 300, height: 300, marginVertical: 8, borderColor: 'rgba(255,255,255,0.1)' },
  cardAnimHolder: {
    width: 300,
    height: 300,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', marginBottom: 16, fontStyle: 'italic', fontFamily: 'DMSans' },
  buttonContainer: { flexDirection: 'column', gap: 12, marginTop: 8, alignItems: 'center' },
  closeBtn: { marginTop: 8, alignSelf: 'center', backgroundColor: 'rgba(121, 75, 214, 0.3)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  ctaBtn: { backgroundColor: 'rgba(121, 75, 214, 0.8)', borderColor: 'rgba(121, 75, 214, 1)', marginTop: 0 },
  secondaryBtn: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  closeText: { color: 'white', fontSize: 14, fontWeight: '300', fontFamily: 'DMSans' },
  secondaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '300', fontFamily: 'DMSans' },
  doneWrapper: { 
    position: 'absolute', 
    bottom: 24, 
    left: 24, 
    right: 24 
  },
  doneButton: { height: 64, borderRadius: 25, justifyContent: 'center', alignItems: 'center', width: '100%' },
  doneText: { color: 'white', fontSize: 16, fontWeight: '500', fontFamily: 'DMSans' },
});