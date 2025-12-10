import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWallet as useCustomWallet } from '../contexts/WalletContext';
import confetti from 'canvas-confetti';
import { useSound } from '../hooks/useSound';
import TransactionDisplay from './TransactionDisplay';

const PokerBetCard = ({ side }) => {
  const { roundState, userBet, placeBet, loading, getCurrentRoundInfo, lastBetTx } = useGame();
  const { publicKey } = useWallet();
  const { balance, updateBalance } = useCustomWallet();
  const { playSound } = useSound();
  const [amount, setAmount] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [betting, setBetting] = useState(false);

  const isHeads = side === 0;
  const sideName = isHeads ? 'Heads' : 'Tails';
  const sideTotal = roundState ? (isHeads ? roundState.headsTotal : roundState.tailsTotal) : 0;
  const otherTotal = roundState ? (isHeads ? roundState.tailsTotal : roundState.headsTotal) : 0;
  const Icon = isHeads ? ArrowUp : ArrowDown;

  const roundInfo = getCurrentRoundInfo ? getCurrentRoundInfo() : null;
  
  const userBetCheck = userBet !== null && !userBet.claimed;
  const walletCheck = !publicKey;
  const disabled = walletCheck || userBetCheck || betting || loading;

  const triggerConfetti = () => {
    const colors = isHeads ? ['#3b82f6', '#1d4ed8', '#60a5fa'] : ['#ea580c', '#c2410c', '#fb923c'];
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
      shapes: ['star', 'circle'],
      gravity: 0.8,
      drift: 0.1,
    });
  };

  const handleBet = async () => {
    const betAmount = parseFloat(amount);
    if (betAmount > 0 && betAmount <= balance && publicKey) {
      try {
        setBetting(true);
        await placeBet(side, betAmount);
        await updateBalance(publicKey);
        
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
      className={`poker-bet-card ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      role="region"
      aria-label={`${sideName} betting card`}
    >
      {/* Casino Chip Icon */}
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
        <div className={`poker-chip ${isHeads ? 'heads' : ''}`}>
          <Icon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white z-10" />
        </div>
      </div>

      <div className="flex flex-col h-full justify-between pt-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-casino-gold mb-1">{sideName}</h3>
          <p className="text-sm text-luxury-platinum opacity-80">Place Your Bet</p>
        </div>

        {/* Total Bets Display */}
        <div className="text-center mb-4 bg-black bg-opacity-30 rounded-lg py-3 px-4">
          <div className="text-xs text-luxury-platinum opacity-70 mb-1">Total Pool</div>
          <div className="text-xl font-bold text-casino-gold">{sideTotal.toFixed(2)} SOL</div>
        </div>

        {userBet && userBet.side === side && !userBet.claimed ? (
          <div className="space-y-3">
            <div className="bg-black bg-opacity-40 rounded-lg p-4 text-center border border-casino-gold border-opacity-30">
              <div className="text-xs text-luxury-platinum opacity-70 mb-1">Your Bet</div>
              <div className="text-lg font-bold text-casino-gold">{userBet.amount.toFixed(2)} SOL</div>
            </div>
            
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
            className={`w-full py-3 px-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              isHeads ? 'btn-heads' : 'btn-tails'
            } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
            aria-label={`Place bet on ${sideName}`}
          >
            {disabled ? (
              walletCheck ? 'Connect Wallet' :
              userBetCheck ? 'Already Bet' :
              betting ? 'Placing...' :
              loading ? 'Loading...' :
              'Disabled'
            ) : `Bet on ${sideName}`}
          </button>
        ) : (
          <div className="space-y-3" role="form" aria-label={`${sideName} betting form`}>
            {/* Preset amounts */}
            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className="bg-surface-hover hover:bg-surface border border-casino-gold border-opacity-30 
                           rounded-lg py-2 text-sm font-semibold text-casino-gold transition-all duration-200
                           hover:border-opacity-60 hover:shadow-lg"
                  aria-label={`Bet ${preset} SOL`}
                >
                  {preset} SOL
                </button>
              ))}
            </div>
            
            {/* Custom amount input */}
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Custom amount"
              step="0.1"
              min="0.1"
              max={balance}
              className="w-full bg-black bg-opacity-40 border border-casino-gold border-opacity-30 
                       rounded-lg px-3 py-2 text-center text-casino-gold placeholder-luxury-platinum 
                       placeholder-opacity-50 focus:border-opacity-80 focus:outline-none"
              aria-label="Custom bet amount in SOL"
            />
            
            {amount && (
              <div className="text-center text-xs text-luxury-platinum opacity-70">
                Estimated payout: {estimatedPayout()} SOL
              </div>
            )}
            
            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setShowInput(false);
                  setAmount('');
                }}
                className="py-2 px-3 rounded-lg border border-luxury-platinum border-opacity-30 
                         text-luxury-platinum text-sm font-semibold hover:bg-surface-hover 
                         transition-all duration-200"
                aria-label="Cancel bet"
              >
                Cancel
              </button>
              <button
                onClick={handleBet}
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance || betting}
                className={`py-2 px-3 rounded-lg text-sm font-bold transition-all duration-200
                          ${isHeads ? 'bg-heads text-white' : 'bg-tails text-white'}
                          disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={`Confirm bet of ${amount || '0'} SOL on ${sideName}`}
              >
                {betting ? 'Placing...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PokerBetCard;