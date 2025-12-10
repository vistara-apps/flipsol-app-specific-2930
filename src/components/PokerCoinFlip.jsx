import React, { useState, useEffect } from 'react';

const PokerCoinFlip = ({ winner, onComplete, isActive }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (isActive && winner !== null && winner !== undefined) {
      setIsFlipping(true);
      
      // Flip animation duration
      setTimeout(() => {
        setIsFlipping(false);
        setShowResult(true);
        
        // Show result for 3 seconds
        setTimeout(() => {
          setShowResult(false);
          if (onComplete) onComplete();
        }, 3000);
      }, 2000);
    }
  }, [isActive, winner, onComplete]);

  if (!isActive && !showResult) {
    return (
      <div className="poker-coin-idle">
        <div className="casino-coin">
          <div className="coin-face front">
            <span className="coin-text">FlipSOL</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="poker-coin-container">
      <div className={`casino-coin ${isFlipping ? 'flipping' : ''} ${showResult ? 'result-shown' : ''}`}>
        <div className="coin-face front">
          <span className="coin-text">FlipSOL</span>
        </div>
        <div className={`coin-face back ${winner === 0 ? 'heads' : 'tails'}`}>
          <div className="coin-result">
            <span className="result-text">{winner === 0 ? 'HEADS' : 'TAILS'}</span>
            <div className="result-icon">
              {winner === 0 ? '↑' : '↓'}
            </div>
          </div>
        </div>
      </div>
      
      {showResult && (
        <div className="result-announcement">
          <div className={`winner-text ${winner === 0 ? 'heads-winner' : 'tails-winner'}`}>
            {winner === 0 ? 'HEADS WINS!' : 'TAILS WINS!'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerCoinFlip;