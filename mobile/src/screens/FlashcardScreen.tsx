import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, DeviceEventEmitter, Modal, FlatList, SafeAreaView, LayoutAnimation, Platform, UIManager, ScrollView } from 'react-native';

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
};

type FlashcardRouteProp = RouteProp<
  { Flashcard: { noteId: string } },
  'Flashcard'
>;

const { width, height } = Dimensions.get('window');

const FlashcardItem = ({ card }: { card: Flashcard }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    setShowAnswer(false);
    
    const subscription = DeviceEventEmitter.addListener('FLIP_CARD', (id) => {
      if (id === card.id) {
        LayoutAnimation.configureNext({
          duration: 400,
          create: { type: 'linear', property: 'opacity' },
          update: { type: 'spring', springDamping: 0.8 },
          delete: { type: 'linear', property: 'opacity' },
        });
        setShowAnswer(true);
      }
    });

    return () => subscription.remove();
  }, [card.id]);

  const handleReveal = () => {
    DeviceEventEmitter.emit('FLIP_CARD', card.id);
  };

  return (
    <ScrollView 
      style={{ flexGrow: 0 }} 
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <View style={styles.cardInner}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>QUESTION</Text>
        <Text style={[styles.cardFrontText, { color: colors.text }]}>{card.front}</Text>
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        {!showAnswer ? (
          <TouchableOpacity style={styles.revealButton} onPressIn={handleReveal} activeOpacity={0.8}>
            <Text style={styles.revealButtonText}>Tap to Reveal Answer</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ marginTop: 10, paddingBottom: 20 }}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>ANSWER</Text>
            <Text style={[styles.cardBackText, { color: colors.textSecondary }]}>{card.back}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default function FlashcardScreen() {
  const route = useRoute<FlashcardRouteProp>();
  const navigation = useNavigation();
  const { noteId } = route.params;
  const { colors, isDark } = useTheme();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isUnknownModalVisible, setIsUnknownModalVisible] = useState(false);

  // Keep track of cards marked as unknown in this session to allow retrying
  const [unknownCardsThisSession, setUnknownCardsThisSession] = useState<Flashcard[]>([]);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/flashcards/note/${noteId}`);
      if (res.data.data && res.data.data.length > 0) {
        setCards(res.data.data);
        // Start the deck with cards that are NOT known (or all if we want to review all)
        // Let's start with all cards for a fresh review, but prioritize unknown ones
        setDeck(res.data.data);
      } else {
        setCards([]);
      }
    } catch (error) {
      console.error('Failed to fetch flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCards = async () => {
    try {
      setGenerating(true);
      const res = await api.post(`/flashcards/generate/${noteId}`, {}, { timeout: 45000 });
      if (res.data.data) {
        // Refresh cards
        await fetchCards();
      }
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
      alert('An error occurred while generating cards.');
    } finally {
      setGenerating(false);
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
    // "I don't know"
    const card = deck[index];
    updateProgress(card.id, false);
    setUnknownCardsThisSession(prev => {
      // Avoid duplicates
      if (!prev.find(c => c.id === card.id)) return [...prev, card];
      return prev;
    });
  };

  const onSwipedRight = (index: number) => {
    // "I know"
    const card = deck[index];
    updateProgress(card.id, true);
    // Remove from unknown if it was there
    setUnknownCardsThisSession(prev => prev.filter(c => c.id !== card.id));
  };

  const onSwipedAll = () => {
    setIsFinished(true);
  };

  const onTapCard = (index: number) => {
    const card = deck[index];
    if (card) {
      DeviceEventEmitter.emit('FLIP_CARD', card.id);
    }
  };

  const retryUnknown = () => {
    if (unknownCardsThisSession.length > 0) {
      setDeck(unknownCardsThisSession);
      setUnknownCardsThisSession([]);
      setIsFinished(false);
    }
  };

  const restartAll = () => {
    setDeck(cards);
    setUnknownCardsThisSession([]);
    setIsFinished(false);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading cards...</Text>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="albums-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No flashcards found for this note.</Text>
        <TouchableOpacity style={styles.generateButton} onPress={generateCards} disabled={generating}>
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateButtonText}>Generate Cards with AI</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (isFinished) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="checkmark-circle" size={80} color="#4cd137" />
        <Text style={[styles.finishedTitle, { color: colors.text }]}>Great Job!</Text>
        <Text style={[styles.finishedText, { color: colors.textSecondary }]}>You have completed all cards in this deck.</Text>
        
        {unknownCardsThisSession.length > 0 && (
          <TouchableOpacity style={styles.retryButton} onPress={retryUnknown}>
            <Text style={styles.retryButtonText}>Retry {unknownCardsThisSession.length} Unknown Cards</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.restartButton} onPress={restartAll}>
          <Text style={styles.restartButtonText}>Restart Deck</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Top Header Button for Unknown Cards */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={[styles.topUnknownButton, { backgroundColor: colors.card }]} onPress={() => setIsUnknownModalVisible(true)}>
          <Ionicons name="warning" size={18} color="#e84118" style={{ marginRight: 6 }} />
          <Text style={styles.topUnknownButtonText}>Don't Know ({unknownCardsThisSession.length})</Text>
        </TouchableOpacity>
      </View>

      <Swiper
        cards={deck}
        marginTop={60}
        renderCard={(card: Flashcard | undefined) => {
          if (!card) return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} />;
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FlashcardItem card={card} />
            </View>
          );
        }}
        onTapCard={onTapCard}
        onSwipedLeft={onSwipedLeft}
        onSwipedRight={onSwipedRight}
        onSwipedAll={onSwipedAll}
        cardIndex={0}
        backgroundColor={colors.background}
        stackSize={3}
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
      
      <View style={styles.hintContainer}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>Swipe Left: Don't Know  |  Swipe Right: Know</Text>
      </View>

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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f6fa',
  },
  card: {
    minHeight: height * 0.5,
    maxHeight: height * 0.8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
    marginTop: 20,
  },
  cardInner: {
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#a4b0be',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  cardFrontText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2f3542',
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f2f6',
    marginVertical: 20,
  },
  cardBackText: {
    fontSize: 18,
    color: '#57606f',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  revealButton: {
    backgroundColor: '#F97316',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  revealButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: '#a4b0be',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    color: '#747d8c',
    marginVertical: 20,
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  finishedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2f3542',
    marginTop: 20,
    marginBottom: 10,
  },
  finishedText: {
    fontSize: 16,
    color: '#57606f',
    marginBottom: 40,
  },
  retryButton: {
    backgroundColor: '#F97316',
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
    backgroundColor: '#70a1ff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  topUnknownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  topUnknownButtonText: {
    color: '#e84118',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2f3542',
  },
  modalList: {
    padding: 15,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
});
