import React, { useState, useEffect } from 'react';
import PokerCoinFlip from './PokerCoinFlip';
import { useGame } from '../contexts/GameContext';

const PokerTable = ({ children }) => {
  const { roundState } = useGame();
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [lastSettledRound, setLastSettledRound] = useState(null);

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
    <div className="poker-table-container">
      {/* Poker Table Surface */}
      <div className="poker-table">
        {/* Inner felt area */}
        <div className="poker-felt">
          {/* Center area for coin flip action */}
          <div className="poker-center-area">
            {showCoinFlip && roundState?.settled ? (
              <PokerCoinFlip 
                winner={roundState.winningSide}
                onComplete={handleCoinFlipComplete}
                isActive={true}
              />
            ) : (
              <div className="casino-logo-area">
                <PokerCoinFlip isActive={false} />
                <span className="casino-logo-text mt-2">FlipSOL</span>
              </div>
            )}
          </div>
          
          {/* Betting positions around the table */}
          <div className="betting-positions">
            {children}
          </div>
        </div>
        
        {/* Table edge with leather padding */}
        <div className="table-edge"></div>
      </div>
      
      {/* Table shadow and base */}
      <div className="table-shadow"></div>
    </div>
  );
};

export default PokerTable;