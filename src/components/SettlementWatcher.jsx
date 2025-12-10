import React, { useEffect, useState } from 'react';
import { useGame } from '../contexts/GameContext';

const SettlementWatcher = () => {
  const { roundState, closeRound, fetchRoundState, fetchUserBet, globalState } = useGame();
  const [isSettling, setIsSettling] = useState(false);
  const [lastChecked, setLastChecked] = useState(0);

  useEffect(() => {
    const checkSettlement = async () => {
      // Only check every 30 seconds to avoid spam
      const now = Date.now();
      if (now - lastChecked < 30000) return;
      setLastChecked(now);

      if (!roundState || roundState.settled || isSettling) return;

      // Check if round should be settled
      const currentTime = Math.floor(Date.now() / 1000);
      const roundEndTime = roundState.endsAt / 1000; // Convert from milliseconds

      if (currentTime >= roundEndTime + 5) { // Give 5 second buffer
        console.log('🕐 Round needs settlement, waiting for backend cron...');
        
        // DO NOT call backend endpoints - let cron job handle everything
        // Just refresh data to show updated state when backend settles
        try {
          await fetchRoundState(roundState.roundId);
          await fetchUserBet(roundState.roundId);
        } catch (error) {
          console.error('❌ Failed to refresh round state:', error);
        }
      }
    };

    // Check every 30 seconds (reduced from 2s to stop RPC spam)
    const interval = setInterval(checkSettlement, 30000);
    
    return () => clearInterval(interval);
  }, [roundState, closeRound, fetchRoundState, fetchUserBet, isSettling, lastChecked]);

  // Health check indicator
  const [backendHealth, setBackendHealth] = useState('unknown');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        setBackendHealth(response.ok ? 'healthy' : 'error');
      } catch (err) {
        setBackendHealth('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Don't render anything visible - this is just a background service
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-800 text-white px-3 py-1 rounded-lg text-xs flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          backendHealth === 'healthy' ? 'bg-green-400' : 
          backendHealth === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
        }`} />
        <span>
          {backendHealth === 'healthy' ? 'Backend Online' : 
           backendHealth === 'offline' ? 'Backend Offline' : 'Checking...'}
        </span>
        {isSettling && <span className="animate-spin">⚙️</span>}
      </div>
    </div>
  );
};

export default SettlementWatcher;