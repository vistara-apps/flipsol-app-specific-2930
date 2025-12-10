import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';

const CoinTossAnimation = ({ winner, onComplete, userWon = false }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    console.log('🎰 CoinTossAnimation mounted with winner:', winner);

    // Start animation
    setIsFlipping(true);

    // Animate coin flip
    const flipInterval = setInterval(() => {
      setRotation(prev => prev + 180);
    }, 100);

    // Show result after 5 seconds
    setTimeout(() => {
      console.log('🎰 Coin flip ending, showing result for winner:', winner);
      clearInterval(flipInterval);
      setIsFlipping(false);
      setShowResult(true);

      // Trigger winner confetti if user won
      if (userWon) {
        console.log('🎉 User won! Triggering winner confetti!');
        const triggerWinnerConfetti = () => {
          // Gold confetti for winners
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.4 },
            colors: ['#FFD700', '#FFA500', '#FFFF00', '#FF6347', '#00d4ff'],
            shapes: ['star', 'circle'],
            gravity: 0.6,
            drift: 0.1,
            scalar: 1.2,
          });
        };

        triggerWinnerConfetti();
        setTimeout(triggerWinnerConfetti, 300);
        setTimeout(triggerWinnerConfetti, 600);
      }

      // Call onComplete after showing result (longer dwell time)
      setTimeout(() => {
        console.log('🎰 Coin toss animation complete, calling onComplete');
        if (onComplete) onComplete();
      }, 4000); // 4 seconds result view
    }, 5000); // 5 seconds flipping

    return () => {
      console.log('🎰 CoinTossAnimation unmounting');
      clearInterval(flipInterval);
    };
  }, [winner, onComplete]);

  // Use Portal to spawn at document body level (ignores parent transforms/overflow)
  return createPortal(
    <div className="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center backdrop-blur-sm">
      <div className="text-center transform scale-125"> {/* Slight scale up for visibility */}
        {!showResult ? (
          <>
            <div
              className="w-40 h-40 mx-auto mb-8 relative"
              style={{
                transform: `rotateY(${rotation}deg)`,
                transformStyle: 'preserve-3d',
                transition: isFlipping ? 'none' : 'transform 0.5s'
              }}
            >
              {/* Coin */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_0_50px_rgba(234,179,8,0.6)] flex items-center justify-center text-6xl font-bold border-4 border-yellow-200">
                {rotation % 360 < 180 ? '👑' : '👾'}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white animate-pulse tracking-widest uppercase">
              Flipping...
            </h2>
          </>
        ) : (
          <div className="animate-scale-in">
            <div className="text-9xl mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              {winner === 0 ? '👑' : '👾'}
            </div>
            <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">
              {winner === 0 ? 'HEADS' : 'TAILS'} Won
            </h2>
            {userWon && (
              <div className="mb-6 animate-bounce">
                <div className="text-7xl mb-2">🏆</div>
                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 animate-pulse">
                  YOU WON!
                </p>
              </div>
            )}
            <p className="text-2xl text-gray-400 font-mono">
              {winner === 0 ? 'Kings reign supreme!' : 'Aliens take the pot!'}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CoinTossAnimation;