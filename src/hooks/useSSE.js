import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Singleton SSE connection - shared across all components
let globalEventSource = null;
let globalListeners = new Map();
let connectionCount = 0;

export const useSSE = () => {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    connectionCount++;
    console.log(`🔗 SSE Hook mounted (${connectionCount} components using SSE)`);

    // Create global connection if it doesn't exist
    if (!globalEventSource) {
      console.log('🔗 Creating singleton SSE connection...');
      
      try {
        globalEventSource = new EventSource(`${API_BASE_URL}/api/feed/stream`);
        
        globalEventSource.onopen = () => {
          console.log('🔗 Singleton SSE Connected');
          // Notify all hooks
          globalListeners.forEach(callback => callback({ type: 'connection', connected: true }));
        };

        globalEventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📡 SSE Event:', data);
            
            // Notify all hooks about this event
            globalListeners.forEach(callback => callback({ type: 'message', data }));
          } catch (error) {
            console.error('SSE parsing error:', error);
          }
        };

        globalEventSource.onerror = () => {
          console.error('❌ Singleton SSE Error');
          // Notify all hooks about disconnection
          globalListeners.forEach(callback => callback({ type: 'connection', connected: false }));
          
          // Clean up and reconnect
          globalEventSource.close();
          globalEventSource = null;
          setTimeout(() => {
            if (connectionCount > 0) { // Only reconnect if components still need it
              console.log('🔗 Reconnecting singleton SSE...');
              // This will trigger a new connection on next useSSE call
            }
          }, 3000);
        };
      } catch (error) {
        console.error('SSE connection error:', error);
        globalEventSource = null;
      }
    } else {
      console.log('🔗 Using existing singleton SSE connection');
      setIsConnected(globalEventSource.readyState === EventSource.OPEN);
    }

    // Register this hook's callback
    const hookId = Date.now() + Math.random();
    const handleGlobalEvent = (event) => {
      if (event.type === 'connection') {
        setIsConnected(event.connected);
      } else if (event.type === 'message') {
        setEvents(prev => [...prev.slice(-99), event.data]); // Keep last 100 events
        
        // Notify listeners for this event type
        const listeners = listenersRef.current.get(event.data.type) || [];
        listeners.forEach(callback => callback(event.data));
        
        // Notify global listeners
        const globalListeners = listenersRef.current.get('*') || [];
        globalListeners.forEach(callback => callback(event.data));
      }
    };

    globalListeners.set(hookId, handleGlobalEvent);

    return () => {
      connectionCount--;
      globalListeners.delete(hookId);
      console.log(`🔗 SSE Hook unmounted (${connectionCount} components still using SSE)`);
      
      // Close global connection if no components need it
      if (connectionCount === 0 && globalEventSource) {
        console.log('🔗 Closing singleton SSE connection (no more consumers)');
        globalEventSource.close();
        globalEventSource = null;
      }
    };
  }, []);

  // Add event listener
  const addEventListener = (eventType, callback) => {
    const listeners = listenersRef.current.get(eventType) || [];
    listenersRef.current.set(eventType, [...listeners, callback]);
    
    // Return cleanup function
    return () => {
      const currentListeners = listenersRef.current.get(eventType) || [];
      listenersRef.current.set(
        eventType,
        currentListeners.filter(cb => cb !== callback)
      );
    };
  };

  return {
    isConnected,
    events,
    addEventListener
  };
};