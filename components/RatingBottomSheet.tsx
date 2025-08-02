import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65; // half‐screen

type Rating = 'Good' | 'OK' | 'Poor';
const COLORS: Record<Rating, string> = {
  Good: '#9DEABB',
  OK:   '#9DEADD',
  Poor: '#F6B6B6',
};

interface Props {
  visible: boolean;
  dateLabel: string;
  initial?: Rating;
  onClose: () => void;
  onSubmit: (rating: Rating) => void;
}

export function RatingBottomSheet({
  visible,
  dateLabel,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY        = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [selected, setSelected] = useState<Rating | undefined>(initial);

  // when `visible` flips, run our custom in/out animations
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      // show: fade in backdrop & spring‐up sheet
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // hide: slide sheet down & fade out
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: SHEET_HEIGHT,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  // reset selection when opened
  useEffect(() => {
    if (visible) setSelected(initial);
  }, [visible]);

  if (!modalVisible) return null;

  return (
    <Modal transparent animationType="none" visible={modalVisible} onRequestClose={onClose}>
      {/* backdrop (fixed, only opacity animates) */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* sheet (slides up/down) */}
      <Animated.View
        style={[
          styles.sheetWrapper,
          { transform: [{ translateY: sheetY }] }
        ]}
      >
        <SafeAreaView style={styles.sheet}>
          <View style={styles.inner}>
            <Text style={styles.date}>{dateLabel}</Text>
            <Text style={styles.prompt}>How was your sleep on this night?</Text>

            {(['Good','OK','Poor'] as Rating[]).map(r => {
              const isSel = selected === r;
              return (
                <TouchableOpacity
                  key={r}
                  activeOpacity={0.8}
                  onPress={() => setSelected(r)}
                  style={[
                    styles.option,
                    { borderColor: isSel ? COLORS[r] : 'rgba(255,255,255,0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSel ? COLORS[r] : 'white' },
                    ]}
                  >
                    {r}
                  </Text>
                  {isSel && <View style={[styles.dot, { backgroundColor: COLORS[r] }]} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.doneWrapper}
              onPress={() => selected && onSubmit(selected)}
              disabled={!selected}
            >
              <LinearGradient
                colors={['#794BD6', '#585ED2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.doneButton, !selected && { opacity: 0.5 }]}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0, right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    
  },
  sheet: {
    flex: 1,
    backgroundColor: '#15131A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  date: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  prompt: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 36,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 24,
    height: 64,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '300',
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
  },
  doneWrapper: {
    marginTop: 16, marginBottom: 32,
  },
  doneButton: {
    height: 64, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  doneText: {
    color: 'white', fontSize: 16, fontWeight: '500',
  },
}); 