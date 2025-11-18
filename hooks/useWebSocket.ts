import { useEffect, useRef, useState, useCallback } from 'react';

// ✅ FIX: Get WebSocket URL from environment - prioritize WS_URL
const getWSUrl = () => {
  let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  
  // If WS_URL is not set, construct from API_URL
  if (!wsUrl) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://predinex.fly.dev';
    // Convert http/https to ws/wss
    wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  } else {
    // Ensure WS_URL uses correct protocol
    wsUrl = wsUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  }
  
  // Append /ws if not already present
  if (!wsUrl.endsWith('/ws')) {
    wsUrl = `${wsUrl}/ws`;
  }
  
  return wsUrl;
};

const WS_URL = getWSUrl();

interface UseWebSocketOptions {
  channel: string | null;
  onMessage?: (message: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useWebSocket({ channel, onMessage, enabled = true }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);
  const MAX_RECONNECT_ATTEMPTS = 10; // ✅ FIX: Increase max attempts
  const INITIAL_RECONNECT_DELAY = 1000; // ✅ FIX: Start with 1s delay
  const MAX_RECONNECT_DELAY = 30000; // ✅ FIX: Max 30s delay (exponential backoff)

  const connect = useCallback(() => {
    if (!enabled || !channel) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (isConnectingRef.current) return; // ✅ FIX: Prevent multiple simultaneous connections

    try {
      isConnectingRef.current = true;
      
      // ✅ FIX: Use pre-constructed WS_URL (already has /ws appended)
      const wsUrl = WS_URL;
      
      console.log('🔌 Connecting to WebSocket (useWebSocket hook):', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        isConnectingRef.current = false;
        if (isMountedRef.current) {
          setIsConnected(true);
        }
        reconnectAttemptsRef.current = 0;

        // Subscribe to channel immediately after connection
        if (channel) {
          console.log(`📡 Subscribing to channel: ${channel}`);
          try {
            ws.send(JSON.stringify({
              type: 'subscribe',
              channel
            }));
          } catch (error) {
            console.error('❌ Error subscribing to channel:', error);
          }
        } else {
          console.warn('⚠️ No channel provided for WebSocket subscription');
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (_error) => {
        isConnectingRef.current = false;
        // ✅ FIX: Don't log generic error events (they're handled in onclose)
        // Only log if it's a meaningful error
        if (ws.readyState === WebSocket.CLOSED) {
          console.warn('⚠️ WebSocket connection error (connection closed)');
        }
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        const reason = event.reason || 'No reason';
        console.log(`🔌 WebSocket disconnected (code: ${event.code}, reason: ${reason})`);
        
        if (isMountedRef.current) {
          setIsConnected(false);
        }
        wsRef.current = null;

        // ✅ FIX: Don't reconnect on clean close (1000) or going away (1001)
        const shouldReconnect = enabled && 
          event.code !== 1000 && 
          event.code !== 1001 && 
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && 
          isMountedRef.current;

        if (shouldReconnect) {
          reconnectAttemptsRef.current++;
          
          // ✅ FIX: Exponential backoff with jitter
          const baseDelay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
            MAX_RECONNECT_DELAY
          );
          const jitter = Math.random() * 1000; // Add up to 1s jitter
          const delay = baseDelay + jitter;
          
          console.log(`🔄 Reconnecting in ${Math.round(delay)}ms... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && channel && !isConnectingRef.current) {
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error('❌ Max reconnection attempts reached. WebSocket will not reconnect.');
        } else if (event.code === 1000 || event.code === 1001) {
          console.log('✅ WebSocket closed cleanly, not reconnecting');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      isConnectingRef.current = false;
      console.error('❌ Error creating WebSocket connection:', error);
      
      // ✅ FIX: Attempt reconnection on connection error
      if (enabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && isMountedRef.current) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
          MAX_RECONNECT_DELAY
        );
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && channel && !isConnectingRef.current) {
            connect();
          }
        }, delay);
      }
    }
  }, [channel, enabled, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    disconnect,
    reconnect: connect
  };
}

