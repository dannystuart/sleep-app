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
import { supabase } from '../../lib/supabase';

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
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetDate, setSheetDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  
  // Add month selector state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchDiaryEntries = async () => {
    try {
      setLoading(true);
      console.log('Fetching diary entries from session_complete table...');

      const { data, error } = await supabase
        .from('session_complete')
        .select('id, session_date, coach_name, class_name, rating')
        .order('session_date', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        setLoading(false);
        return;
      }

      if (!data?.length) {
        console.log('No data returned from database');
        setDiaryEntries([]);
        setLoading(false);
        return;
      }

      console.log('Raw data from database:', data);
      console.log('Number of entries:', data.length);

      const formattedEntries = data.map(row => {
        console.log('Processing entry:', row);
        
        const d = new Date(row.session_date);
        const dateLabel = [
          d.toLocaleDateString('en-US', { weekday: 'short' }),
          d.getDate(),
          d.toLocaleDateString('en-US', { month: 'short' }),
        ].join(' ');

        let isRateButton = false;
        let statusColor: string|null = null;
        let statusText: string|null = null;

        if (!row.rating) {
          isRateButton = true;
        } else {
          switch (row.rating) {
            case 'Good':
              statusText = 'Good';
              statusColor = '#4ADE80';
              break;
            case 'OK':
              statusText = 'OK';
              statusColor = '#60A5FA';
              break;
            case 'Poor':
              statusText = 'Poor';
              statusColor = '#F87171';
              break;
            default:
              isRateButton = true;
          }
        }

        const formattedEntry = {
          id: row.id,
          date: dateLabel,
          coach: row.coach_name,
          level: row.class_name,
          status: statusText,
          statusColor,
          isRateButton,
          originalDate: row.session_date,
        };
        
        console.log('Formatted entry:', formattedEntry);
        return formattedEntry;
      });

      console.log('Final formatted entries:', formattedEntries);
      setDiaryEntries(formattedEntries);
    } catch (err) {
      console.error('Error fetching diary entries:', err);
    } finally {
      setLoading(false);
    }
  };

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
  const filteredEntries = diaryEntries.filter(entry => {
    const d = new Date(entry.originalDate);
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

  useEffect(() => {
    fetchDiaryEntries();
    
    // Force loading to false after 5 seconds to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Forcing loading to false after timeout');
        setLoading(false);
      }
    }, 5000);
    
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  function onPressRate(date: string) {
    setSheetDate(date);
    setSheetVisible(true);
  }

  async function handleSubmit(rating: 'Good' | 'OK' | 'Poor') {
    const entryToUpdate = diaryEntries.find(entry => entry.date === sheetDate);

    if (!entryToUpdate) {
      console.error('No diary entry found for date:', sheetDate);
      setSheetVisible(false);
      return;
    }

    // Validate rating value
    if (!['Good', 'OK', 'Poor'].includes(rating)) {
      console.error('Invalid rating submitted:', rating);
      setSheetVisible(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('session_complete')
        .update({ rating: rating }) // Send exact case to match DB constraint
        .eq('id', entryToUpdate.id)
        .select(); // fetch the updated row

      if (error) {
        console.error('Supabase error during update:', JSON.stringify(error, null, 2));
      } else {
        console.log('Successfully updated rating:', data);
        fetchDiaryEntries();
      }
    } catch (err) {
      console.error('Unexpected error updating rating:', err);
    } finally {
      setSheetVisible(false);
    }
  }

  console.log('Diary render state:', { loading, diaryEntriesLength: diaryEntries.length });
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading diary entries...</Text>
      </View>
    );
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
                                onPress={() => onPressRate(entry.date)}
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
                                    { backgroundColor: entry.statusColor },
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
        dateLabel={sheetDate}
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
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
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
  },
  levelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '300',
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
  },
});
