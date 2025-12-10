import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWallet as useCustomWallet } from '../contexts/WalletContext';
import confetti from 'canvas-confetti';
import { useSound } from '../hooks/useSound';
import TransactionDisplay from './TransactionDisplay';

const UnifiedBettingCard = () => {
  const { roundState, userBet, placeBet, loading, getCurrentRoundInfo, lastBetTx, usersOnline } = useGame();
  const { publicKey } = useWallet();
  const { balance, updateBalance } = useCustomWallet();
  const { playSound } = useSound();
  const [selectedSide, setSelectedSide] = useState(null); // 0 = Heads, 1 = Tails
  const [amount, setAmount] = useState('');
  const [betting, setBetting] = useState(false);
  const [justBet, setJustBet] = useState(false);

  const roundInfo = getCurrentRoundInfo ? getCurrentRoundInfo() : null;
  const currentRoundId = roundState?.roundId || roundInfo?.currentRoundId || 0;

  // Check if user has valid bet
  const userBetValid = userBet && !roundState?.virtual &&
    userBet.roundId === currentRoundId &&
    !userBet.claimed &&
    (!roundState || !roundState.settled);

  const walletCheck = !publicKey;
  const disabled = walletCheck || userBetValid || betting || loading;

  const headsTotal = roundState ? roundState.headsTotal : 0;
  const tailsTotal = roundState ? roundState.tailsTotal : 0;
  const totalPot = (headsTotal + tailsTotal) / 1_000_000_000; // Convert lamports to SOL

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00d4ff', '#8b5cf6', '#ec4899'],
      shapes: ['star', 'circle'],
    });
  };

  const handleBet = async () => {
    if (selectedSide === null || !amount) return;

    const betAmount = parseFloat(amount);
    if (betAmount > 0 && betAmount <= balance && publicKey) {
      try {
        setBetting(true);
        await placeBet(selectedSide, betAmount);
        await updateBalance(publicKey);

        triggerConfetti();
        playSound('bet');
        setJustBet(true);
        setTimeout(() => setJustBet(false), 500);

        setAmount('');
        setSelectedSide(null);
      } catch (error) {
        console.error('Error placing bet:', error);
        alert(error.message || 'Failed to place bet');
      } finally {
        setBetting(false);
      }
    }
  };

  const presetAmounts = [0.1, 0.5, 1];

  return (
    <div className={`unified-betting-card ${justBet ? 'ring-4 ring-offset-2 ring-accent scale-105 transition-all duration-300' : ''}`}>
      {/* Header with pot info */}
      <div className="betting-header">
        <div className="pot-display">
          <span className="pot-label">Total Pot</span>
          <span className="pot-amount">{totalPot.toFixed(2)} SOL</span>
        </div>
        {usersOnline > 0 && (
          <div className="users-online-display">
            <span className="users-icon">👥</span>
            <span className="users-count">{usersOnline}</span>
          </div>
        )}
      </div>

      {/* Side Selection */}
      <div className="side-selection">
        <button
          className={`side-button heads-button ${selectedSide === 0 ? 'selected' : ''}`}
          onClick={() => setSelectedSide(0)}
          disabled={disabled}
        >
          <ArrowUp className="w-5 h-5" />
          <span>Heads</span>
          <span className="side-pool">{(headsTotal / 1_000_000_000).toFixed(2)} SOL</span>
        </button>

        <button
          className={`side-button tails-button ${selectedSide === 1 ? 'selected' : ''}`}
          onClick={() => setSelectedSide(1)}
          disabled={disabled}
        >
          <ArrowDown className="w-5 h-5" />
          <span>Tails</span>
          <span className="side-pool">{(tailsTotal / 1_000_000_000).toFixed(2)} SOL</span>
        </button>
      </div>

      {/* Show current bet if exists */}
      {userBetValid && (
        <div className="current-bet-display">
          <div className="current-bet-info">
            <span>Your Bet: {userBet.amount.toFixed(2)} SOL on {userBet.side === 0 ? 'Heads' : 'Tails'}</span>
          </div>
          {lastBetTx && (
            <TransactionDisplay
              txHash={lastBetTx.txHash}
              type="bet"
              network={import.meta.env.VITE_SOLANA_NETWORK || 'devnet'}
            />
          )}
        </div>
      )}

      {/* Betting input (only show if side selected and no current bet) */}
      {selectedSide !== null && !userBetValid && (
        <div className="betting-input">
          {/* Preset amounts */}
          <div className="preset-amounts">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className="preset-button"
                disabled={disabled}
              >
                {preset} SOL
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Custom amount"
            step="0.1"
            min="0.1"
            max={balance}
            className="amount-input"
            disabled={disabled}
          />

          {/* Bet button */}
          <button
            onClick={handleBet}
            disabled={disabled || !amount || parseFloat(amount) <= 0}
            className={`place-bet-button ${selectedSide === 0 ? 'heads-bet' : 'tails-bet'}`}
          >
            {betting ? 'Placing Bet...' :
              disabled ?
                (walletCheck ? 'Connect Wallet' : 'Already Bet') :
                `Bet ${amount || '0'} SOL on ${selectedSide === 0 ? 'Heads' : 'Tails'}`}
          </button>
        </div>
      )}

      {/* Initial call to action */}
      {selectedSide === null && !userBetValid && (
        <div className="select-side-prompt">
          <p>Choose Heads or Tails to place your bet</p>
        </div>
      )}
    </div>
  );
};

export default UnifiedBettingCard;