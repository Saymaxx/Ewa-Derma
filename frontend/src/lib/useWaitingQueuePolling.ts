'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWaitingQueuePollingOptions {
  fetchFn: () => Promise<any> | void;
  intervalMs?: number; // default 12000 (12 seconds)
  enabled?: boolean;
}

export function useWaitingQueuePolling({
  fetchFn,
  intervalMs = 12000,
  enabled = true,
}: UseWaitingQueuePollingOptions) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(false);

  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const counterTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeFetch = useCallback(async () => {
    try {
      setIsPollingActive(true);
      await fetchRef.current();
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch {
      // Fail silently during background polling
    } finally {
      setIsPollingActive(false);
    }
  }, []);

  // 1. Page Visibility API listener
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsTabVisible(isVisible);
      if (isVisible && enabled) {
        // Tab brought to foreground: immediately catch up and reset timer
        executeFetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, executeFetch]);

  // 2. Polling interval (only when tab is visible and polling enabled)
  useEffect(() => {
    if (!enabled || !isTabVisible) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      executeFetch();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, isTabVisible, intervalMs, executeFetch]);

  // 3. Seconds-ago counter tick
  useEffect(() => {
    counterTimerRef.current = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => {
      if (counterTimerRef.current) clearInterval(counterTimerRef.current);
    };
  }, []);

  // Format time ago string
  const getTimeAgoText = () => {
    if (secondsAgo < 5) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const mins = Math.floor(secondsAgo / 60);
    return `${mins}m ago`;
  };

  return {
    lastUpdated,
    secondsAgo,
    timeAgoText: getTimeAgoText(),
    isTabVisible,
    isPollingActive,
    triggerImmediateRefresh: executeFetch,
  };
}
