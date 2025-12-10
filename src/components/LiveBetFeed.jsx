import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSSE } from '../hooks/useSSE';

const LiveBetFeed = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newBetNotification, setNewBetNotification] = useState(null);

  // Get recent bets directly from Convex
  const recentBetsData = useQuery(api.gameData.getRecentBets, { limit: 20 });
  
  // Listen for real-time bet events via SSE
  const { addEventListener: addSSEListener } = useSSE();

  // Check if mobile and auto-show on desktop
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-expand on desktop, collapse on mobile
      if (!mobile) {
        setIsExpanded(true);
        setIsVisible(true); // Always visible on desktop when inline
      } else {
        setIsExpanded(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for real-time bet placement events
  useEffect(() => {
    if (!addSSEListener) return;

    const unsubscribe = addSSEListener('bet_placed', (event) => {
      console.log('💰 LiveBetFeed: New bet placed!', event);
      // Show notification briefly
      setNewBetNotification({
        userWallet: event.userWallet,
        side: event.sideName,
        amount: event.amount
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNewBetNotification(null);
      }, 3000);
    });

    return () => {
      unsubscribe();
    };
  }, [addSSEListener]);

  // Format bets data
  const recentBets = React.useMemo(() => {
    if (!recentBetsData) return [];

    return recentBetsData.map(bet => ({
      id: bet._id,
      userAddress: bet.userWallet,
      amount: bet.amount,
      side: bet.side,
      timestamp: bet.createdAt,
      roundId: bet.roundId,
    }));
  }, [recentBetsData]);

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Get first bet for mobile preview
  const firstBet = recentBets[0];
  const betCount = recentBets.length;

  return (
    <div className="live-bet-feed-container">
      {/* Sidebar toggle (desktop only - hidden when inline) */}
      {!isMobile && (
        <button
          className="feed-toggle sidebar-toggle"
          onClick={() => setIsVisible(!isVisible)}
          style={{ display: 'none' }} // Hide toggle when inline
        >
          <span className="feed-icon">📊</span>
          <span className="feed-text">Live Bets</span>
          <div className="bet-count">{betCount}</div>
        </button>
      )}

      {/* Mobile collapsed view - single line */}
      {isMobile && !isExpanded && (
        <button
          className="feed-mobile-preview"
          onClick={() => setIsExpanded(true)}
        >
          <div className="feed-preview-content">
            <span className="feed-icon">🔴</span>
            <span className="feed-title-mobile">Live Bets</span>
            {firstBet && (
              <div className="feed-preview-bet">
                <span className="bet-address-preview">{formatAddress(firstBet.userAddress)}</span>
                <span className={`bet-side-preview ${firstBet.side === 0 ? 'heads' : 'tails'}`}>
                  {firstBet.side === 0 ? '↑' : '↓'}
                </span>
                <span className="bet-amount-preview">{firstBet.amount} SOL</span>
              </div>
            )}
            <span className="bet-count-mobile">{betCount}</span>
            <ChevronDown className="expand-icon" size={16} />
          </div>
        </button>
      )}

      {/* Full feed panel */}
      <div className={`bet-feed-panel inline-panel ${isVisible || !isMobile ? 'visible' : ''} ${isMobile && !isExpanded ? 'mobile-collapsed' : ''}`}>
        {isMobile && isExpanded && (
          <div className="feed-header-mobile">
            <span className="feed-title">🔴 Live Bet Feed</span>
            <button
              className="feed-close-mobile"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp size={20} />
            </button>
          </div>
        )}
        
        {!isMobile && (
          <div className="feed-header">
            <span className="feed-title">🔴 Live Bet Feed</span>
            <div className="live-indicator"></div>
          </div>
        )}
        
        <div className="bet-list">
          {recentBets.length > 0 ? (
            recentBets.map((bet, index) => (
              <div key={bet.id} className={`bet-item ${index < 3 ? 'recent' : ''}`}>
                <div className="bet-user">{formatAddress(bet.userAddress)}</div>
                <div className="bet-details">
                  <div className={`bet-side ${bet.side === 0 ? 'heads' : 'tails'}`}>
                    {bet.side === 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {bet.side === 0 ? 'H' : 'T'}
                  </div>
                  <div className="bet-amount">{bet.amount.toFixed(2)} SOL</div>
                  <div className="bet-time">{formatTimeAgo(bet.timestamp)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="bet-item empty">
              <div className="bet-user">No bets yet</div>
              <div className="bet-details">
                <div className="bet-time">Be the first to bet!</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveBetFeed;