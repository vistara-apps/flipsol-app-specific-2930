import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const FlipCoinCenter = ({ winner, onComplete, isActive = false }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (isActive && winner !== undefined) {
      setIsFlipping(true);
      
      // Flip duration
      setTimeout(() => {
        setIsFlipping(false);
        setShowResult(true);
      }, 2000);
      
      // Show result and complete
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 3500);
    }
  }, [isActive, winner, onComplete]);

  if (!isActive) {
    return (
      <div className="flip-coin-idle">
        <div className="modern-coin">
          <div className="coin-face front">
            <div className="coin-inner">
              <div className="flip-symbol">⚡</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flip-coin-container">
      <div className={`modern-coin ${isFlipping ? 'flipping' : ''} ${showResult ? 'result-shown' : ''}`}>
        <div className="coin-face front">
          <div className="coin-inner">
            {showResult ? (
              <div className="coin-result">
                <div className="result-text">{winner === 0 ? 'HEADS' : 'TAILS'}</div>
                <div className="result-icon">
                  {winner === 0 ? <ArrowUp size={32} /> : <ArrowDown size={32} />}
                </div>
              </div>
            ) : (
              <div className="flip-symbol">⚡</div>
            )}
          </div>
        </div>
        
        <div className={`coin-face back ${winner === 0 ? 'heads' : 'tails'}`}>
          <div className="coin-inner">
            <div className="coin-result">
              <div className="result-text">{winner === 0 ? 'HEADS' : 'TAILS'}</div>
              <div className="result-icon">
                {winner === 0 ? <ArrowUp size={32} /> : <ArrowDown size={32} />}
              </div>
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

export default FlipCoinCenter;