import React from 'react';
import { Trophy, Zap } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const JackpotBanner = () => {
  const { jackpotPool, roundState } = useGame();

  return (
    <div className={`card relative overflow-hidden ${roundState.jackpotTriggered ? 'animate-pulse-jackpot' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-jackpot/10 to-transparent" />
      
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-jackpot/20 flex items-center justify-center shadow-jackpot-glow">
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-jackpot" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-bold">Jackpot Pool</h2>
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-jackpot" />
            </div>
            <p className="text-xs sm:text-sm text-text-muted">1% chance to win on every round</p>
          </div>
        </div>
        
        <div className="text-center sm:text-right">
          <div className="text-3xl sm:text-4xl font-bold text-jackpot">
            {jackpotPool.toFixed(2)} SOL
          </div>
          <div className="text-xs sm:text-sm text-text-muted mt-1">
            ${(jackpotPool * 100).toFixed(2)} USD
          </div>
        </div>
      </div>
      
      {roundState.jackpotTriggered && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-jackpot rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default JackpotBanner;