import { useEffect, useRef, useState } from 'react';
import type { SongResponseDto } from '@openlp/shared';

type ActiveSongPayload =
  | {
      servicePlan: { id: string; name: string } | null;
      item:
        | {
            id: string;
            songId: string;
            songTitle: string;
            order: number;
            activeVerseIndex?: number;
          }
        | null;
      song: SongResponseDto | null;
    }
  | null;

interface UseActiveSongWsResult {
  data: ActiveSongPayload;
  isConnected: boolean;
  error: Error | null;
}

/**
 * WebSocket-based hook for listening to active song changes in real time.
 * Used only on /live as a replacement for long polling.
 */
export function useActiveSongWs(): UseActiveSongWsResult {
  const [data, setData] = useState<ActiveSongPayload>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const { location } = window;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseWsUrl = `${protocol}//${location.host}`;
    const wsUrl = `${baseWsUrl}/ws/service-plans`;

    let isUnmounted = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const baseReconnectDelay = 2000;

    const connect = () => {
      if (isUnmounted) return;

      // Clean up any existing connection
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) {
          ws.close();
          return;
        }
        setIsConnected(true);
        setError(null);
        reconnectAttempts = 0; // Reset on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'activeSong') {
            setData(message.payload ?? null);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message', err);
        }
      };

      ws.onerror = (event) => {
        if (isUnmounted) return;
        // Don't set error state for proxy errors (they're handled by reconnect)
        console.debug('WebSocket error (will attempt reconnect):', event);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (isUnmounted) return;

        // Only reconnect if it wasn't a clean close
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.min(reconnectAttempts + 1, 5); // Exponential backoff, max 10s
          reconnectAttempts++;
          reconnectTimeout = setTimeout(() => {
            if (!isUnmounted) {
              connect();
            }
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError(new Error('WebSocket connection failed after multiple attempts'));
        }
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000, 'Component unmounted');
        }
      }
    };
  }, []);

  return { data, isConnected, error };
}


