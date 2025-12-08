import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
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
  const isActive = !roundState.settled && !isEnding;

  const getVariantClasses = () => {
    if (roundState.settled) {
      return {
        iconBg: 'bg-accent/20',
        iconColor: 'text-accent',
        timeColor: 'text-accent',
        progressColor: 'bg-accent',
        Icon: CheckCircle,
        status: 'closed',
      };
    }
    if (isEnding) {
      return {
        iconBg: 'bg-danger/20',
        iconColor: 'text-danger',
        timeColor: 'text-danger',
        progressColor: 'bg-danger',
        Icon: AlertCircle,
        status: 'ending',
      };
    }
    return {
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      timeColor: 'text-primary',
      progressColor: 'bg-accent',
      Icon: Clock,
      status: 'active',
    };
  };

  const variant = getVariantClasses();
  const Icon = variant.Icon;

  return (
    <div 
      className="card"
      role="timer"
      aria-label={`Round ${currentRound} timer`}
      aria-live="polite"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-md">
        <div className="flex items-center gap-3 sm:gap-md">
          <div 
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center ${variant.iconBg}`}
            aria-hidden="true"
          >
            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${variant.iconColor}`} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold">Round #{currentRound}</h3>
            <p className="text-caption text-text-muted">
              {roundState.settled ? 'Round Settled' : isEnding ? 'Closing Soon!' : 'Betting Open'}
            </p>
          </div>
        </div>
        
        <div className="text-center sm:text-right w-full sm:w-auto">
          <div 
            className={`text-2xl sm:text-3xl font-bold font-mono ${variant.timeColor}`}
            aria-label={roundState.settled ? 'Round closed' : `Time remaining: ${formatTime(timeLeft)}`}
          >
            {roundState.settled ? 'CLOSED' : formatTime(timeLeft)}
          </div>
          {!roundState.settled && (
            <div 
              className="w-full sm:w-32 h-2 bg-surface-hover rounded-full mt-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Round time progress"
            >
              <div
                className={`h-full transition-all duration-slow ${variant.progressColor} ${isEnding ? 'animate-pulse' : ''}`}
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