import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../contexts/AppContext';

export default function ChooseClassScreen() {
  const router = useRouter();
  const { classes, selectedClassId, setClass } = useApp();
  const [tempSelectedClass, setTempSelectedClass] = useState('');

  // Find the mixed level class (the one with multiple tags)
  const mixedLevelClass = classes.find(cls => 
    cls.tags && cls.tags.length > 1
  );

  // Get individual classes (those with single tags)
  const individualClasses = classes.filter(cls => 
    cls.tags && cls.tags.length === 1
  );

  // Map the current selected class ID to display name
  const getCurrentDisplayClass = () => {
    if (selectedClassId === mixedLevelClass?.id) return mixedLevelClass?.id;
    return selectedClassId || mixedLevelClass?.id || '';
  };

  const handleBackPress = async () => {
    await setClass(tempSelectedClass);
    router.back();
  };

  const handleClassSelect = (classId: string) => {
    setTempSelectedClass(classId);
  };

  // Initialize temp selection based on current selection
  React.useEffect(() => {
    setTempSelectedClass(getCurrentDisplayClass());
  }, []);

  return (
    <View style={styles.screenContainer}>
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
          {mixedLevelClass && (
            <View style={styles.section}>
              <TouchableOpacity 
                style={[
                  styles.allTasksCard,
                  tempSelectedClass === mixedLevelClass.id && styles.selectedCard
                ]}
                onPress={() => handleClassSelect(mixedLevelClass.id)}
                activeOpacity={0.8}
              >
                <View style={styles.allTasksContent}>
                  <Text style={styles.allTasksText}>All tasks</Text>
                  <View style={styles.subButtonsGrid}>
                    {mixedLevelClass.tags?.map((tag, index) => (
                      <View key={index} style={[
                        styles.subButton,
                        tempSelectedClass === mixedLevelClass.id && { backgroundColor: 'rgba(255, 255, 255, 0.8)' }
                      ]}>
                        <Text style={[styles.subButtonText, tempSelectedClass === mixedLevelClass.id && { color: '#15131A' }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Instructional Text */}
          <Text style={styles.instructionText}>You can choose individual classes</Text>

          {/* Individual Classes Grid */}
          <View style={styles.individualClassesGrid}>
            {individualClasses.map((classOption) => (
              <TouchableOpacity
                key={classOption.id}
                style={[
                  styles.individualClassCard,
                  tempSelectedClass === classOption.id && styles.selectedCard
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
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'DMSans',
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
    padding: 16,
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
    fontFamily: 'DMSans',
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
    fontFamily: 'DMSans',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'DMSans',
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
    fontFamily: 'DMSans',
  },
}); 