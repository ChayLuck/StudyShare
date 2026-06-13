import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Clipboard,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function AiSummaryScreen({ route, navigation }: any) {
  const { note } = route.params;
  const { colors } = useTheme();
  const { isLoggedIn: isLogged } = useAuth();

  // AI Summarization States & Caching
  const [selectedLanguage, setSelectedLanguage] = useState<'tr' | 'en'>('tr');
  const [flashcardLanguage, setFlashcardLanguage] = useState<'tr' | 'en'>('tr');
  const [summaryEn, setSummaryEn] = useState<string | null>(note.aiSummary || null);
  const [summaryTr, setSummaryTr] = useState<string | null>(note.aiSummaryTr || null);
  const [summarizing, setSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const currentSummary = selectedLanguage === 'tr' ? summaryTr : summaryEn;

  const handleSummarize = async () => {
    if (!isLogged) {
      return Alert.alert(
        'Error',
        'You must be logged in to summarize the note.'
      );
    }

    // In-memory frontend cache check
    if (currentSummary) {
      setModalVisible(true);
      return;
    }

    try {
      setSummarizing(true);
      // Increased timeout to 90 seconds (90000ms) to prevent Gemini timeout errors
      const res = await api.post(
        `/notes/${note.id}/summarize`,
        { language: selectedLanguage },
        { timeout: 90000 }
      );
      
      const generatedSummary = res.data.summary;
      if (selectedLanguage === 'tr') {
        setSummaryTr(generatedSummary);
      } else {
        setSummaryEn(generatedSummary);
      }
      
      // Open the modal automatically when generated successfully
      setModalVisible(true);
    } catch (e: any) {
      console.error('[Client] Summarize Error:', e);
      Alert.alert(
        'Failed to Summarize',
        e.response?.data?.error || 'Gemini API is currently unable to summarize the note. Please try again later.'
      );
    } finally {
      setSummarizing(false);
    }
  };

  const handleCopySummary = () => {
    if (!currentSummary) return;
    Clipboard.setString(currentSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFormattedSummary = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      let cleanLine = line.trim();
      const isBullet = (cleanLine.startsWith('-') || cleanLine.startsWith('*')) && !cleanLine.startsWith('**');
      
      if (isBullet) {
        cleanLine = cleanLine.substring(1).trim();
      }

      const parts = cleanLine.split('**');
      const renderedLine = parts.map((part, partIndex) => {
        if (partIndex % 2 !== 0) {
          return (
            <Text key={partIndex} style={{ fontWeight: 'bold' }}>
              {part}
            </Text>
          );
        }
        return part;
      });

      return (
        <View key={lineIndex} style={styles.summaryLineRow}>
          {isBullet ? (
            <Text style={[styles.bulletIndicator, { color: colors.text }]}>• </Text>
          ) : null}
          <Text
            style={[
              styles.aiSummaryText,
              { color: colors.text }
            ]}
          >
            {renderedLine}
          </Text>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Study With AI</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Yapay Zeka Özeti (AI Summary) Section */}
        <View style={[styles.aiSummaryContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiTitleRow}>
              <Ionicons name="sparkles" size={20} style={{ marginRight: 6 }} color="#4F46E5" />
              <Text style={[styles.aiTitle, { color: colors.text }]}>AI Summary</Text>
            </View>
          </View>

          <View style={[styles.aiDivider, { backgroundColor: colors.border }]} />

          {/* Language Selector */}
          <View style={styles.languageSelectorContainer}>
            <Text style={[styles.languageLabel, { color: colors.textSecondary }]}>
              Summary Language:
            </Text>
            <View style={[styles.languagePills, { backgroundColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.languagePill,
                  selectedLanguage === 'tr' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedLanguage('tr')}
              >
                <Text
                  style={[
                    styles.languagePillText,
                    { color: selectedLanguage === 'tr' ? '#ffffff' : colors.text }
                  ]}
                >
                  Turkish
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languagePill,
                  selectedLanguage === 'en' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedLanguage('en')}
              >
                <Text
                  style={[
                    styles.languagePillText,
                    { color: selectedLanguage === 'en' ? '#ffffff' : colors.text }
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {summarizing ? (
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.aiLoadingText, { color: colors.textSecondary }]}>
                Gemini is analyzing the note and generating a study summary for you...
              </Text>
            </View>
          ) : currentSummary ? (
            <View style={styles.aiEmptyContainer}>
              <Text style={[styles.aiEmptyText, { color: colors.textSecondary }]}>
                The AI summary for this note is ready! Tap the button below to view the summary.
              </Text>
              <TouchableOpacity
                style={[styles.aiSummarizeButton, { backgroundColor: colors.primary }]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.9}
              >
                <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.aiSummarizeButtonText}>Summarize with AI</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.aiEmptyContainer}>
              <Text style={[styles.aiEmptyText, { color: colors.textSecondary }]}>
                This note has not been summarized yet. Tap the button below to generate a comprehensive AI summary!
              </Text>
              <TouchableOpacity
                style={[styles.aiSummarizeButton, { backgroundColor: colors.primary }]}
                onPress={handleSummarize}
                activeOpacity={0.9}
              >
                <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.aiSummarizeButtonText}>Summarize with AI</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bilgi Kartları (Flashcards) Section */}
        <View style={[styles.aiSummaryContainer, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 15 }]}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiTitleRow}>
              <Ionicons name="albums" size={20} style={{ marginRight: 6 }} color="#F97316" />
              <Text style={[styles.aiTitle, { color: colors.text }]}>Flashcards</Text>
            </View>
          </View>
          <View style={[styles.aiDivider, { backgroundColor: colors.border }]} />

          {/* Flashcard Language Selector */}
          <View style={styles.languageSelectorContainer}>
            <Text style={[styles.languageLabel, { color: colors.textSecondary }]}>
              Flashcard Language:
            </Text>
            <View style={[styles.languagePills, { backgroundColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.languagePill,
                  flashcardLanguage === 'tr' && { backgroundColor: '#F97316' }
                ]}
                onPress={() => setFlashcardLanguage('tr')}
              >
                <Text
                  style={[
                    styles.languagePillText,
                    { color: flashcardLanguage === 'tr' ? '#ffffff' : colors.text }
                  ]}
                >
                  Turkish
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languagePill,
                  flashcardLanguage === 'en' && { backgroundColor: '#F97316' }
                ]}
                onPress={() => setFlashcardLanguage('en')}
              >
                <Text
                  style={[
                    styles.languagePillText,
                    { color: flashcardLanguage === 'en' ? '#ffffff' : colors.text }
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.aiEmptyContainer}>
            <Text style={[styles.aiEmptyText, { color: colors.textSecondary }]}>
              You can generate and study Q&A flashcards from this note using AI.
            </Text>
            <TouchableOpacity
              style={[styles.aiSummarizeButton, { backgroundColor: '#F97316' }]}
              onPress={() => navigation.navigate('Flashcard', { noteId: note.id, language: flashcardLanguage })}
              activeOpacity={0.9}
            >
              <Ionicons name="albums-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.aiSummarizeButtonText}>Study with Flashcards</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* AI Summary Modal (iç içe ekran tarzı) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.aiTitleRow}>
                <Ionicons name="sparkles" size={20} style={{ marginRight: 6 }} color="#4F46E5" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Note Summary</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
              <View style={styles.aiSummaryTextContainer}>
                {currentSummary ? renderFormattedSummary(currentSummary) : null}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              {currentSummary && (
                <TouchableOpacity
                  style={[styles.modalCopyButton, { backgroundColor: colors.primary }]}
                  onPress={handleCopySummary}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={20}
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.modalCopyButtonText}>
                    {copied ? 'Copied!' : 'Copy Summary'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', flex: 1, marginLeft: 10 },
  scrollContainer: {
    padding: 15,
    paddingBottom: 35,
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
  languageLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  languagePills: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 2,
  },
  languagePill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  languagePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  aiLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  aiLoadingText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  aiSummaryTextContainer: {
    paddingVertical: 4,
  },
  aiSummaryText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    height: '80%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  modalCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modalCopyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletIndicator: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: 'bold',
  },
});
