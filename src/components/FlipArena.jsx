import React, { useState, useEffect } from 'react';
import FlipCoinCenter from './FlipCoinCenter';
import { useGame } from '../contexts/GameContext';

const FlipArena = ({ children }) => {
  const { roundState } = useGame();
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [lastSettledRound, setLastSettledRound] = useState(null);
  
  // Check if we should use unified betting mode (simple check)
  const hasUnifiedBetting = true; // For now, always use unified betting

  // Watch for round settlement to trigger coin flip
  useEffect(() => {
    if (roundState?.settled &&
      roundState?.roundId !== lastSettledRound &&
      roundState?.headsTotal + roundState?.tailsTotal > 0 &&
      lastSettledRound !== null) {
      setShowCoinFlip(true);
      setLastSettledRound(roundState.roundId);
    } else if (roundState?.settled && lastSettledRound === null) {
      setLastSettledRound(roundState.roundId);
    }
  }, [roundState, lastSettledRound]);

  const handleCoinFlipComplete = () => {
    setShowCoinFlip(false);
  };

  return (
    <div className={`flip-arena-container ${hasUnifiedBetting ? 'unified-betting-active' : ''}`}>
      {/* Modern Flip Arena Surface - hidden on mobile with unified betting */}
      <div className="flip-arena">
        {/* Glassmorphism arena surface */}
        <div className="arena-surface">
          {/* Center area for coin flip action - hidden in unified betting mode */}
          {!hasUnifiedBetting && (
            <div className="arena-center">
              {showCoinFlip && roundState?.settled ? (
                <FlipCoinCenter
                  winner={roundState.winningSide}
                  onComplete={handleCoinFlipComplete}
                  isActive={true}
                />
              ) : (
                <div className="flip-logo-area">
                  <FlipCoinCenter isActive={false} />
                  <div className="flip-logo-text">Flip'nSOL</div>
                  <div className="flip-subtitle"></div>
                </div>
              )}
            </div>
          )}

          {/* Betting positions - disabled for unified betting mode */}
          {!hasUnifiedBetting && (
            <div className="betting-positions">
              {children}
            </div>
          )}
        </div>

        {/* Arena edge with neon glow */}
        <div className="arena-edge"></div>
      </div>

      {/* Arena ambient lighting */}
      <div className="arena-glow"></div>
      
      {/* Unified betting interface renders OUTSIDE arena so it's always visible */}
      {hasUnifiedBetting && (
        <div className="unified-betting-wrapper">
          {children}
        </div>
      )}
    </div>
  );
};

export default FlipArena;