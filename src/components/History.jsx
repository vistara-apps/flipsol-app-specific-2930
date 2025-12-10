import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Trophy, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWallet as useCustomWallet } from '../contexts/WalletContext';
import { getRoundStatePDA, getUserBetPDA } from '../lib/anchor';

const History = () => {
  const { history, program, globalState, claimWinnings, fetchGlobalState, fetchRoundState, fetchUserBet } = useGame();
  const { publicKey } = useWallet();
  const { updateBalance } = useCustomWallet();
  const [claimableRounds, setClaimableRounds] = useState([]);
  const [claiming, setClaiming] = useState({});
  const [checking, setChecking] = useState(false);

  // Check for claimable rounds
  useEffect(() => {
    const checkClaimableRounds = async () => {
      if (!program || !publicKey || !globalState) return;

      setChecking(true);
      const claimable = [];

      try {
        // Check last 10 rounds
        const currentRound = globalState.currentRound || 0;
        const startRound = Math.max(1, currentRound - 9);

        for (let i = startRound; i <= currentRound; i++) {
          try {
            const [roundPDA] = await getRoundStatePDA(i);
            const roundState = await program.account.roundState.fetch(roundPDA);

            if (roundState.settled) {
              const [userBetPDA] = await getUserBetPDA(publicKey, i);
              try {
                const userBet = await program.account.userBet.fetch(userBetPDA);

                if (userBet.side === roundState.winningSide && !userBet.claimed) {
                  const betAmount = userBet.amount.toNumber() / 1e9;
                  const totalPot = (roundState.headsTotal.toNumber() + roundState.tailsTotal.toNumber()) / 1e9;
                  const winningSidePot = roundState.winningSide === 0
                    ? roundState.headsTotal.toNumber() / 1e9
                    : roundState.tailsTotal.toNumber() / 1e9;

                  const payoutRatio = winningSidePot > 0 ? totalPot / winningSidePot : 0;
                  const estimatedPayout = betAmount * payoutRatio * 0.97;

                  claimable.push({
                    roundId: i,
                    betAmount,
                    winningSide: roundState.winningSide,
                    estimatedPayout,
                    side: userBet.side
                  });
                }
              } catch (e) {
                // User didn't bet in this round
              }
            }
          } catch (e) {
            // Round doesn't exist
          }
        }

        setClaimableRounds(claimable);
      } catch (error) {
        console.error('Error checking claimable rounds:', error);
      } finally {
        setChecking(false);
      }
    };

    checkClaimableRounds();
  }, [program, publicKey, globalState?.currentRound, history]);

  const handleClaim = async (roundId) => {
    if (!publicKey) return;

    try {
      setClaiming(prev => ({ ...prev, [roundId]: true }));
      await claimWinnings(roundId);
      await updateBalance(publicKey);
      await fetchGlobalState();

      // Remove from claimable list
      setClaimableRounds(prev => prev.filter(r => r.roundId !== roundId));
    } catch (error) {
      console.error('Error claiming:', error); console.error(error.message || 'Failed to claim winnings');
    } finally {
      setClaiming(prev => ({ ...prev, [roundId]: false }));
    }
  };

  if (history.length === 0 && claimableRounds.length === 0) {
    return (
      <div
        className="card text-center py-12"
        role="status"
        aria-label="No history available"
      >
        <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-text-muted mx-auto mb-md" aria-hidden="true" />
        <h3 className="text-lg sm:text-xl font-bold mb-2">No History Yet</h3>
        <p className="text-body text-text-muted">
          Play your first round to see history here
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-md"
      role="region"
      aria-label="Round history"
    >
      {claimableRounds.length > 0 && (
        <div className="card bg-green-500/10 border-green-500/30 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-bold text-green-400">Unclaimed Winnings!</h3>
          </div>
          <div className="space-y-3">
            {claimableRounds.map(round => (
              <div key={round.roundId} className="bg-surface rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium">Round #{round.roundId}</div>
                  <div className="text-sm text-text-muted">
                    Won {round.betAmount.toFixed(3)} SOL on {round.winningSide === 0 ? 'Heads' : 'Tails'}
                  </div>
                  <div className="text-sm text-green-400">
                    Payout: ~{round.estimatedPayout.toFixed(3)} SOL
                  </div>
                </div>
                <button
                  onClick={() => handleClaim(round.roundId)}
                  disabled={claiming[round.roundId]}
                  className="btn btn-primary btn-sm"
                >
                  {claiming[round.roundId] ? 'Claiming...' : 'Claim'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {history.map((round) => {
        const winningSide = round.winningSide === 0 ? 'Heads' : 'Tails';
        const Icon = round.winningSide === 0 ? ArrowUp : ArrowDown;
        const color = round.winningSide === 0 ? 'heads' : 'tails';
        const date = new Date(round.timestamp).toLocaleString();

        return (
          <article
            key={round.roundId}
            className="card hover:bg-surface-hover transition-colors duration-fast"
            aria-label={`Round ${round.roundId} history`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
              <div className="flex items-center gap-3 sm:gap-md">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-${color}/20 flex items-center justify-center`}
                  aria-hidden="true"
                >
                  <Icon className={`w-6 h-6 sm:w-7 sm:h-7 text-${color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold">Round #{round.roundId}</h3>
                    {round.jackpotTriggered && (
                      <Trophy
                        className="w-4 h-4 sm:w-5 sm:h-5 text-jackpot"
                        aria-label="Jackpot won"
                      />
                    )}
                  </div>
                  <p className="text-caption text-text-muted">
                    <time dateTime={new Date(round.timestamp).toISOString()}>{date}</time>
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right w-full sm:w-auto">
                <div className="text-caption text-text-muted">Winner: {winningSide}</div>
                <div className="text-lg sm:text-xl font-bold">{round.totalPot.toFixed(2)} SOL</div>
                {round.jackpotTriggered && (
                  <div className="text-caption text-jackpot font-semibold">🎉 Jackpot Hit!</div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default History;