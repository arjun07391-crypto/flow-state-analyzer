import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'app-session-times';

interface SessionData {
  [date: string]: number; // total seconds per day
}

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function loadData(): SessionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveData(data: SessionData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useAppSessionTime() {
  const [todaySeconds, setTodaySeconds] = useState<number>(() => {
    const data = loadData();
    return data[getTodayKey()] || 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setTodaySeconds(prev => {
          const next = prev + 1;
          const data = loadData();
          data[getTodayKey()] = next;
          saveData(data);
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for visibility changes to pause/resume
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        // Reload in case date changed while hidden
        const data = loadData();
        setTodaySeconds(data[getTodayKey()] || 0);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const getTimeForDate = useCallback((date: string): number => {
    const data = loadData();
    return data[date] || 0;
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }, []);

  return { todaySeconds, getTimeForDate, formatDuration };
}
