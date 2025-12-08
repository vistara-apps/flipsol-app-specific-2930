import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '../contexts/WalletContext';

const BetCard = ({ side }) => {
  const { roundState, userBet, placeBet } = useGame();
  const { balance, updateBalance } = useWallet();
  const [amount, setAmount] = useState('');
  const [showInput, setShowInput] = useState(false);

  const isHeads = side === 0;
  const sideName = isHeads ? 'Heads' : 'Tails';
  const sideTotal = isHeads ? roundState.headsTotal : roundState.tailsTotal;
  const otherTotal = isHeads ? roundState.tailsTotal : roundState.headsTotal;
  const Icon = isHeads ? ArrowUp : ArrowDown;
  const bgColor = isHeads ? 'from-heads/20 to-heads/5' : 'from-tails/20 to-tails/5';
  const borderColor = isHeads ? 'border-heads/30' : 'border-tails/30';
  const textColor = isHeads ? 'text-heads' : 'text-tails';
  const buttonBg = isHeads ? 'bg-heads hover:bg-heads/90' : 'bg-tails hover:bg-tails/90';

  const disabled = userBet !== null || roundState.settled;

  const handleBet = () => {
    const betAmount = parseFloat(amount);
    if (betAmount > 0 && betAmount <= balance) {
      placeBet(side, betAmount);
      updateBalance(balance - betAmount);
      setAmount('');
      setShowInput(false);
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
    <div className={`card bg-gradient-to-br ${bgColor} border ${borderColor} ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${isHeads ? 'bg-heads/20' : 'bg-tails/20'} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${textColor}`} />
          </div>
          <div>
            <h3 className={`text-xl sm:text-2xl font-bold ${textColor}`}>{sideName}</h3>
            <p className="text-xs sm:text-sm text-text-muted">Choose your side</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs sm:text-sm text-text-muted">Total Bets</div>
          <div className="text-lg sm:text-xl font-bold">{sideTotal.toFixed(2)} SOL</div>
        </div>
      </div>

      {userBet && userBet.side === side ? (
        <div className="bg-surface-hover rounded-xl p-4 text-center">
          <div className="text-sm text-text-muted mb-1">Your Bet</div>
          <div className="text-2xl font-bold">{userBet.amount.toFixed(2)} SOL</div>
        </div>
      ) : !showInput ? (
        <button
          onClick={() => setShowInput(true)}
          disabled={disabled}
          className={`w-full ${buttonBg} text-white font-semibold py-3 sm:py-4 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Place Bet on {sideName}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className="flex-1 btn-secondary py-2 text-sm"
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
              className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {amount && (
              <div className="mt-2 text-sm text-text-muted text-center">
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
            >
              Cancel
            </button>
            <button
              onClick={handleBet}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
              className={`flex-1 ${buttonBg} text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Confirm Bet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BetCard;