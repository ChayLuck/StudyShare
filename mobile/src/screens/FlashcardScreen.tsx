import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, DeviceEventEmitter, Modal, FlatList, LayoutAnimation, Platform, UIManager, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import Swiper from 'react-native-deck-swiper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type Flashcard = {
  id: string;
  front: string;
  back: string;
  isKnown: boolean;
  hasProgress?: boolean;
};

type FlashcardRouteProp = RouteProp<
  { Flashcard: { noteId: string, language?: 'tr' | 'en' } },
  'Flashcard'
>;

const { width, height } = Dimensions.get('window');

const FlashcardItem = ({ card }: { card: Flashcard }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    setShowAnswer(false);
  }, [card.id]);

  const toggleReveal = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: 'linear', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.8 },
      delete: { type: 'linear', property: 'opacity' },
    });
    setShowAnswer(!showAnswer);
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={toggleReveal}
      style={{ flex: 1, width: '100%', height: '100%' }}
    >
      <View style={styles.cardInner}>
        {!showAnswer ? (
          <View style={styles.cardContentContainer}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>QUESTION</Text>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              <Text style={[styles.cardFrontText, { color: colors.text }]} numberOfLines={6} adjustsFontSizeToFit>
                {card.front}
              </Text>
            </View>
            <Text style={[styles.tapHintText, { color: colors.textSecondary }]}>
              Tap Card to Reveal Answer
            </Text>
          </View>
        ) : (
          <View style={styles.cardContentContainer}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>ANSWER</Text>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              <Text style={[styles.cardBackText, { color: colors.textSecondary }]} numberOfLines={8} adjustsFontSizeToFit>
                {card.back}
              </Text>
            </View>
            <Text style={[styles.tapHintText, { color: colors.textSecondary }]}>
              Tap Card to See Question
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function FlashcardScreen() {
  const route = useRoute<FlashcardRouteProp>();
  const navigation = useNavigation();
  const { noteId } = route.params;
  const { colors } = useTheme();

  const swiperRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isUnknownModalVisible, setIsUnknownModalVisible] = useState(false);
  
  // Flashcard Language (Read-only, passed from params)
  const selectedLanguage = route.params.language || 'tr';

  // Keep track of cards marked as unknown in this session to allow retrying
  const [unknownCardsThisSession, setUnknownCardsThisSession] = useState<Flashcard[]>([]);

  useEffect(() => {
    fetchCards(selectedLanguage);
  }, [selectedLanguage]);

  const fetchCards = async (lang: 'tr' | 'en') => {
    try {
      setLoading(true);
      const res = await api.get(`/flashcards/note/${noteId}?language=${lang}`);
      if (res.data.data && res.data.data.length > 0) {
        setCards(res.data.data);
        setDeck(res.data.data);
        const dbUnknowns = res.data.data.filter((c: any) => c.hasProgress && !c.isKnown);
        setUnknownCardsThisSession(dbUnknowns);
      } else {
        // Automatically trigger generate if cards don't exist yet
        console.log('[FlashcardScreen] No cards found, auto-generating...');
        setGenerating(true);
        const genRes = await api.post(
          `/flashcards/generate/${noteId}`, 
          { language: lang }, 
          { timeout: 90000 }
        );
        if (genRes.data.data && genRes.data.data.length > 0) {
          setCards(genRes.data.data);
          setDeck(genRes.data.data);
          const dbUnknowns = genRes.data.data.filter((c: any) => c.hasProgress && !c.isKnown);
          setUnknownCardsThisSession(dbUnknowns);
        } else {
          setCards([]);
          setDeck([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch/generate flashcards:', error);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const updateProgress = async (cardId: string, isKnown: boolean) => {
    try {
      await api.post(`/flashcards/${cardId}/progress`, { isKnown });
    } catch (error) {
      console.error('Failed to update progress', error);
    }
  };

  const onSwipedLeft = (index: number) => {
    const card = deck[index];
    if (!card) return;
    updateProgress(card.id, false);

    const updatedCard = { ...card, isKnown: false, hasProgress: true };
    setDeck(prev => {
      const copy = [...prev];
      copy[index] = updatedCard;
      return copy;
    });
    setCards(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(c => c.id === card.id);
      if (idx !== -1) copy[idx] = updatedCard;
      return copy;
    });

    setUnknownCardsThisSession(prev => {
      if (!prev.find(c => c.id === card.id)) return [...prev, card];
      return prev;
    });
  };

  const onSwipedRight = (index: number) => {
    const card = deck[index];
    if (!card) return;
    updateProgress(card.id, true);

    const updatedCard = { ...card, isKnown: true, hasProgress: true };
    setDeck(prev => {
      const copy = [...prev];
      copy[index] = updatedCard;
      return copy;
    });
    setCards(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(c => c.id === card.id);
      if (idx !== -1) copy[idx] = updatedCard;
      return copy;
    });

    setUnknownCardsThisSession(prev => prev.filter(c => c.id !== card.id));
  };

  const onSwipedTop = (index: number) => {
    console.log(`Skipped card at index ${index}`);
  };

  const onSwipedAll = () => {
    setIsFinished(true);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const retryUnknown = () => {
    if (unknownCardsThisSession.length > 0) {
      setDeck(unknownCardsThisSession);
      setUnknownCardsThisSession([]);
      setIsFinished(false);
      setCurrentIndex(0);
    }
  };

  const restartAll = () => {
    setDeck(cards);
    setUnknownCardsThisSession([]);
    setIsFinished(false);
    setCurrentIndex(0);
  };

  if (loading || generating) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Flashcards</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 }}>
            {generating 
              ? "Gemini is analyzing the note and generating study flashcards for you..." 
              : "Loading cards..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Flashcards</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Ionicons name="albums-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No flashcards could be generated from this note.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Flashcards</Text>
        <TouchableOpacity style={[styles.topUnknownButton, { backgroundColor: colors.chip }]} onPress={() => setIsUnknownModalVisible(true)}>
          <Ionicons name="warning" size={18} color="#e84118" style={{ marginRight: 6 }} />
          <Text style={styles.topUnknownButtonText}>Don't Know ({unknownCardsThisSession.length})</Text>
        </TouchableOpacity>
      </View>

      {isFinished ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Ionicons name="checkmark-circle" size={80} color="#4cd137" />
          <Text style={[styles.finishedTitle, { color: colors.text }]}>Great Job!</Text>
          <Text style={[styles.finishedText, { color: colors.textSecondary }]}>You have completed all cards in this deck.</Text>
          
          {unknownCardsThisSession.length > 0 && (
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={retryUnknown}>
              <Text style={styles.retryButtonText}>Retry {unknownCardsThisSession.length} Unknown Cards</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.restartButton, { backgroundColor: colors.border }]} onPress={restartAll}>
            <Text style={[styles.restartButtonText, { color: colors.text }]}>Restart Deck</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.swiperWrapper}>
            <Swiper
              key={currentIndex}
              ref={swiperRef}
              cards={deck}
              containerStyle={styles.swiperContainerStyle}
              cardStyle={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  position: 'absolute',
                  top: (height * 0.54 - height * 0.46) / 2,
                  left: width * 0.05,
                }
              ]}
              renderCard={(card: Flashcard | undefined, index: number) => {
                if (!card) return <View style={{ flex: 1 }} />;
                return (
                  <View style={{ flex: 1, position: 'relative' }}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.indexBadge, { backgroundColor: colors.chip }]}>
                        <Text style={[styles.indexBadgeText, { color: colors.textSecondary }]}>
                          {index + 1}/{deck.length}
                        </Text>
                      </View>
                    </View>
                    <FlashcardItem card={card} />
                  </View>
                );
              }}
              onSwipedLeft={onSwipedLeft}
              onSwipedRight={onSwipedRight}
              onSwipedTop={onSwipedTop}
              onSwipedAll={onSwipedAll}
              onSwiped={(index: number) => {
                setCurrentIndex(index + 1);
              }}
              cardIndex={currentIndex}
              backgroundColor={colors.background}
              stackSize={3}
              disableTopSwipe={true}
              disableBottomSwipe={true}
              overlayLabels={{
                left: {
                  title: "DON'T KNOW",
                  style: {
                    label: {
                      backgroundColor: '#e84118',
                      borderColor: '#e84118',
                      color: 'white',
                      borderWidth: 1
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-start',
                      marginTop: 30,
                      marginLeft: -30
                    }
                  }
                },
                right: {
                  title: 'KNOW',
                  style: {
                    label: {
                      backgroundColor: '#4cd137',
                      borderColor: '#4cd137',
                      color: 'white',
                      borderWidth: 1
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      marginTop: 30,
                      marginLeft: 30
                    }
                  }
                }
              }}
              animateOverlayLabelsOpacity
              animateCardOpacity
              swipeBackCard
            />
          </View>
          
          {/* Bottom Controls Container */}
          <View style={styles.bottomControlsContainer}>
            {/* Status Badge Row with Counts */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#e8411815', borderColor: '#e8411830', marginRight: 10 }]}>
                <Ionicons name="close-circle" size={14} color="#e84118" style={{ marginRight: 4 }} />
                <Text style={[styles.statusText, { color: '#e84118' }]}>
                  DON'T KNOW ({deck.filter(c => c.hasProgress && !c.isKnown).length})
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: '#4cd13715', borderColor: '#4cd13730' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#4cd137" style={{ marginRight: 4 }} />
                <Text style={[styles.statusText, { color: '#4cd137' }]}>
                  KNOW ({deck.filter(c => c.hasProgress && c.isKnown).length})
                </Text>
              </View>
            </View>

            {/* Hint text */}
            <Text style={[styles.hintText, { color: colors.textSecondary, marginBottom: 10, marginTop: 4 }]}>
              Swipe Left: Don't Know | Swipe Right: Know
            </Text>

            {/* Navigation Controls: Prev / Next Buttons */}
            <View style={styles.navigationRow}>
              <TouchableOpacity 
                style={[styles.navButton, currentIndex === 0 && styles.disabledNavButton]} 
                onPress={handlePrev}
                disabled={currentIndex === 0}
              >
                <Ionicons name="chevron-back" size={24} color={currentIndex === 0 ? colors.textSecondary + '40' : colors.primary || '#FF6B6B'} />
                <Text style={[styles.navButtonText, { color: currentIndex === 0 ? colors.textSecondary + '40' : colors.text }]}>Prev</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.navButton, currentIndex === deck.length - 1 && styles.disabledNavButton]} 
                onPress={handleNext}
                disabled={currentIndex === deck.length - 1}
              >
                <Text style={[styles.navButtonText, { color: currentIndex === deck.length - 1 ? colors.textSecondary + '40' : colors.text }]}>Next</Text>
                <Ionicons name="chevron-forward" size={24} color={currentIndex === deck.length - 1 ? colors.textSecondary + '40' : colors.primary || '#FF6B6B'} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      <Modal visible={isUnknownModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsUnknownModalVisible(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Unknown Cards ({unknownCardsThisSession.length})</Text>
            <TouchableOpacity onPress={() => setIsUnknownModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={unknownCardsThisSession}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>QUESTION</Text>
                <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.text}}>{item.front}</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>ANSWER</Text>
                <Text style={{fontSize: 16, color: colors.textSecondary, fontStyle: 'italic'}}>{item.back}</Text>
              </View>
            )}
            contentContainerStyle={styles.modalList}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't marked any cards as "Don't Know" yet.</Text>
            }
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', flex: 1, marginLeft: 10 },
  card: {
    width: width * 0.9,
    height: height * 0.46,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
    alignSelf: 'center',
    position: 'relative',
  },
  cardInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  cardFrontText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  cardBackText: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tapHintText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 10,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    marginVertical: 20,
    textAlign: 'center',
  },
  finishedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  finishedText: {
    fontSize: 16,
    marginBottom: 40,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restartButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  restartButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  topUnknownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topUnknownButtonText: {
    color: '#e84118',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalList: {
    padding: 15,
  },
  modalCard: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  swiperWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperContainerStyle: {
    position: 'relative',
    height: height * 0.54,
    width: '100%',
    backgroundColor: 'transparent',
  },
  bottomControlsContainer: {
    height: 150,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  cardTopRow: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 10,
  },
  indexBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indexBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    height: 32,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '60%',
    marginBottom: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disabledNavButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  aiSummaryContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  aiDivider: {
    height: 1,
    marginVertical: 12,
  },
  languageSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  aiEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  aiSummarizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  aiSummarizeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
