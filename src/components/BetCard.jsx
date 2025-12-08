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
  const cardClass = isHeads ? 'card-heads' : 'card-tails';
  const textColor = isHeads ? 'text-heads' : 'text-tails';
  const buttonClass = isHeads ? 'btn-heads' : 'btn-tails';

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
    <div 
      className={`${cardClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      role="region"
      aria-label={`${sideName} betting card`}
    >
      <div className="flex items-center justify-between mb-lg">
        <div className="flex items-center gap-3">
          <div 
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${isHeads ? 'bg-heads/20' : 'bg-tails/20'} flex items-center justify-center`}
            aria-hidden="true"
          >
            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${textColor}`} />
          </div>
          <div>
            <h3 className={`text-h2 ${textColor}`}>{sideName}</h3>
            <p className="text-caption text-text-muted">Choose your side</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-caption text-text-muted">Total Bets</div>
          <div className="text-lg sm:text-xl font-bold">{sideTotal.toFixed(2)} SOL</div>
        </div>
      </div>

      {userBet && userBet.side === side ? (
        <div className="bg-surface-hover rounded-lg p-md text-center" role="status">
          <div className="text-caption text-text-muted mb-1">Your Bet</div>
          <div className="text-h2">{userBet.amount.toFixed(2)} SOL</div>
        </div>
      ) : !showInput ? (
        <button
          onClick={() => setShowInput(true)}
          disabled={disabled}
          className={`w-full ${buttonClass} py-3 sm:py-4 disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={`Place bet on ${sideName}`}
        >
          Place Bet on {sideName}
        </button>
      ) : (
        <div className="space-y-md" role="form" aria-label={`${sideName} betting form`}>
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
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
              className={`flex-1 ${buttonClass} py-3 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Confirm bet of ${amount || '0'} SOL on ${sideName}`}
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