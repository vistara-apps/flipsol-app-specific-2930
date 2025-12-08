import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const RoundTimer = () => {
  const { currentRound, timeLeft, roundState } = useGame();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / 60) * 100;
  const isEnding = timeLeft <= 10 && !roundState.settled;

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center ${
            roundState.settled ? 'bg-accent/20' : isEnding ? 'bg-danger/20' : 'bg-primary/20'
          }`}>
            {roundState.settled ? (
              <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
            ) : (
              <Clock className={`w-6 h-6 sm:w-7 sm:h-7 ${isEnding ? 'text-danger' : 'text-primary'}`} />
            )}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold">Round #{currentRound}</h3>
            <p className="text-xs sm:text-sm text-text-muted">
              {roundState.settled ? 'Round Settled' : 'Betting Open'}
            </p>
          </div>
        </div>
        
        <div className="text-center sm:text-right w-full sm:w-auto">
          <div className={`text-2xl sm:text-3xl font-bold font-mono ${
            roundState.settled ? 'text-accent' : isEnding ? 'text-danger' : 'text-primary'
          }`}>
            {roundState.settled ? 'CLOSED' : formatTime(timeLeft)}
          </div>
          {!roundState.settled && (
            <div className="w-full sm:w-32 h-2 bg-surface-hover rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  isEnding ? 'bg-danger' : 'bg-accent'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundTimer;