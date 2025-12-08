import React from 'react';
import BetCard from './BetCard';
import ClaimCard from './ClaimCard';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '../contexts/WalletContext';
import { Wallet } from 'lucide-react';

const BettingArea = () => {
  const { roundState, userBet, startNewRound } = useGame();
  const { connected } = useWallet();

  if (roundState.settled && userBet) {
    return (
      <div className="space-y-lg" role="region" aria-label="Claim winnings section">
        <ClaimCard />
        <button
          onClick={startNewRound}
          className="btn-primary w-full text-lg py-4"
          aria-label="Start a new betting round"
        >
          Start New Round
        </button>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="card text-center py-12" role="status">
        <Wallet className="w-12 h-12 sm:w-16 sm:h-16 text-primary mx-auto mb-md" aria-hidden="true" />
        <h3 className="text-h2 mb-2">Connect Your Wallet</h3>
        <p className="text-body text-text-muted">
          Connect your Solana wallet to start playing
        </p>
      </div>
    );
  }

  if (roundState.settled) {
    return (
      <div className="card text-center py-12" role="status">
        <h3 className="text-h2 mb-lg">Round Settled</h3>
        <button
          onClick={startNewRound}
          className="btn-primary text-lg py-4 px-8"
          aria-label="Start a new betting round"
        >
          Start New Round
        </button>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-md sm:gap-lg"
      role="region"
      aria-label="Betting options"
    >
      <BetCard side={0} />
      <BetCard side={1} />
    </div>
  );
};

export default BettingArea;