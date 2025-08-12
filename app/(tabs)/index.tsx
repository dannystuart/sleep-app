import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import ErrorBoundary from '../../components/ErrorBoundary';
import { NetworkStatus } from '../../components/NetworkStatus';
import { SafeAreaView } from '../../components/SafeAreaView';
import PlayButton from '../../components/PlayButton';
import { useApp } from '../../contexts/AppContext';
import { StreakPublicState } from '../../types';
import { DebugPanel } from '../../components/DebugPanel';
import { StreakSheet } from '../../components/StreakSheet';
import { AnnouncementSheet } from '../../components/AnnouncementSheet';

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width, 400);

export default function HomeScreen() {
  const router = useRouter();
  const { coaches, classes, selectedCoachId, selectedClassId, timerSeconds, isLoading, streak: streakApi } = useApp();
  const [streakUI, setStreakUI] = useState<StreakPublicState | null>(null);
  const [showStreakSheet, setShowStreakSheet] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // pull announcements from context
  const app = useApp();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await streakApi.getState();
      if (mounted) setStreakUI(s);
    })();
    return () => { mounted = false; };
  }, [streakApi]);

  // Auto-show announcement on mount (if any queued)
  useEffect(() => {
    // when streakUI loaded and we have announcements, show the top one
    if (streakUI && app.announcements && app.announcements.length > 0) {
      setShowAnnouncement(true);
    }
  }, [streakUI, app.announcements]);

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

  // streak variants
  const streakCount = streakUI?.current ?? 0;
  const isCompact = streakCount <= 3;
  const isCounter = streakCount >= 4 && streakCount <= 6;
  const isBig = streakCount >= 7;

  // how many *contiguous* done days ending today (from last7 oldest->newest)
  const tailFromEnd = React.useMemo(() => {
    const days = streakUI?.last7 ?? [];
    let cnt = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].done) cnt++; else break;
    }
    return cnt;
  }, [streakUI]);

  // COMPACT CARD DATA (≤3)
  // - window size: 3 for streak 1–2, 4 for streak == 3
  // - lit = the contiguous tail (max 3) oldest->today
  // - pad with future dim days to fill the window
  const compactCardDays = React.useMemo(() => {
    const windowSize = streakCount === 3 ? 4 : 3;
    const litCount = Math.min(tailFromEnd, 3);
    const days = streakUI?.last7 ?? [];

    const toLabel = (isoKey: string) =>
      new Date(isoKey).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3);

    const litSlice = days.slice(-litCount); // oldest->today
    const lit = litSlice.map(d => ({ label: toLabel(d.key), done: true }));

    const todayISO = days[days.length - 1]?.key ?? null;
    const todayDate = todayISO ? new Date(`${todayISO}T00:00:00`) : new Date();

    const pads = Array.from({ length: Math.max(0, windowSize - lit.length) }).map((_, i) => {
      const d = new Date(todayDate);
      d.setDate(d.getDate() + (i + 1));
      return {
        label: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3),
        done: false,
      };
    });

    return [...lit, ...pads];
  }, [streakUI, streakCount, tailFromEnd]);

  // SHEET DATA: for <7, show 7 items total:
  //  - earliest→today (lit, length = tailFromEnd)
  //  - then pad with future days (dim) to reach 7
  const sheetModeBig = streakCount >= 7;

  const streakSheetDays = React.useMemo(() => {
    if (!streakUI?.last7?.length || sheetModeBig) return [];

    const days = streakUI.last7;                 // oldest -> newest
    const take = Math.min(tailFromEnd, 7);       // lit tail length (ending today)
    const litSlice = days.slice(-take);          // oldest -> today (lit)

    const labelFromISO = (iso: string) =>
      new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3);

    const lit = litSlice.map(d => ({ label: labelFromISO(d.key), done: true }));

    // pad with future days (dim) to make 7 total
    const todayISO = days[days.length - 1]?.key;
    const todayDate = todayISO ? new Date(`${todayISO}T00:00:00`) : new Date();
    const padCount = 7 - lit.length;

    const pads = Array.from({ length: Math.max(0, padCount) }).map((_, i) => {
      const d = new Date(todayDate);
      d.setDate(d.getDate() + (i + 1)); // next days after today
      return {
        label: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3),
        done: false,
      };
    });

    // final: 7 items, earliest→today lit first, then future dims
    return [...lit, ...pads];
  }, [streakUI, tailFromEnd, sheetModeBig]);

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
              <TouchableOpacity activeOpacity={0.8} onPress={() => setShowStreakSheet(true)}>
                <View style={styles.streakCard}>
                  <View style={styles.streakContent}>
                    <View style={styles.streakLeft}>
                      <Text style={styles.streakTitle}>Your Streak</Text>

                      {/* ≤3 days: compact row (today + next 2) */}
                      {isCompact && (
                        <View style={[styles.daysContainer, { justifyContent: 'flex-start', gap: 16 }]}>
                          {compactCardDays.map((d, idx) => (
                            <View key={`${d.label}-${idx}`} style={[styles.dayItem, { width: 'auto' }]}>
                              <Image
                                source={require('../../assets/images/moon-icon.png')}
                                style={[styles.moonIcon, { opacity: d.done ? 1 : 0.3 }]}
                              />
                              <Text style={styles.dayText}>{d.label}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* 4–6 days: counter */}
                      {isCounter && (
                        <View style={{ paddingTop: 4 }}>
                          <Text style={styles.streakCounterText}>{streakCount}-day streak</Text>
                        </View>
                      )}

                      {/* 7+ days: big number */}
                      {isBig && (
                        <View style={{ paddingTop: 4 }}>
                          <Text style={styles.streakBigText}>{streakCount} days</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.streakRight}>
                      {/* Evergreen message — no "X days to surprise" */}
                      <Text style={styles.streakMessage}>Nice run — keep it going</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

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

                {/* Start Session */}
                <View style={styles.startSession}>
                  <Text style={styles.startSessionText}>Start Session</Text>
                  <PlayButton onPress={handlePlayButtonPress} />
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
        <DebugPanel />
      </View>

      <StreakSheet
        visible={showStreakSheet}
        onClose={() => setShowStreakSheet(false)}
        days={streakSheetDays}
        currentStreak={streakCount}
        bestStreak={streakUI?.best ?? 0}
        mode={sheetModeBig ? 'big' : 'row'}
      />

      <AnnouncementSheet
        visible={showAnnouncement && (app.announcements?.length ?? 0) > 0}
        onClose={() => {
          setShowAnnouncement(false);
          app.shiftAnnouncement?.();
        }}
        variant={
          app.announcements?.[0]
            ? (app.announcements[0].type === 'reward_unlocked'
                ? { type: 'reward_unlocked', streak: app.announcements[0].streak, rewardId: app.announcements[0].rewardId }
                : { type: 'streak_plus', streak: app.announcements[0].streak })
            : null
        }
      />
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
  streakCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '300',
  },
  streakBigText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '400',
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