import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Modal, ActivityIndicator, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface UserProgress {
  xp: number;
  streak_days: number;
  last_login: string | null;
}

interface Unit {
  id: number;
  title: string;
  level: number;
  description: string;
}

const UNITS: Unit[] = [
  { id: 1, title: 'HSK 1: Greetings', level: 1, description: 'Basic greetings and introduction words.' },
  { id: 2, title: 'HSK 1: Numbers', level: 1, description: 'Numbers, counting, and simple quantities.' },
  { id: 3, title: 'HSK 1: Directions', level: 1, description: 'Simple location and direction vocabulary.' },
  { id: 4, title: 'HSK 1: Food', level: 1, description: 'Basic food terms and ordering vocab.' },
  { id: 5, title: 'HSK 1: Time', level: 1, description: 'Telling time, calendar days, and months.' },
  { id: 6, title: 'HSK 1: Family', level: 1, description: 'Immediate family members and pronouns.' },
  { id: 7, title: 'HSK 2: Shopping', level: 2, description: 'Purchases, currency, and asking prices.' },
  { id: 8, title: 'HSK 2: Weather', level: 2, description: 'Seasons, temperatures, and describing climate.' },
  { id: 9, title: 'HSK 2: Hobbies', level: 2, description: 'Sports, leisure activities, and free time.' },
  { id: 10, title: 'HSK 2: Travel', level: 2, description: 'Modes of transport and hotel bookings.' },
  { id: 11, title: 'HSK 2: Health', level: 2, description: 'Describing sickness, body parts, and doctors.' },
  { id: 12, title: 'HSK 2: Work', level: 2, description: 'Jobs, offices, and profession vocabulary.' },
  { id: 13, title: 'HSK 3: Business', level: 3, description: 'Business negotiations, meetings, and trade.' },
  { id: 14, title: 'HSK 3: Feelings', level: 3, description: 'Emotions, moods, and complex expressions.' },
  { id: 15, title: 'HSK 3: Nature', level: 3, description: 'Flora, fauna, landscapes, and environment.' },
  { id: 16, title: 'HSK 3: Tech', level: 3, description: 'Computers, internet, smartphones, and media.' },
  { id: 17, title: 'HSK 3: Society', level: 3, description: 'Communities, laws, politics, and culture.' },
  { id: 18, title: 'HSK 3: Idioms', level: 3, description: 'Common conversational idioms and metaphors.' }
];

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [unitWords, setUnitWords] = useState<Array<{ character: string; pinyin: string; english_definition: string }> | null>(null);
  const [loadingWords, setLoadingWords] = useState(false);

  const fetchProgress = async () => {
    try {
      const data = await api.get<UserProgress>('/progress');
      setProgress(data);
    } catch (err) {
      console.error('Failed to load user progress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleUnitPress = async (unit: Unit, isLocked: boolean) => {
    if (isLocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedUnit(unit);
    setLoadingWords(true);

    try {
      const res = await api.get<{ questions: Array<{ targetWord: any }> }>(`/lessons/${unit.id}`);
      // Deduplicate words from questions list
      const wordsMap = new Map();
      res.questions.forEach((q) => {
        if (q.targetWord) {
          wordsMap.set(q.targetWord.id, q.targetWord);
        }
      });
      setUnitWords(Array.from(wordsMap.values()));
    } catch (err) {
      console.error('Failed to load unit words:', err);
      setUnitWords([]);
    } finally {
      setLoadingWords(false);
    }
  };

  const startLesson = (unitId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedUnit(null);
    setUnitWords(null);
    router.push({ pathname: '/quiz', params: { unitId } });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  // Calculate user current unit level based on XP (each unit requires 20 XP to advance)
  const currentXp = progress?.xp || 0;
  const activeUnitId = Math.min(18, Math.floor(currentXp / 20) + 1);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top dashboard header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{user?.display_name || user?.email.split('@')[0]}</Text>
          <Text style={styles.streakText}>🔥 {progress?.streak_days || 0} Day Streak</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statBadge}>
            <Text style={styles.statText}>⭐ {currentXp} XP</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.pathScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pathTitle}>Learning Journey</Text>
        
        {UNITS.map((unit, index) => {
          const isCompleted = unit.id < activeUnitId;
          const isActive = unit.id === activeUnitId;
          const isLocked = unit.id > activeUnitId;

          // Winding alignment offset: alternate left, center, right
          const alignModes = ['flex-start', 'center', 'flex-end'];
          const alignment = alignModes[index % 3] as 'flex-start' | 'center' | 'flex-end';

          return (
            <View key={unit.id} style={[styles.pathRow, { alignItems: alignment }]}>
              <TouchableOpacity
                style={[
                  styles.node,
                  isCompleted && styles.completedNode,
                  isActive && styles.activeNode,
                  isLocked && styles.lockedNode
                ]}
                onPress={() => handleUnitPress(unit, isLocked)}
              >
                <Text style={[styles.nodeText, isLocked && styles.lockedText]}>
                  {isCompleted ? '✓' : isLocked ? '🔒' : unit.id}
                </Text>
              </TouchableOpacity>
              <Text style={styles.nodeLabel}>{unit.title}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Unit details modal */}
      <Modal visible={!!selectedUnit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedUnit?.title}</Text>
            <Text style={styles.modalDescription}>{selectedUnit?.description}</Text>

            <Text style={styles.vocabHeader}>Unit Vocabulary:</Text>
            {loadingWords ? (
              <ActivityIndicator size="small" color="#fbbf24" style={{ marginVertical: 20 }} />
            ) : unitWords && unitWords.length > 0 ? (
              <ScrollView style={styles.vocabScroll}>
                {unitWords.map((word, idx) => (
                  <View key={idx} style={styles.wordRow}>
                    <Text style={styles.chineseChar}>{word.character}</Text>
                    <View style={styles.wordDetails}>
                      <Text style={styles.pinyinText}>{word.pinyin}</Text>
                      <Text style={styles.definitionText} numberOfLines={1}>
                        {word.english_definition}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyVocab}>No vocabulary words available.</Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedUnit(null);
                  setUnitWords(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => selectedUnit && startLesson(selectedUnit.id)}
              >
                <Text style={styles.startButtonText}>Start Lesson</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#18181b',
    backgroundColor: '#09090b',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f4f4f5',
  },
  streakText: {
    fontSize: 14,
    color: '#fbbf24',
    marginTop: 2,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statBadge: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statText: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#3f3f46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#f4f4f5',
    fontWeight: '600',
    fontSize: 14,
  },
  pathScroll: {
    paddingHorizontal: 30,
    paddingBottom: 100,
    paddingTop: 20,
  },
  pathTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f4f4f5',
    textAlign: 'center',
    marginBottom: 30,
  },
  pathRow: {
    width: '100%',
    marginVertical: 16,
    alignItems: 'center',
  },
  node: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#18181b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  completedNode: {
    backgroundColor: '#10b981',
    borderColor: '#047857',
  },
  activeNode: {
    backgroundColor: '#fbbf24',
    borderColor: '#d97706',
    transform: [{ scale: 1.1 }],
  },
  lockedNode: {
    backgroundColor: '#27272a',
    borderColor: '#18181b',
  },
  nodeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#09090b',
  },
  lockedText: {
    color: '#a1a1aa',
  },
  nodeLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#27272a',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: '#a1a1aa',
    marginBottom: 20,
    lineHeight: 22,
  },
  vocabHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginBottom: 12,
  },
  vocabScroll: {
    maxHeight: 240,
    marginBottom: 24,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#27272a',
  },
  chineseChar: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
    width: 60,
  },
  wordDetails: {
    flex: 1,
  },
  pinyinText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f4f5',
  },
  definitionText: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 2,
  },
  emptyVocab: {
    color: '#71717a',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#27272a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#f4f4f5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButton: {
    flex: 2,
    height: 50,
    backgroundColor: '#fbbf24',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#09090b',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
