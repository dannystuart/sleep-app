import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { RatingBottomSheet } from '../../components/RatingBottomSheet';
import { useApp } from '../../contexts/AppContext';
import { track } from '../../lib/analytics';

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width, 400);

// Remove mock data - will be replaced with real data from database

interface Segment {
  value: number;   // percentage (0–100)
  color: string;   // e.g. '#9DEABB'
}

interface CircularProgressProps {
  size: number;                // diameter of outer circle in px
  strokeWidth: number;         // thickness of each segment
  gapSize?: number;            // size of gap between segments in px
  segments: Segment[];         // your data
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size, strokeWidth, gapSize = 4, segments
}) => {
  const radius = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * radius;

  // Calculate total gap space needed
  const totalGaps = segments.length > 1 ? segments.length : 0;
  const totalGapSpace = totalGaps * gapSize;
  
  // Calculate available space for segments (total circumference minus gaps)
  const availableSpace = C - totalGapSpace;
  
  // Compute each arc length proportionally
  const arcLengths = segments.map(s => (s.value / 100) * availableSpace);
  
  // Compute offsets with proper gap spacing
  const offsets = arcLengths.reduce<number[]>((acc, len, i) => {
    if (i === 0) {
      acc[i] = 0;
    } else {
      acc[i] = acc[i - 1] + arcLengths[i - 1] + gapSize;
    }
    return acc;
  }, []);

  const bleed = 8;
  const total = size + bleed * 2;         // new "canvas" dimension

  return (
    <View
      style={{
        width: total,
        height: total,
        overflow: 'visible',
      }}
      collapsable={false}
    >
      <Svg
        width={total}
        height={total}
        viewBox={`0 0 ${total} ${total}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: 'visible' }}
      >
        {/* 
          Rotate your group around the true center of the SVG,
          which is (total/2, total/2) 
        */}
        <G rotation={-90} origin={`${total/2}, ${total/2}`}>
          {segments.map((seg, i) => {
            const dash = `${arcLengths[i]} ${C}`;
            const offset = -offsets[i];

            // three glow layers + one main arc
            const glowConfigs = [
              { extra: 20, opacity: 0.02 },
              { extra: 16, opacity: 0.06 },
              { extra: 12, opacity: 0.10 },
              { extra: 8, opacity: 0.12 },
              { extra: 4,  opacity: 0.16 },
              { extra: 2,  opacity: 0.20 },
            ];

            return (
              <React.Fragment key={i}>
                {glowConfigs.map((g, j) => (
                  <Circle
                    key={`glow-${j}`}
                    cx={total/2} cy={total/2} r={radius}
                    stroke={seg.color}
                    strokeWidth={strokeWidth + g.extra}
                    strokeOpacity={g.opacity}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={dash}
                    strokeDashoffset={offset}
                  />
                ))}

                {/* main colored segment */}
                <Circle
                  cx={total/2} cy={total/2} r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                />
              </React.Fragment>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

export default function DiaryScreen() {
  const { diary, rateDiaryEntry } = useApp();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetEntry, setSheetEntry] = useState<{ id: string; date: string } | null>(null);
  
  // Add month selector state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Convert diary -> UI model
  const entries = diary.map(row => {
    const d = new Date(`${row.dateKey}T00:00:00`);
    const dateLabel = [
      d.toLocaleDateString('en-GB', { weekday: 'short' }),
      d.getDate(),
      d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    ].join(' ');

    let statusText: string | null = null;
    let statusColor: string | null = null;
    if (row.rating === 'Good') { statusText = 'Good'; statusColor = '#4ADE80'; }
    else if (row.rating === 'OK') { statusText = 'OK'; statusColor = '#60A5FA'; }
    else if (row.rating === 'Poor') { statusText = 'Poor'; statusColor = '#F87171'; }

    return {
      id: row.id,
      date: dateLabel,
      coach: row.coachName,
      level: row.className,
      status: statusText,
      statusColor,
      isRateButton: row.rating === null,
      originalDateKey: row.dateKey,
    };
  });

  // Month navigation logic
  const today = new Date();
  const isNextDisabled =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth();

  const handlePrevMonth = () => {
    setSelectedDate(prev =>
      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };
  
  const handleNextMonth = () => {
    if (!isNextDisabled) {
      setSelectedDate(prev =>
        new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
      );
    }
  };

  const monthText = selectedDate
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    .toUpperCase();

  // Filter entries for the selected month
  const filteredEntries = entries.filter(entry => {
    const d = new Date(entry.originalDateKey);
    return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth() === selectedDate.getMonth()
    );
  });

  // Tally ratings for the selected month
  const ratingCounts = filteredEntries.reduce(
    (acc, e) => {
      if (e.status === 'Good') acc.good++;
      if (e.status === 'OK') acc.ok++;
      if (e.status === 'Poor') acc.poor++;
      return acc;
    },
    { good: 0, ok: 0, poor: 0 }
  );

  const totalCount = ratingCounts.good + ratingCounts.ok + ratingCounts.poor;

  // Build dynamic segments array
  let circleSegments: { value: number; color: string }[];

  if (totalCount === 0) {
    // No ratings → full 100% purple ring
    circleSegments = [
      { value: 100, color: '#794BD6' }
    ];
  } else {
    circleSegments = [
      // Only include each slice if count > 0
      ...(ratingCounts.good > 0
        ? [{ value: (ratingCounts.good / totalCount) * 100, color: '#4ADE80' }]
        : []),
      ...(ratingCounts.ok > 0
        ? [{ value: (ratingCounts.ok / totalCount) * 100, color: '#60A5FA' }]
        : []),
      ...(ratingCounts.poor > 0
        ? [{ value: (ratingCounts.poor / totalCount) * 100, color: '#F87171' }]
        : []),
    ];
  }

  // No useEffect needed - data comes from context

  function onPressRate(entryId: string, dateLabel: string) {
    setSheetEntry({ id: entryId, date: dateLabel });
    setSheetVisible(true);
  }

  async function handleSubmit(rating: 'Good' | 'OK' | 'Poor') {
    if (sheetEntry) {
      await rateDiaryEntry(sheetEntry.id, rating);
      track('diary_entry_rated', {
        date_key: sheetEntry.id,
        rating,
      }).catch(() => {});
    }
    setSheetVisible(false);
  }

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.mobileContainer, { maxWidth }]}>  
          {/* Top Section */}
          <View style={styles.topHalf}>
            <Text style={styles.title}>Sleep Diary</Text>
            
            <View style={styles.progressContainer}>
              <CircularProgress
                size={120}
                strokeWidth={12}
                gapSize={18}
                segments={circleSegments}
              />
              
              {/* Inner circle removed - no longer needed */}
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNavigation}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={handlePrevMonth}
              >
                <ChevronLeft color="white" size={20} />
              </TouchableOpacity>

              <Text style={styles.monthText}>{monthText}</Text>

              <TouchableOpacity 
                style={[
                  styles.navButton,
                  isNextDisabled && styles.disabledNavButton,
                ]}
                onPress={handleNextMonth}
                disabled={isNextDisabled}
              >
                <ChevronRight color="white" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Entries List */}
          <View style={styles.bottomHalf}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry, index) => {
                  const isFirst = index === 0;
                  return (
                    <View
                      key={entry.id}
                      style={
                        isFirst
                          ? styles.firstEntryContainer
                          : styles.entryContainer
                      }
                    >
                      <Text style={styles.entryDate}>{entry.date}</Text>
                      <View style={styles.glassCard}>
                        <View style={styles.entryContent}>
                          <View style={styles.entryLeft}>
                            <Text style={styles.coachName}>
                              {entry.coach}
                            </Text>
                            <Text style={styles.levelText}>
                              {entry.level}
                            </Text>
                          </View>
                          <View style={styles.entryRight}>
                            {entry.isRateButton ? (
                              <TouchableOpacity 
                                style={styles.rateButton}
                                onPress={() => onPressRate(entry.id, entry.date)}
                              >
                                <Text style={styles.rateButtonText}>
                                  Rate
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.statusContainer}>
                                <Text style={styles.statusText}>
                                  {entry.status}
                                </Text>
                                <View
                                  style={[
                                    styles.statusDot,
                                    { backgroundColor: entry.statusColor || 'transparent' },
                                  ]}
                                />
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No entries for {monthText}</Text>
                  <Text style={styles.emptyStateSubtext}>Complete a sleep session to see your diary entries here</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>

      <RatingBottomSheet
        visible={sheetVisible}
        dateLabel={sheetEntry?.date || ''}
        onClose={() => setSheetVisible(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  //////////////////////////////////////////////////////
  // Container Styles
  //////////////////////////////////////////////////////
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
    fontFamily: 'DMSans',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: 'DMSans',
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'DMSans',
  },

  //////////////////////////////////////////////////////
  // Top Section
  //////////////////////////////////////////////////////
  topHalf: {
    height: '40%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300',
    marginBottom: 24,
    fontFamily: 'DMSans',
  },

  //////////////////////////////////////////////////////
  // Navigation
  //////////////////////////////////////////////////////
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    marginHorizontal: 32,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledNavButton: {
    opacity: 0.3,
  },
  monthText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 6,
    fontFamily: 'DMSans',
  },

  //////////////////////////////////////////////////////
  // Entries List
  //////////////////////////////////////////////////////
  bottomHalf: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  firstEntryContainer: {
    marginTop: 36,
    marginBottom: 24,
  },
  entryContainer: {
    marginBottom: 24,
  },
  entryDate: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    marginBottom: 16,
    fontFamily: 'DMSans',
  },

  //////////////////////////////////////////////////////
  // Glass Card Styles
  //////////////////////////////////////////////////////
  glassCard: {
    backgroundColor: 'rgba(121,75,214,0.1)',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryLeft: {
    flex: 1,
  },
  coachName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    marginBottom: 12,
    fontFamily: 'DMSans',
  },
  levelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    marginRight: 8,
    fontFamily: 'DMSans',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rateButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  rateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },

  //////////////////////////////////////////////////////
  // Progress Circle Styles
  //////////////////////////////////////////////////////
  progressContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'DMSans',
  },
});
