import React from 'react';
import { Trophy, Zap } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const JackpotBanner = () => {
  const { jackpotPool, roundState } = useGame();
  const isTriggered = roundState?.jackpotTriggered || false;
  
  // Calculate total jackpot including current pot
  const currentPot = roundState ? (roundState.headsTotal + roundState.tailsTotal) : 0;
  const totalJackpot = jackpotPool + currentPot;

  return (
    <div 
      className={`casino-card relative overflow-hidden ${isTriggered ? 'animate-pulse-jackpot shadow-jackpot-glow' : ''}`}
      role="region"
      aria-label="Jackpot pool information"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-jackpot/20 via-jackpot/5 to-transparent" aria-hidden="true" />
      
      <div className="relative flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-jackpot/30 to-jackpot/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-jackpot" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-jackpot flex items-center gap-1 sm:gap-2">
              <span className="hidden sm:inline">🏆</span>
              <span className="truncate">Jackpot Pool</span>
              <span className="text-xs text-text-muted font-normal hidden sm:inline">(+{currentPot.toFixed(2)} SOL pot)</span>
            </h2>
            <div className="text-xs text-text-muted sm:hidden">+{currentPot.toFixed(2)} SOL pot</div>
          </div>
        </div>
        
        <div className="text-right flex-shrink-0">
          <div 
            className={`text-lg sm:text-2xl md:text-3xl font-bold ${isTriggered ? 'jackpot-glow' : 'text-jackpot'}`}
            aria-label={`Total jackpot: ${totalJackpot.toFixed(3)} SOL`}
          >
            {totalJackpot.toFixed(3)} SOL
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