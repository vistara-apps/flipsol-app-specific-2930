import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWallet as useCustomWallet } from '../contexts/WalletContext';
import confetti from 'canvas-confetti';
import { useSound } from '../hooks/useSound';
import TransactionDisplay from './TransactionDisplay';

const FlipBetCard = ({ side }) => {
  const { roundState, userBet, placeBet, loading, getCurrentRoundInfo, lastBetTx } = useGame();
  const { publicKey } = useWallet();
  const { balance, updateBalance } = useCustomWallet();
  const { playSound } = useSound();
  const [amount, setAmount] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [betting, setBetting] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Remove the aggressive bet clearing from here since setUserBet is not available
  // The clearing logic is already handled in GameContext.jsx

  const isHeads = side === 0;
  const sideName = isHeads ? 'Heads' : 'Tails';
  const sideTotal = roundState ? (isHeads ? roundState.headsTotal : roundState.tailsTotal) : 0;
  const otherTotal = roundState ? (isHeads ? roundState.tailsTotal : roundState.headsTotal) : 0;
  const Icon = isHeads ? ArrowUp : ArrowDown;
  const cardClass = isHeads ? 'flip-card-heads' : 'flip-card-tails';
  const textColor = isHeads ? 'text-heads' : 'text-tails';
  const buttonClass = isHeads ? 'btn-heads' : 'btn-tails';

  // With auto-rounds, we allow betting even when roundState doesn't exist yet (it gets created on first bet)
  const roundInfo = getCurrentRoundInfo ? getCurrentRoundInfo() : null;

  // Betting disabled conditions - ULTRA SIMPLIFIED
  // Only check for unclaimed bets in the CURRENT round
  const currentRoundId = roundState?.roundId || roundInfo?.currentRoundId || 0;

  // CRITICAL: If userBet is from a different round or from a settled round, ignore it
  // For virtual rounds, ignore any existing userBets (they're from old program rounds)
  const userBetValid = userBet && !roundState?.virtual &&
    userBet.roundId === currentRoundId &&
    !userBet.claimed &&
    (!roundState || !roundState.settled);

  const walletCheck = !publicKey; console.log(userBet)

  // ONLY disable if: wallet not connected, has valid unclaimed bet in current unsettled round, currently betting, or loading
  const disabled = walletCheck || userBetValid || betting || loading;

  const triggerConfetti = () => {
    const colors = isHeads ?
      ['#00d4ff', '#8b5cf6', '#60a5fa'] :
      ['#8b5cf6', '#ec4899', '#a855f7'];

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
      shapes: ['star', 'circle'],
      gravity: 0.8,
      drift: 0.1,
    });

    // Second burst for more excitement
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
    }, 200);

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });
    }, 400);
  };

  const handleBet = async () => {
    const betAmount = parseFloat(amount);
    if (betAmount > 0 && betAmount <= balance && publicKey) {
      try {
        setBetting(true);
        await placeBet(side, betAmount);
        await updateBalance(publicKey);

        // Trigger confetti and sound on successful bet
        triggerConfetti();
        playSound('bet');

        setAmount('');
        setShowInput(false);
      } catch (error) {
        console.error('Error placing bet:', error);
        alert(error.message || 'Failed to place bet');
      } finally {
        setBetting(false);
      }
    }
  };

  const presetAmounts = [0.1, 0.5, 1];

  const estimatedPayout = () => {
    const betAmount = parseFloat(amount) || 0;
    if (betAmount === 0) return 0;

    const totalPot = sideTotal + otherTotal + betAmount;
    const winningSide = sideTotal + betAmount;
    const rake = totalPot * 0.02;
    const jackpotContribution = totalPot * 0.01;
    const winnerPool = totalPot - rake - jackpotContribution;

    return (winnerPool * (betAmount / winningSide)).toFixed(2);
  };

  return (
    <div
      className={`${cardClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      role="region"
      aria-label={`${sideName} betting card`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Neon border glow effect */}
      <div className="flip-card-glow"></div>

      <div className="flip-card-content">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flip-card-icon ${isHeads ? 'heads-icon' : 'tails-icon'}`}
              aria-hidden="true"
            >
              <Icon className={`w-6 h-6 ${textColor}`} />
            </div>
            <div>
              <h3 className={`text-xl font-semibold ${textColor}`}>{sideName}</h3>
            </div>
          </div>

          <div className="text-right">
            <div className="text-caption text-text-muted">Pool</div>
            <div className="text-lg font-bold">{sideTotal.toFixed(2)} SOL</div>
          </div>
        </div>

        {userBet && userBet.side === side && !userBet.claimed && userBet.roundId === roundState?.roundId && !roundState?.virtual ? (
          <div className="space-y-3">
            <div className="flip-bet-display" role="status">
              <div className="text-caption text-text-muted mb-1">Bet</div>
              <div className="text-h2">{userBet.amount.toFixed(2)} SOL</div>
            </div>

            {/* Show transaction hash if this bet matches the last transaction */}
            {lastBetTx && lastBetTx.side === side && (
              <TransactionDisplay
                txHash={lastBetTx.txHash}
                type="bet"
                network={import.meta.env.VITE_SOLANA_NETWORK || 'devnet'}
              />
            )}
          </div>
        ) : !showInput ? (
          <button
            onClick={() => setShowInput(true)}
            disabled={disabled}
            className={`w-full ${buttonClass} py-3 disabled:opacity-30 disabled:cursor-not-allowed`}
            aria-label={`Place bet on ${sideName}`}
            style={{
              background: disabled ? 'rgba(255, 255, 255, 0.05) !important' : undefined,
              opacity: disabled ? '0.3 !important' : '1 !important'
            }}
          >
            {disabled ? (
              walletCheck ? 'Connect Wallet' :
                userBetValid ? 'Already Bet' :
                  betting ? 'Placing...' :
                    loading ? 'Loading...' :
                      'Disabled'
            ) : `Place Bet on ${sideName}`}
          </button>
        ) : (
          <div className="space-y-4" role="form" aria-label={`${sideName} betting form`}>
            <div className="flex gap-2">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className="flex-1 btn-secondary py-2 text-sm"
                  aria-label={`Bet ${preset} SOL`}
                >
                  {preset} SOL
                </button>
              ))}
            </div>

            <div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Custom amount"
                step="0.1"
                min="0.1"
                max={balance}
                className="input"
                aria-label="Custom bet amount in SOL"
                aria-describedby={amount ? "payout-estimate" : undefined}
              />
              {amount && (
                <div id="payout-estimate" className="mt-2 text-caption text-text-muted text-center">
                  Estimated payout: {estimatedPayout()} SOL
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowInput(false);
                  setAmount('');
                }}
                className="flex-1 btn-secondary py-3"
                aria-label="Cancel bet"
              >
                Cancel
              </button>
              <button
                onClick={handleBet}
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance || betting}
                className={`flex-1 ${buttonClass} py-3 disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={`Confirm bet of ${amount || '0'} SOL on ${sideName}`}
              >
                {betting ? 'Placing Bet...' : 'Confirm Bet'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Coin spin preview on hover */}
      {isHovering && !disabled && !showInput && (
        <div className="flip-preview">
          <div className={`preview-coin ${isHeads ? 'heads-preview' : 'tails-preview'}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
};

export default FlipBetCard;