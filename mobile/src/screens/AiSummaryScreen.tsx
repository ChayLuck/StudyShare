import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Clipboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function AiSummaryScreen({ route, navigation }: any) {
  const { note } = route.params;
  const { colors } = useTheme();
  const { isLoggedIn: isLogged } = useAuth();

  // AI Summarization States
  const [summary, setSummary] = useState<string | null>(note.aiSummary || null);
  const [summarizing, setSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSummarize = async () => {
    if (!isLogged) {
      return Alert.alert('Error', 'You must be logged in to summarize the note.');
    }
    try {
      setSummarizing(true);
      const res = await api.post(`/notes/${note.id}/summarize`, {}, { timeout: 30000 });
      setSummary(res.data.summary);
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
    if (!summary) return;
    Clipboard.setString(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFormattedSummary = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
      const parts = line.split('**');
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
        <Text 
          key={lineIndex} 
          style={[
            styles.aiSummaryText, 
            { color: colors.text },
            isBullet && { paddingLeft: 10 }
          ]}
        >
          {renderedLine}
        </Text>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Navigation */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Note Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Yapay Zeka Özeti (AI Summary) Section */}
        <View style={[styles.aiSummaryContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiTitleRow}>
              <Ionicons name="sparkles" size={20} style={{ marginRight: 6 }} color="#EAB308" />
              <Text style={[styles.aiTitle, { color: colors.text }]}>AI Summary</Text>
            </View>
            {summary && (
              <TouchableOpacity 
                style={[styles.copyButton, { backgroundColor: colors.chip }]} 
                onPress={handleCopySummary}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={copied ? "checkmark" : "copy-outline"} 
                  size={16} 
                  color={copied ? "#10B981" : colors.primary} 
                  style={{ marginRight: 4 }} 
                />
                <Text style={[styles.copyButtonText, { color: copied ? "#10B981" : colors.primary }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.aiDivider, { backgroundColor: colors.border }]} />

          {summarizing ? (
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.aiLoadingText, { color: colors.textSecondary }]}>
                Gemini is analyzing the note and generating a study summary for you...
              </Text>
            </View>
          ) : summary ? (
            <View style={styles.aiSummaryTextContainer}>
              {renderFormattedSummary(summary)}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
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
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiDivider: {
    height: 1,
    marginVertical: 12,
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
  }
});
