import { useRef, useCallback } from 'react';

/**
 * Hook to debounce actions and prevent multiple rapid calls
 * @param action - The action function to debounce
 * @param delay - Debounce delay in milliseconds (default: 500ms)
 * @returns Debounced action function and isPending state
 */
export function useDebouncedAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  delay: number = 500
): [T, boolean] {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPendingRef = useRef(false);

  const debouncedAction = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      // If already pending, ignore the call
      if (isPendingRef.current) {
        return Promise.reject(new Error('Action already in progress'));
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      return new Promise<ReturnType<T>>((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            isPendingRef.current = true;
            const result = await action(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            isPendingRef.current = false;
          }
        }, delay);
      });
    },
    [action, delay]
  ) as T;

  return [debouncedAction, isPendingRef.current];
}

/**
 * Simpler hook that just prevents multiple calls while action is pending
 * Better for React Query mutations
 */
export function usePreventDoubleClick<T extends (...args: any[]) => Promise<any>>(
  action: T
): [T, boolean] {
  const isPendingRef = useRef(false);

  const protectedAction = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      if (isPendingRef.current) {
        return Promise.reject(new Error('Action already in progress'));
      }

      try {
        isPendingRef.current = true;
        const result = await action(...args);
        return result;
      } finally {
        isPendingRef.current = false;
      }
    },
    [action]
  ) as T;

  return [protectedAction, isPendingRef.current];
}
