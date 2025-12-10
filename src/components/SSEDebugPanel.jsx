import React, { useState, useEffect } from 'react';
import { useSSE } from '../hooks/useSSE';
import { ChevronUp, ChevronDown, Wifi, WifiOff, Zap, Brain, Activity } from 'lucide-react';

const SSEDebugPanel = () => {
  const { isConnected, events } = useSSE();
  const [isOpen, setIsOpen] = useState(false);
  const [recentEvents, setRecentEvents] = useState([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setRecentEvents(prev => [...prev, ...events].slice(-20)); // Keep last 20 events
  }, [events]);

  const testCoinToss = () => {
    console.log('🎰 💥 TEST TOSS BUTTON CLICKED!');
    setIsTesting(true);
    
    // Create a mock settlement event to trigger coin toss with proper randomness
    const winningSide = Math.floor(Math.random() * 2); // 0 or 1, properly random
    const mockSettlementEvent = {
      type: 'round_settled',
      roundId: Math.floor(Math.random() * 1000) + 9999, // High number to avoid conflicts
      transactionHash: 'TEST_' + Date.now(),
      pot: 0.01,
      headsTotal: winningSide === 0 ? 0.006 : 0.004,
      tailsTotal: winningSide === 1 ? 0.006 : 0.004, 
      winningSide: winningSide,
      winner: winningSide === 0 ? 'HEADS' : 'TAILS',
      timestamp: new Date().toISOString()
    };
    
    console.log('🎰 ✨ MANUAL COIN TOSS TEST TRIGGERED:', mockSettlementEvent);
    console.log('🎰 📡 Dispatching testCoinToss event...');
    
    // Force show coin toss by dispatching to multiple places
    const event = new CustomEvent('testCoinToss', { 
      detail: mockSettlementEvent 
    });
    window.dispatchEvent(event);
    
    console.log('🎰 📡 Dispatching forceShowCoinToss event...');
    // Also trigger via direct SSE-like event for redundancy
    const sseEvent = new CustomEvent('forceShowCoinToss', { 
      detail: mockSettlementEvent 
    });
    window.dispatchEvent(sseEvent);
    
    // DIRECT BRUTE FORCE: Try to find the BettingArea component and trigger directly
    setTimeout(() => {
      console.log('🎰 🔥 Dispatching DIRECT showCoinToss event...');
      const directEvent = new CustomEvent('directShowCoinToss', { 
        detail: { 
          winningSide: winningSide,
          show: true 
        }
      });
      window.dispatchEvent(directEvent);
    }, 200);
    
    setTimeout(() => {
      setIsTesting(false);
    }, 6000); // Increased timeout to match animation
  };

  const formatEventData = (event) => {
    const { type, timestamp, ...data } = event;
    return {
      type,
      time: new Date(timestamp).toLocaleTimeString(),
      data: JSON.stringify(data, null, 2)
    };
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'round_settled': return 'text-green-400 bg-green-900/20';
      case 'round_status': return 'text-blue-400 bg-blue-900/20';
      case 'users_online': return 'text-purple-400 bg-purple-900/20';
      case 'heartbeat': return 'text-gray-400 bg-gray-900/20';
      case 'connected': return 'text-emerald-400 bg-emerald-900/20';
      default: return 'text-white bg-gray-900/20';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[99998] max-w-md">
      {/* Toggle Button - Agent Brain */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all shadow-lg backdrop-blur-md
          ${isConnected 
            ? 'bg-cyan-900/40 border-cyan-400/60 text-cyan-200 hover:bg-cyan-900/60' 
            : 'bg-red-900/40 border-red-400/60 text-red-200 hover:bg-red-900/60'
          }
        `}
      >
        {isConnected ? <Brain className="w-5 h-5" /> : <Activity className="w-5 h-5 opacity-50" />}
        <span className="text-sm font-semibold">Agent Brain</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="mt-2 bg-black/95 border-2 border-cyan-600 rounded-lg p-4 max-h-[500px] overflow-y-auto shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-700/50">
            <div className="flex items-center gap-2">
              {isConnected ? <Brain className="w-4 h-4 text-cyan-400" /> : <Activity className="w-4 h-4 text-red-400" />}
              <span className="text-sm font-medium text-cyan-200">
                Agent {isConnected ? 'Active' : 'Inactive'}
              </span>
            </div>
            <button
              onClick={testCoinToss}
              disabled={isTesting}
              className="flex items-center gap-1 px-2 py-1 bg-purple-900/40 border border-purple-500/50 
                         text-purple-300 text-xs rounded hover:bg-purple-900/60 transition-all disabled:opacity-50"
              title="Test coin toss animation"
            >
              <Zap className="w-3 h-3" />
              {isTesting ? 'Testing...' : 'Test Toss'}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {recentEvents.length === 0 ? (
              <div className="text-gray-400 text-center py-4">No events yet</div>
            ) : (
              recentEvents.slice(-10).reverse().map((event, idx) => {
                const formatted = formatEventData(event);
                return (
                  <div key={idx} className={`p-2 rounded border-l-2 ${getEventColor(formatted.type)}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{formatted.type}</span>
                      <span className="text-gray-400">{formatted.time}</span>
                    </div>
                    {formatted.type !== 'heartbeat' && (
                      <pre className="text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">
                        {formatted.data}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SSEDebugPanel;