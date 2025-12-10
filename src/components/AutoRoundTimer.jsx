import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import CoinTossAnimation from './CoinTossAnimation';

const AutoRoundTimer = () => {
  const { getCurrentRoundInfo, roundState, globalState, userBet, fetchGlobalState, fetchRoundState, fetchUserBet, closeRound, claimWinnings } = useGame();
  const { publicKey } = useWallet();
  const [roundInfo, setRoundInfo] = useState(null);
  const [showCoinToss, setShowCoinToss] = useState(false);
  const [previousRoundState, setPreviousRoundState] = useState(null);

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

  // Check for round settlement
  useEffect(() => {
    if (roundState && previousRoundState) {
      // Round just settled
      if (!previousRoundState.settled && roundState.settled) {
        setShowCoinToss(true);
      }
    }
    setPreviousRoundState(roundState);
  }, [roundState]);

  // Auto-refresh round state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (globalState?.currentRound > 0) {
        fetchRoundState(globalState.currentRound);
        fetchUserBet(globalState.currentRound);
      }
    }, 30000); // Check every 30 seconds (reduced from 5s to stop RPC spam)

    return () => clearInterval(interval);
  }, [globalState?.currentRound, fetchRoundState, fetchUserBet]);

  // Manual settlement trigger for testing
  const triggerSettlement = async () => {
    if (!roundState || roundState.settled) {
      alert('No active round to settle');
      return;
    }
    
    try {
      console.log('🎯 Triggering manual settlement...');
      
      // Use the existing closeRound function
      await closeRound();
      
      console.log('✅ Round settled successfully!');
      
      // Trigger coin toss animation
      setShowCoinToss(true);
      
    } catch (error) {
      console.error('❌ Manual settlement failed:', error);
      alert('Settlement failed: ' + error.message);
    }
  };

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

  const getProgressPercentage = () => {
    if (isBettingPhase) {
      return ((60 - timeLeftToBet) / 60) * 100; // 60 second betting phase
    } else if (isBreakPhase) {
      return ((60 - nextRoundStartsIn) / 60) * 100; // 60 second break phase
    } else {
      return 0;
    }
  };

  return (
    <div className="casino-card p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold">
            🎰 Round #{roundState?.roundId || (globalState?.currentRound > 0 ? globalState.currentRound : currentRoundId)}
            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
              isBettingPhase 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : isBreakPhase
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {isBettingPhase ? '🎲 PLACE BETS' : isBreakPhase ? '☕ CASINO BREAK' : '⏳ SETTLING'}
            </span>
          </h3>
          <p className="text-sm text-text-muted">
            {isBettingPhase 
              ? `⏰ ${formatTime(timeLeftToBet)} left to place bets`
              : isBreakPhase
              ? `🍸 Break time - Next round in ${formatTime(nextRoundStartsIn)}`
              : `🎯 Settlement in progress...`
            }
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-mono font-bold ${
            isBettingPhase ? 'text-green-400' : isBreakPhase ? 'text-purple-400' : 'text-yellow-400'
          }`}>
            {isBettingPhase ? formatTime(timeLeftToBet) : isBreakPhase ? formatTime(nextRoundStartsIn) : '🎯'}
          </div>
          <div className="text-xs text-text-muted">
            {isBettingPhase ? '⏰ betting ends' : isBreakPhase ? '🎰 casino opens' : '🎲 settling...'}
          </div>
        </div>
      </div>
      
      {/* Casino Progress Bar */}
      <div className="w-full bg-bg rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-100 ${
            isBettingPhase ? 'bg-gradient-to-r from-green-500 to-green-400' : 
            isBreakPhase ? 'bg-gradient-to-r from-purple-500 to-purple-400' :
            'bg-gradient-to-r from-yellow-500 to-yellow-400'
          } shadow-glow`}
          style={{ width: `${Math.min(100, getProgressPercentage())}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center text-xs text-text-muted mt-2">
        <span>🎲 Betting: 60s</span>
        <span>☕ Break: 60s</span>
        {isBreakPhase && (
          <span className="text-purple-400 animate-pulse">
            🍸 Casino break - Grab a drink!
          </span>
        )}
        {!isBettingPhase && !isBreakPhase && (
          <span className="text-yellow-400 animate-pulse">
            🎯 Backend settling round...
          </span>
        )}
      </div>
      
      {/* Show actual blockchain state */}
      <div className="mt-3 pt-3 border-t border-border/50 space-y-2 text-sm">
        {roundState && !roundState.settled && (
          <div className="flex justify-between text-yellow-400">
            <span>Current Pot:</span>
            <span>{((roundState.headsTotal + roundState.tailsTotal) / 1_000_000_000).toFixed(3)} SOL</span>
          </div>
        )}
        {userBet && !userBet.claimed && roundState?.settled && (
          <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-400 font-medium">
                  💰 You have unclaimed winnings!
                </div>
                <div className="text-xs text-green-400/70 mt-1">
                  Round #{roundState.roundId} • {userBet.side === 0 ? 'Heads' : 'Tails'} • {userBet.amount} SOL
                </div>
              </div>
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
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Claim Now
              </button>
            </div>
          </div>
        )}
        {!roundState && globalState?.currentRound === 0 && (
          <div className="text-center text-gray-500 py-2">
            Waiting for first bet to start Round #1...
          </div>
        )}
      </div>
      
      {showCoinToss && roundState && (
        <CoinTossAnimation
          result={roundState.winningSide}
          userWon={userBet && userBet.side === roundState.winningSide}
          onComplete={() => {
            setShowCoinToss(false);
            // Refresh state after animation
            fetchGlobalState();
            if (globalState?.currentRound > 0) {
              fetchRoundState(globalState.currentRound);
              fetchUserBet(globalState.currentRound);
            }
          }}
        />
      )}
    </div>
  );
};

export default AutoRoundTimer;