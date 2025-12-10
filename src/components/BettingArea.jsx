import React, { useState, useEffect } from 'react';
import DraggableFlipCard from './DraggableFlipCard';
import ClaimCard from './ClaimCard';
import CircularTimer from './CircularTimer';
import CoinTossAnimation from './CoinTossAnimation';
import RoundSettlementStatus from './RoundSettlementStatus';
import UnifiedBettingCard from './UnifiedBettingCard';
import LiveBetFeed from './LiveBetFeed';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet } from 'lucide-react';

const BettingArea = () => {
  const { roundState, userBet, startNewRound, globalState, loading, error, initializeProgram, getCurrentRoundInfo } = useGame();
  const { connected, publicKey } = useWallet();

  const [showCoinToss, setShowCoinToss] = useState(false);
  const [animationWinner, setAnimationWinner] = useState(0);
  const [lastSettledRound, setLastSettledRound] = useState(null);
  const [resultsRevealed, setResultsRevealed] = useState(false);

  // Debug showCoinToss changes
  useEffect(() => {
    console.log('🎰 showCoinToss changed to:', roundState, showCoinToss);
  }, [showCoinToss]);

  // Watch for round settlement (only trigger animation for NEW settlements, not on page load)
  useEffect(() => {
    const totalPotSOL = roundState ? (roundState.headsTotal + roundState.tailsTotal) / 1_000_000_000 : 0;
    const shouldTrigger = roundState?.settled &&
      roundState?.roundId !== lastSettledRound &&
      roundState?.headsTotal + roundState?.tailsTotal > 0 &&
      lastSettledRound !== null;

    console.log('🎰 Coin toss animation check:', {
      settled: roundState?.settled,
      roundId: roundState?.roundId,
      lastSettledRound,
      totalPotSOL,
      headsTotal: roundState?.headsTotal,
      tailsTotal: roundState?.tailsTotal,
      shouldTrigger,
      triggerConditions: {
        isSettled: roundState?.settled,
        isDifferentRound: roundState?.roundId !== lastSettledRound,
        hasPot: roundState?.headsTotal + roundState?.tailsTotal > 0,
        hasLastRound: lastSettledRound !== null
      }
    });

    // Only show coin toss if we have a previous round reference and this is a NEW settlement
    if (shouldTrigger) {
      console.log('🎰 ✅ TRIGGERING COIN TOSS ANIMATION for Round', roundState.roundId);
      setAnimationWinner(roundState.winningSide);
      setShowCoinToss(true);
      setResultsRevealed(false); // Hide results until animation is done
      setLastSettledRound(roundState.roundId);
    } else if (roundState?.settled && lastSettledRound === null) {
      // Just set the last settled round without showing animation on initial load
      console.log('🎰 📝 Setting initial lastSettledRound to', roundState.roundId, '(no animation on page load)');
      setLastSettledRound(roundState.roundId);
      setResultsRevealed(true); // Reveal immediately if loading pre-settled page
    } else if (roundState?.settled) {
      console.log('🎰 ❌ Not triggering animation because:', {
        alreadySeen: roundState.roundId === lastSettledRound,
        noPot: totalPotSOL === 0,
        noLastRound: lastSettledRound === null
      });
    }
  }, [roundState, lastSettledRound]);

  // Listen for test coin toss events from debug panel
  useEffect(() => {
    const handleTestCoinToss = (event) => {
      const mockData = event.detail;
      console.log('🎰 🧪 TEST COIN TOSS TRIGGERED from debug panel:', mockData);

      // Create a temporary round state for the animation
      setRoundState(prev => ({
        ...prev,
        roundId: mockData.roundId,
        settled: true,
        winningSide: mockData.winningSide,
        headsTotal: mockData.headsTotal * 1_000_000_000,
        tailsTotal: mockData.tailsTotal * 1_000_000_000,
      }));

      setLastSettledRound(mockData.roundId - 1); // Force different last round
      console.log('🎰 🎯 Setting showCoinToss to TRUE');
      setShowCoinToss(true);
    };

    const handleForceShowCoinToss = (event) => {
      const mockData = event.detail;
      console.log('🎰 💥 FORCE SHOW COIN TOSS:', mockData);

      // Directly trigger the animation without state changes
      setLastSettledRound(null); // Reset to trigger animation
      console.log('🎰 💥 FORCE Setting showCoinToss to TRUE');
      setTimeout(() => {
        setShowCoinToss(true);
      }, 100);
    };

    const handleDirectShowCoinToss = (event) => {
      const data = event.detail;
      console.log('🎰 🔥 DIRECT SHOW COIN TOSS EVENT:', data);

      // Immediately show the coin toss no matter what
      console.log('🎰 🔥 DIRECTLY Setting showCoinToss to TRUE');
      setShowCoinToss(true);

      // Also update round state to have winner info
      setRoundState(prev => ({
        ...prev,
        winningSide: data.winningSide,
        settled: true
      }));
      setAnimationWinner(data.winningSide);
      setResultsRevealed(false);
      setLastSettledRound(null); // Force triggers
    };

    window.addEventListener('testCoinToss', handleTestCoinToss);
    window.addEventListener('forceShowCoinToss', handleForceShowCoinToss);
    window.addEventListener('directShowCoinToss', handleDirectShowCoinToss);

    return () => {
      window.removeEventListener('testCoinToss', handleTestCoinToss);
      window.removeEventListener('forceShowCoinToss', handleForceShowCoinToss);
      window.removeEventListener('directShowCoinToss', handleDirectShowCoinToss);
    };
  }, []);

  if (!connected) {
    return (
      <>
        {showCoinToss && (
          <CoinTossAnimation
            winner={roundState?.winningSide || 0}
            userWon={userBet && userBet.roundId === roundState?.roundId && userBet.side === roundState?.winningSide}
            onComplete={() => {
              setShowCoinToss(false);
              setResultsRevealed(true);
            }}
          />
        )}
        <div className="card text-center py-12" role="status">
          <Wallet className="w-12 h-12 sm:w-16 sm:h-16 text-primary mx-auto mb-md" aria-hidden="true" />
          <h3 className="text-h2 mb-2">Connect Your Wallet</h3>
          <p className="text-body text-text-muted">
            Connect your Solana wallet to start playing
          </p>
        </div>
      </>
    );
  }

  // Program not initialized - show simple message (admin will initialize)
  if (connected && globalState === null) {
    return (
      <>
        {showCoinToss && (
          <CoinTossAnimation
            winner={roundState?.winningSide || 0}
            userWon={userBet && userBet.roundId === roundState?.roundId && userBet.side === roundState?.winningSide}
            onComplete={() => {
              setShowCoinToss(false);
              setResultsRevealed(true);
            }}
          />
        )}
        <div className="card text-center py-12" role="status">
          <h3 className="text-h2 mb-lg text-yellow-400">⚡ FlipSOL Starting Soon</h3>
          <p className="text-body text-text-muted mb-lg">
            The FlipSOL program is being initialized by our team. Check back in a few moments!
          </p>
          {error && (
            <div className="text-danger text-sm mt-2 mb-4 bg-red-900/20 p-3 rounded">{error}</div>
          )}
          <div className="text-xs text-text-muted mt-4">
            No setup required - just connect your wallet and start betting!
          </div>
        </div>
      </>
    );
  }

  // Show continuous round UI - even when no round state exists on-chain yet
  if (connected && globalState) {
    const roundInfo = getCurrentRoundInfo ? getCurrentRoundInfo() : null;
    const isCasinoBreak = roundInfo?.isBreakPhase;
    const isBettingPhase = roundInfo?.isBettingPhase;
    const canBet = roundInfo?.bettingOpen && !userBet && !loading;

    // Check if there's an active round with bets that needs settlement
    const hasActiveRoundWithBets = roundState && !roundState.settled &&
      (roundState.headsTotal > 0 || roundState.tailsTotal > 0);

    return (
      <>
        {showCoinToss && (
          <CoinTossAnimation
            winner={animationWinner}
            userWon={userBet && userBet.roundId === roundState?.roundId && userBet.side === animationWinner}
            onComplete={() => {
              setShowCoinToss(false);
              setResultsRevealed(true);
            }}
          />
        )}
        <div className="betting-area-container">
          {/* Modern Circular Timer - positioned at top */}
          <div className="timer-section">
            <CircularTimer />
          </div>

          {error && (
            <div className="error-message text-danger text-sm bg-red-900/20 p-3 rounded border border-red-500/30 mb-2">
              {error}
            </div>
          )}

          {/* Status messages */}
          {isCasinoBreak && (
            <div className="status-message-overlay bg-purple-900/20 border border-purple-500/30 rounded-xl px-6 py-4 text-center backdrop-blur-md max-w-lg mb-2">
              <p className="text-sm text-purple-300/70">Casino break • Next round in {Math.ceil(roundInfo.nextRoundStartsIn)}s</p>
            </div>
          )}

          {hasActiveRoundWithBets && !roundState?.settled && (
            <div className="status-message-overlay bg-yellow-900/20 border border-yellow-500/30 rounded-xl px-6 py-4 text-center backdrop-blur-md max-w-lg mb-2">
              <p className="text-sm text-yellow-300/70">Settlement in progress...</p>
            </div>
          )}

          {/* Unified Betting Interface - Main betting card */}
          <div className="unified-betting-container">
            <UnifiedBettingCard />
          </div>

          {/* Live Bet Feed - Below betting card */}
          <div className="live-bet-feed-inline">
            <LiveBetFeed />
          </div>

          {/* Claim Card - Only show when results are revealed */}
          {roundState && roundState.settled && userBet && userBet.roundId === roundState.roundId && !roundState.virtual && resultsRevealed && (
            <div className="claim-card-wrapper">
              <ClaimCard />
            </div>
          )}

          {/* Settlement Status - positioned after betting interface */}
          <div className="settlement-status-wrapper">
            <RoundSettlementStatus resultsRevealed={resultsRevealed} />
          </div>
        </div>
      </>
    );
  }

  // Fallback for any other state
  return (
    <>
      {showCoinToss && (
        <CoinTossAnimation
          winner={roundState?.winningSide || 0}
          onComplete={() => {
            setShowCoinToss(false);
            setResultsRevealed(true);
          }}
        />
      )}
    </>
  );
};

export default BettingArea;
