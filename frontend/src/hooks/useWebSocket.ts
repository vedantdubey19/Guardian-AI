import { useEffect, useState, useRef, useCallback } from 'react';
import { LiveTelemetry } from '../types';

export const useWebSocket = (url?: string) => {
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(1000);

  const getWsUrl = useCallback(() => {
    if (url) return url;
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl) return envUrl;
    
    // Automatic resolution fallback
    if (typeof window !== 'undefined') {
      const loc = window.location;
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${loc.hostname}:8000/api/ws`;
    }
    return 'ws://localhost:8000/api/ws';
  }, [url]);

  const connect = useCallback(() => {
    const wsUrl = getWsUrl();
    console.log(`Attempting WebSocket connection to: ${wsUrl}`);
    
    try {
      if (socketRef.current) {
        socketRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established.');
        setIsConnected(true);
        setError(null);
        reconnectDelayRef.current = 1000; // Reset delay
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Ignore event updates that aren't telemetry broadcasts
          if (data.event && data.event !== 'telemetry_update') {
            return;
          }
          
          setTelemetry(data as LiveTelemetry);
        } catch (err) {
          console.warn('Error parsing WebSocket message content:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        setError('Connection error occurred.');
      };

      ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}. Reason: ${event.reason}`);
        setIsConnected(false);
        socketRef.current = null;
        
        // Reconnect loop if not explicitly clean close
        if (event.code !== 1000) {
          scheduleReconnect();
        }
      };
    } catch (err) {
      console.warn('Failed to initialize WebSocket instance:', err);
      setError('Failed to initialize connection.');
      scheduleReconnect();
    }
  }, [getWsUrl]);

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;
    
    const delay = reconnectDelayRef.current;
    console.log(`Scheduling reconnection in ${delay}ms...`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      reconnectDelayRef.current = Math.min(delay * 2, 30000); // Exponential backoff max 30s
      connect();
    }, delay);
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  const send = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  return { telemetry, isConnected, error, send };
};
