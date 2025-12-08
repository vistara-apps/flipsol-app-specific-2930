import React, { useState } from 'react';
import BetCard from './BetCard';
import ClaimCard from './ClaimCard';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '../contexts/WalletContext';

const BettingArea = () => {
  const { roundState, userBet, startNewRound } = useGame();
  const { connected } = useWallet();

  if (roundState.settled && userBet) {
    return (
      <div className="space-y-6">
        <ClaimCard />
        <button
          onClick={startNewRound}
          className="btn-primary w-full text-lg py-4"
        >
          Start New Round
        </button>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-xl sm:text-2xl font-bold mb-2">Connect Your Wallet</h3>
        <p className="text-sm sm:text-base text-text-muted">
          Connect your Solana wallet to start playing
        </p>
      </div>
    );
  }

  if (roundState.settled) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-xl sm:text-2xl font-bold mb-4">Round Settled</h3>
        <button
          onClick={startNewRound}
          className="btn-primary text-lg py-4 px-8"
        >
          Start New Round
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <BetCard side={0} />
      <BetCard side={1} />
    </div>
  );
};

export default BettingArea;