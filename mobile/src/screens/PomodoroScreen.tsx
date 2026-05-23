import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import api from '../services/api';

export default function PomodoroScreen() {
  const { colors, isDark } = useTheme();

  const WORK_TIME = 25 * 60; // 25 minutes
  const BREAK_TIME = 5 * 60; // 5 minutes

  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedSecondsRef = useRef(0);

  const syncPomodoroMinute = async (minutes: number) => {
    try {
      await api.post('/auth/pomodoro', { minutes });
    } catch (e) {
      console.log('Failed to sync pomodoro minutes', e);
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (isWorkMode) {
          elapsedSecondsRef.current += 1;
          if (elapsedSecondsRef.current >= 60) {
            syncPomodoroMinute(1);
            elapsedSecondsRef.current -= 60;
          }
        }

        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsRunning(false);
            
            // Switch mode
            const nextModeIsWork = !isWorkMode;
            setIsWorkMode(nextModeIsWork);
            setTimeLeft(nextModeIsWork ? WORK_TIME : BREAK_TIME);
            
            Alert.alert(
              "Time's Up!",
              nextModeIsWork ? "Time to focus! Back to work." : "Great job! Take a short break."
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isWorkMode]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isWorkMode ? WORK_TIME : BREAK_TIME);
  };

  const switchMode = (work: boolean) => {
    setIsRunning(false);
    setIsWorkMode(work);
    setTimeLeft(work ? WORK_TIME : BREAK_TIME);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const size = 280;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const maxTime = isWorkMode ? WORK_TIME : BREAK_TIME;
  const progress = timeLeft / maxTime;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pomodoro Timer</Text>
      </View>

      <View style={styles.content}>
        {/* Mode Switcher */}
        <View style={[styles.modeContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.modeButton, isWorkMode && { backgroundColor: colors.primary }]}
            onPress={() => switchMode(true)}
          >
            <Text style={[styles.modeText, { color: isWorkMode ? '#fff' : colors.textSecondary }]}>Focus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, !isWorkMode && { backgroundColor: '#10b981' }]}
            onPress={() => switchMode(false)}
          >
            <Text style={[styles.modeText, { color: !isWorkMode ? '#fff' : colors.textSecondary }]}>Break</Text>
          </TouchableOpacity>
        </View>

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Svg width={size} height={size} style={styles.svg}>
            {/* Background Circle */}
            <Circle
              stroke={colors.border}
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            {/* Progress Circle */}
            <Circle
              stroke={isWorkMode ? colors.primary : '#10b981'}
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.timerTextContainer}>
            <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.modeLabel, { color: isWorkMode ? colors.primary : '#10b981' }]}>
              {isWorkMode ? 'Work Session' : 'Short Break'}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card }]} onPress={resetTimer}>
            <Ionicons name="refresh" size={28} color={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.mainButton, 
              { 
                backgroundColor: isWorkMode ? colors.primary : '#10b981',
                shadowColor: isWorkMode ? colors.primary : '#10b981'
              }
            ]} 
            onPress={toggleTimer}
          >
            <Ionicons name={isRunning ? "pause" : "play"} size={36} color="#fff" style={{ marginLeft: isRunning ? 0 : 4 }} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.iconButton, { opacity: 0 }]} disabled={true}>
            <Ionicons name="settings" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modeContainer: {
    flexDirection: 'row',
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    marginBottom: 60,
  },
  modeButton: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  svg: {
    position: 'absolute',
  },
  timerTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
