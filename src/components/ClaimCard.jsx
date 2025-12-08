import React, { useState } from 'react';
import { Trophy, X, CheckCircle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '../contexts/WalletContext';

const ClaimCard = () => {
  const { roundState, userBet, claimWinnings, jackpotPool } = useGame();
  const { balance, updateBalance } = useWallet();
  const [claimed, setClaimed] = useState(false);

  const isWinner = userBet && roundState.winningSide === userBet.side;
  const winningSideName = roundState.winningSide === 0 ? 'Heads' : 'Tails';

  const handleClaim = () => {
    const payout = claimWinnings();
    if (payout > 0) {
      updateBalance(balance + payout);
      setClaimed(true);
    }
  };

  if (!isWinner) {
    return (
      <div className="card bg-gradient-to-br from-danger/20 to-danger/5 border border-danger/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-danger/20 flex items-center justify-center">
            <X className="w-7 h-7 text-danger" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-danger">Better Luck Next Time</h3>
            <p className="text-sm text-text-muted">Winning side: {winningSideName}</p>
          </div>
        </div>
        <div className="bg-surface-hover rounded-xl p-4 text-center">
          <div className="text-sm text-text-muted mb-1">Your Bet</div>
          <div className="text-xl font-bold">{userBet.amount.toFixed(2)} SOL</div>
        </div>
      </div>
    );
  }

  const totalPot = roundState.headsTotal + roundState.tailsTotal;
  const winningTotal = roundState.winningSide === 0 ? roundState.headsTotal : roundState.tailsTotal;
  const userShare = userBet.amount / winningTotal;
  const rake = totalPot * 0.02;
  const jackpotContribution = totalPot * 0.01;
  const winnerPool = totalPot - rake - jackpotContribution;
  
  let payout = winnerPool * userShare;
  
  if (roundState.jackpotTriggered) {
    payout += jackpotPool * userShare;
  }

  return (
    <div className={`card bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 ${
      roundState.jackpotTriggered ? 'shadow-jackpot-glow' : ''
    }`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-accent">You Won!</h3>
          <p className="text-sm text-text-muted">
            {winningSideName} wins • {roundState.jackpotTriggered && '🎉 JACKPOT TRIGGERED!'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-surface-hover rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-muted">Your Bet</span>
            <span className="font-semibold">{userBet.amount.toFixed(2)} SOL</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-muted">Base Winnings</span>
            <span className="font-semibold">{(winnerPool * userShare).toFixed(2)} SOL</span>
          </div>
          {roundState.jackpotTriggered && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-jackpot">Jackpot Bonus</span>
              <span className="font-semibold text-jackpot">{(jackpotPool * userShare).toFixed(2)} SOL</span>
            </div>
          )}
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Payout</span>
              <span className="text-2xl font-bold text-accent">{payout.toFixed(2)} SOL</span>
            </div>
          </div>
        </div>

        {claimed ? (
          <div className="bg-accent/20 rounded-xl p-4 flex items-center justify-center gap-2 text-accent">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Claimed Successfully!</span>
          </div>
        ) : (
          <button
            onClick={handleClaim}
            className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 rounded-xl transition-all duration-200 active:scale-95"
          >
            Claim {payout.toFixed(2)} SOL
          </button>
        )}
      </div>
    </div>
  );
};

export default ClaimCard;