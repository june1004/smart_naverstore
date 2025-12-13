import { useCallback } from "react";

export function useSearchHistory(key: string, max: number = 3) {
  // key: 검색 종류별로 분리 (예: 'category-large', 'ai-analysis', ...)
  const storageKey = `search-history-${key}`;

  const getHistory = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }, [storageKey]);

  const addHistory = useCallback((value: string) => {
    if (typeof window === 'undefined') return;
    let history = getHistory();
    history = history.filter((v) => v !== value); // 중복 제거
    history.unshift(value);
    if (history.length > max) history = history.slice(0, max);
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [getHistory, storageKey, max]);

  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { getHistory, addHistory, clearHistory };
} 