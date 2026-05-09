import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for polling data at regular intervals.
 * 
 * @param {Function} fetchFn - Async function that fetches data
 * @param {number} interval - Poll interval in milliseconds (from VITE_POLL_INTERVAL_MS env)
 * @param {boolean} enabled - Whether polling is enabled (default: true)
 * @param {Array} deps - Additional dependencies for the effect
 */
export function usePolling(fetchFn, interval = 30000, enabled = true, deps = []) {
  const intervalRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      await fetchFn();
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Poll immediately on mount
    poll();

    // Then set up interval polling
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll, interval, enabled, ...deps]);

  return { poll, isPolling: enabled };
}
