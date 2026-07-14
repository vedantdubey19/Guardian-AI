import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

class MockWebSocket {
  url: string;
  readyState: number = 0; // CONNECTING
  send = jest.fn();
  close = jest.fn();
  onopen: (() => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;

  static instances: MockWebSocket[] = [];

  constructor(url: string) {
    this.url = url;
    this.readyState = 0;
    MockWebSocket.instances.push(this);
  }
}

global.WebSocket = MockWebSocket as any;

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('should establish a WebSocket connection on mount', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000/api/ws'));
    
    // Advance timers by 0ms so the initial useEffect setTimeout fires
    act(() => {
      jest.advanceTimersByTime(0);
    });
    
    // Check if WebSocket was constructed
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:8000/api/ws');
    expect(result.current.isConnected).toBe(false);

    // Simulate open event
    act(() => {
      if (MockWebSocket.instances[0].onopen) {
        MockWebSocket.instances[0].onopen();
      }
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('should schedule reconnect with exponential backoff on unclean close', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000/api/ws'));
    
    // Advance timers by 0ms so the initial useEffect setTimeout fires
    act(() => {
      jest.advanceTimersByTime(0);
    });
    
    // Simulate first connection successful
    const ws1 = MockWebSocket.instances[0];
    act(() => {
      if (ws1.onopen) ws1.onopen();
    });
    expect(result.current.isConnected).toBe(true);

    // Simulate unclean close
    act(() => {
      if (ws1.onclose) {
        ws1.onclose({ code: 1006, reason: 'Abnormal Closure' });
      }
    });
    expect(result.current.isConnected).toBe(false);

    // Reconnection is scheduled in 1000ms
    expect(MockWebSocket.instances.length).toBe(1); // No new instance yet

    // Fast-forward 1000ms
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Check that reconnect initiated (second WebSocket instance created)
    expect(MockWebSocket.instances.length).toBe(2);
    const ws2 = MockWebSocket.instances[1];

    // Simulate ws2 also fails to connect (immediate close)
    act(() => {
      if (ws2.onclose) {
        ws2.onclose({ code: 1006, reason: 'Connection failed' });
      }
    });

    // Reconnection scheduled with exponential backoff: delay is now 2000ms
    expect(MockWebSocket.instances.length).toBe(2);

    // Advance 1000ms - should NOT trigger reconnect yet
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(MockWebSocket.instances.length).toBe(2);

    // Advance another 1000ms (total 2000ms) - should trigger reconnect
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(MockWebSocket.instances.length).toBe(3);
    const ws3 = MockWebSocket.instances[2];

    // Simulate ws3 successfully connects
    act(() => {
      if (ws3.onopen) ws3.onopen();
    });
    expect(result.current.isConnected).toBe(true);
  });

  test('should not reconnect if connection closed cleanly (code 1000)', () => {
    renderHook(() => useWebSocket('ws://localhost:8000/api/ws'));
    
    // Advance timers by 0ms so the initial useEffect setTimeout fires
    act(() => {
      jest.advanceTimersByTime(0);
    });
    
    const ws1 = MockWebSocket.instances[0];
    
    act(() => {
      if (ws1.onopen) ws1.onopen();
    });

    // Simulate clean close
    act(() => {
      if (ws1.onclose) {
        ws1.onclose({ code: 1000, reason: 'Clean close' });
      }
    });

    // Fast-forward a long time (e.g. 10 seconds)
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // No reconnect should have been scheduled
    expect(MockWebSocket.instances.length).toBe(1);
  });
});
