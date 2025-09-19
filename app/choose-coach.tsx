import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../components/SafeAreaView';
import { useApp } from '../contexts/AppContext';
import { ChevronLeft } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width, 400);

export default function ChooseCoachScreen() {
  const router = useRouter();
  const { coaches, selectedCoachId, setCoach, streak } = useApp();
  const [tempSelectedCoachId, setTempSelectedCoachId] = useState(selectedCoachId);
  const [bestStreak, setBestStreak] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await streak.getState?.();
        if (alive) setBestStreak(s?.best ?? 0);
      } catch (err) {
        console.warn('Failed to load best streak', err);
        if (alive) setBestStreak(0);
      }
    })();
    return () => { alive = false; };
  }, [streak]);

  // treat null/undefined as 0 to keep old rows visible at start
  const unlockedCoaches = useMemo(
    () => (coaches ?? []).filter(c => (c.unlock_streak ?? 0) <= bestStreak),
    [coaches, bestStreak]
  );

  useEffect(() => {
    if (!unlockedCoaches?.length) return;
    const stillVisible = unlockedCoaches.some(c => c.id === tempSelectedCoachId);
    if (!stillVisible) {
      setTempSelectedCoachId(unlockedCoaches[0].id);
    }
  }, [unlockedCoaches, tempSelectedCoachId]);

  const handleCoachSelect = (coachId: string) => {
    setTempSelectedCoachId(coachId);
  };

  const handleBackPress = async () => {
    if (unlockedCoaches.length > 0 && tempSelectedCoachId !== selectedCoachId) {
      await setCoach(tempSelectedCoachId);
    }
    router.back();
  };

  const renderCoach = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.coachCard,
        item.id === tempSelectedCoachId && styles.selectedCoachCard
      ]}
      onPress={() => handleCoachSelect(item.id)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image_url }} style={styles.coachImage} />
      <View style={styles.coachInfo}>
        <Text style={styles.coachName}>{item.name}</Text>
        {item.locale && item.style && (
          <Text style={styles.coachDetails}>{item.locale}, {item.style}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.mobileContainer, { maxWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.title}>Choose Coach</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Coaches List */}
          <FlatList
            data={unlockedCoaches}
            renderItem={renderCoach}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ paddingTop: 24, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                  No coaches unlocked yet.
                </Text>
              </View>
            }
          />
        </View>
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
  mobileContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    paddingBottom: 20,
  },
  coachCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCoachCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  coachImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 4,
    fontFamily: 'DMSans',
  },
  coachDetails: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
}); 