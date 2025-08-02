import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const classOptions = [
  { id: 'all', name: 'All tasks', isSelected: true },
  { id: 'maths', name: 'Maths', isSelected: false },
  { id: 'memory', name: 'Memory', isSelected: false },
  { id: 'word', name: 'Word', isSelected: false },
  { id: 'facts', name: 'Facts', isSelected: false },
];

export default function ChooseClassScreen() {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState('all');

  const handleBackPress = () => {
    router.back();
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar
        style="light"
        backgroundColor="transparent"
        translucent={true}
      />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Class</Text>
          <View style={styles.spacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* All Tasks Section */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={[
                styles.allTasksCard,
                selectedClass === 'all' && styles.selectedCard
              ]}
              onPress={() => handleClassSelect('all')}
              activeOpacity={0.8}
            >
              <View style={styles.allTasksContent}>
                <Text style={styles.allTasksText}>All tasks</Text>
                <View style={styles.subButtonsGrid}>
                  <View style={[
                    styles.subButton,
                    selectedClass === 'all' && { backgroundColor: 'rgba(255, 255, 255, 0.8)' }
                  ]}>
                    <Text style={[styles.subButtonText, selectedClass === 'all' && { color: '#15131A' }]}>Maths</Text>
                  </View>
                  <View style={[
                    styles.subButton,
                    selectedClass === 'all' && { backgroundColor: 'rgba(255, 255, 255, 0.8)' }
                  ]}>
                    <Text style={[styles.subButtonText, selectedClass === 'all' && { color: '#15131A' }]}>Memory</Text>
                  </View>
                  <View style={[
                    styles.subButton,
                    selectedClass === 'all' && { backgroundColor: 'rgba(255, 255, 255, 0.8)' }
                  ]}>
                    <Text style={[styles.subButtonText, selectedClass === 'all' && { color: '#15131A' }]}>Word</Text>
                  </View>
                  <View style={[
                    styles.subButton,
                    selectedClass === 'all' && { backgroundColor: 'rgba(255, 255, 255, 0.8)' }
                  ]}>
                    <Text style={[styles.subButtonText, selectedClass === 'all' && { color: '#15131A' }]}>Facts</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Instructional Text */}
          <Text style={styles.instructionText}>You can choose individual classes</Text>

          {/* Individual Classes Grid */}
          <View style={styles.individualClassesGrid}>
            {classOptions.slice(1).map((classOption) => (
              <TouchableOpacity
                key={classOption.id}
                style={[
                  styles.individualClassCard,
                  selectedClass === classOption.id && styles.selectedCard
                ]}
                onPress={() => handleClassSelect(classOption.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.className}>{classOption.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300',
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 32,
  },
  allTasksCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCard: {
    backgroundColor: 'rgba(118, 77, 213, 1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  allTasksContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  allTasksText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '300',
  },
  subButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: 160,
  },
  subButton: {
    backgroundColor: 'rgba(121, 75, 214, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '45%',
    alignItems: 'center',
  },
  subButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '300',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 24,
  },
  individualClassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  individualClassCard: {
    backgroundColor: 'rgba(121, 75, 214, 0.1)',
    borderRadius: 24,
    padding: 20,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  className: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
  },
}); 