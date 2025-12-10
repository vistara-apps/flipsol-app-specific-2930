import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';

const CircularTimer = () => {
  const { getCurrentRoundInfo, roundState, globalState, userBet, fetchGlobalState, fetchRoundState, fetchUserBet, closeRound, claimWinnings } = useGame();
  const { publicKey } = useWallet();
  const [roundInfo, setRoundInfo] = useState(null);

  useEffect(() => {
    const updateRoundInfo = () => {
      if (getCurrentRoundInfo) {
        setRoundInfo(getCurrentRoundInfo());
      }
    };

    updateRoundInfo();
    const interval = setInterval(updateRoundInfo, 100); // Update every 100ms for smooth timer

    return () => clearInterval(interval);
  }, [getCurrentRoundInfo]);

  if (!roundInfo) return null;

  const {
    currentRoundId,
    timeLeftToBet,
    nextRoundStartsIn,
    bettingOpen,
    phase,
    isBettingPhase,
    isBreakPhase,
  } = roundInfo;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (isBettingPhase) {
      return ((60 - timeLeftToBet) / 60) * 100; // 60 second betting phase
    } else if (isBreakPhase) {
      return ((60 - nextRoundStartsIn) / 60) * 100; // 60 second break phase
    } else {
      return 0;
    }
  };

  const getTimerColor = () => {
    if (isBettingPhase) return 'neon-cyan';
    if (isBreakPhase) return 'neon-purple';
    return 'neon-magenta';
  };

  const getDisplayTime = () => {
    if (isBettingPhase) return timeLeftToBet;
    if (isBreakPhase) return nextRoundStartsIn;
    return 0;
  };

  const getStatusText = () => {
    if (isBettingPhase) return 'BET';
    if (isBreakPhase) return 'BREAK';
    return 'SETTLE';
  };

  const progress = getProgress();
  const circumference = 2 * Math.PI * 54; // radius of 54
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const timerColor = getTimerColor();

  return (
    <div className="circular-timer-container">
      <div className="circular-timer">
        {/* Background circle */}
        <svg className="timer-svg" width="120" height="120">
          <circle
            className="timer-background"
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="3"
          />

          {/* Progress circle */}
          <circle
            className={`timer-progress timer-${timerColor}`}
            cx="60"
            cy="60"
            r="54"
            fill="none"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
          />

          {/* Breathing animation overlay */}
          <circle
            className={`timer-breathing timer-${timerColor}`}
            cx="60"
            cy="60"
            r="54"
            fill="none"
            strokeWidth="1"
            opacity="0.6"
          />
        </svg>

        {/* Timer content */}
        <div className="timer-content">
          <div className="timer-round">#{roundState?.roundId || (globalState?.currentRound > 0 ? globalState.currentRound : currentRoundId)}
          </div>
          <div className={`timer-time timer-${timerColor}`}>
            {isBettingPhase || isBreakPhase ? formatTime(getDisplayTime()) : '⚡'}
          </div>
          <div className={`timer-status timer-${timerColor}`}>
            {getStatusText()}
          </div>
        </div>

        {/* Pulse rings for breathing effect */}
        <div className={`timer-pulse-ring timer-${timerColor}`}></div>
        <div className={`timer-pulse-ring timer-${timerColor} pulse-delay-1`}></div>
        <div className={`timer-pulse-ring timer-${timerColor} pulse-delay-2`}></div>
      </div>

      {/* Quick stats */}
      <div className="timer-stats">
        {roundState && !roundState.settled && (
          <div className="stat-item">
            <span className="stat-label">Pot</span>
            <span className="stat-value">{((roundState.headsTotal + roundState.tailsTotal) / 1_000_000_000).toFixed(2)} SOL</span>
          </div>
        )}
        {/*userBet && !userBet.claimed && roundState?.settled && (
          <button
            onClick={async () => {
              try {
                await claimWinnings(roundState.roundId);
                console.log('✅ Winnings claimed successfully!');
              } catch (error) {
                console.error('❌ Failed to claim winnings:', error);
                alert('Failed to claim winnings: ' + error.message);
              }
            }}
            className="claim-button"
          >
            💰 Claim Winnings
          </button>
        )*/}
      </div>
    </div>
  );
};

export default CircularTimer;