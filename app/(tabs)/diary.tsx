import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { RatingBottomSheet } from '../../components/RatingBottomSheet';

const { width } = Dimensions.get('window');
const maxWidth = Math.min(width, 400);

// Mock data for diary entries
const diaryEntries = [
  {
    id: 1,
    date: 'Thu 30 May',
    coach: 'Professor Joe',
    level: 'Mixed Level 1',
    status: 'Good',
    statusColor: '#4ADE80',
  },
  {
    id: 2,
    date: 'Thu 30 May',
    coach: 'Professor Joe',
    level: 'Mixed Level 1',
    status: 'Rate',
    statusColor: '#8B5CF6',
    isRateButton: true,
  },
  {
    id: 3,
    date: 'Thu 30 May',
    coach: 'Professor Joe',
    level: 'Mixed Level 1',
    status: 'Poor',
    statusColor: '#F87171',
  },
  {
    id: 4,
    date: 'Wed 29 May',
    coach: 'Professor Joe',
    level: 'Mixed Level 1',
    status: 'Good',
    statusColor: '#4ADE80',
  },
  {
    id: 5,
    date: 'Tue 28 May',
    coach: 'Professor Joe',
    level: 'Mixed Level 1',
    status: 'Rate',
    statusColor: '#8B5CF6',
    isRateButton: true,
  },
  {
    id: 6,
    date: 'Mon 27 May',
    coach: 'Professor Joe',
    level: 'Mixed Level 1',
    status: 'Good',
    statusColor: '#4ADE80',
  },
];

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

  // compute each arc in px, subtracting the gap from its painted length
  const arcLengths = segments.map(s => (s.value / 100) * C - gapSize);
  // compute offsets so each segment starts after the last + gap
  const offsets = arcLengths.reduce<number[]>((acc, len, i) => {
    acc[i] = i === 0 ? 0 : acc[i - 1] + arcLengths[i - 1] + gapSize;
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

  function onPressRate(date: string) {
    setSheetDate(date);
    setSheetVisible(true);
  }

  function handleSubmit(rating: 'Good' | 'OK' | 'Poor') {
    // save the rating…
    console.log(`Rating submitted for ${sheetDate}: ${rating}`);
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
                segments={[
                  { value: 50, color: '#9DEABB' },  // "Good"
                  { value: 30, color: '#9DEADD' },  // "OK"
                  { value: 20, color: '#F6B6B6' },  // "Bad"
                ]}
              />
              
              {/* Inner circle */}
              
              
              
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNavigation}>
              <TouchableOpacity style={styles.navButton}>
                <ChevronLeft color="white" size={20} />
              </TouchableOpacity>

              <Text style={styles.monthText}>MAY</Text>

              <TouchableOpacity style={styles.navButton}>
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
              {diaryEntries.map((entry, index) => {
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
              })}
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
  innerCircle: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
