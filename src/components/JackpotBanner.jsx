import React from 'react';
import { Trophy, Zap } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const JackpotBanner = () => {
  const { jackpotPool, roundState } = useGame();
  const isTriggered = roundState.jackpotTriggered;

  return (
    <div 
      className={`card relative overflow-hidden ${isTriggered ? 'animate-pulse-jackpot shadow-jackpot-glow' : ''}`}
      role="region"
      aria-label="Jackpot pool information"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-jackpot/10 to-transparent" aria-hidden="true" />
      
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-md">
        <div className="flex items-center gap-3 sm:gap-md">
          <div 
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-jackpot/20 flex items-center justify-center shadow-jackpot-glow"
            aria-hidden="true"
          >
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-jackpot" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-h2">Jackpot Pool</h2>
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-jackpot" aria-hidden="true" />
            </div>
            <p className="text-caption text-text-muted">1% chance to win on every round</p>
          </div>
        </div>
        
        <div className="text-center sm:text-right">
          <div 
            className="text-3xl sm:text-4xl font-bold text-jackpot"
            aria-label={`Jackpot pool: ${jackpotPool.toFixed(2)} SOL`}
          >
            {jackpotPool.toFixed(2)} SOL
          </div>
          <div className="text-caption text-text-muted mt-1" aria-label={`Approximately ${(jackpotPool * 100).toFixed(2)} US dollars`}>
            ${(jackpotPool * 100).toFixed(2)} USD
          </div>
        </div>
      </div>
      
      {isTriggered && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-jackpot rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '50%',
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {isTriggered && (
        <div className="sr-only" role="status" aria-live="assertive">
          Jackpot has been triggered! Congratulations to the winners!
        </div>
      )}
    </div>
  );
};

export default JackpotBanner;