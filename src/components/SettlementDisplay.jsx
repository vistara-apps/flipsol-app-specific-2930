import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trophy, Zap } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import confetti from 'canvas-confetti';

const SettlementDisplay = ({ roundResult, userBet, onClose }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    if (roundResult && userBet && roundResult.winningSide === userBet.side) {
      // User won - trigger winner confetti
      setShowConfetti(true);
      triggerWinnerConfetti();
    }
  }, [roundResult, userBet]);

  const triggerWinnerConfetti = () => {
    // Gold confetti for winners
    const goldenConfetti = () => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#FFD700', '#FFA500', '#FFFF00', '#FF6347'],
        shapes: ['star'],
        gravity: 0.6,
        drift: 0.1,
        scalar: 1.2,
      });
    };

    goldenConfetti();
    setTimeout(goldenConfetti, 300);
    setTimeout(goldenConfetti, 600);
  };

  if (!roundResult) return null;

  const winningSideText = roundResult.winningSide === 0 ? 'Heads' : 'Tails';
  const WinningIcon = roundResult.winningSide === 0 ? ArrowUp : ArrowDown;
  const winningColor = roundResult.winningSide === 0 ? 'text-heads' : 'text-tails';
  const winningBg = roundResult.winningSide === 0 ? 'bg-heads/20' : 'bg-tails/20';
  
  const userWon = userBet && roundResult.winningSide === userBet.side;
  const userLost = userBet && roundResult.winningSide !== userBet.side;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-2xl p-8 max-w-lg w-full text-center">
        {/* Winner Announcement */}
        <div className={`w-20 h-20 rounded-full ${winningBg} flex items-center justify-center mx-auto mb-6`}>
          <WinningIcon className={`w-10 h-10 ${winningColor}`} />
        </div>
        
        <h2 className="text-3xl font-bold mb-2">Round Complete!</h2>
        <p className="text-xl mb-6">
          <span className={winningColor + ' font-bold'}>{winningSideText}</span> wins!
        </p>

        {/* Round Stats */}
        <div className="bg-bg rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-text-muted">Total Pot</div>
              <div className="font-bold">{roundResult.totalPot.toFixed(3)} SOL</div>
            </div>
            <div>
              <div className="text-text-muted">Winners Share</div>
              <div className="font-bold">{roundResult.winnerPool.toFixed(3)} SOL</div>
            </div>
            <div>
              <div className="text-heads">Heads Total</div>
              <div className="font-bold">{roundResult.headsTotal.toFixed(3)} SOL</div>
            </div>
            <div>
              <div className="text-tails">Tails Total</div>
              <div className="font-bold">{roundResult.tailsTotal.toFixed(3)} SOL</div>
            </div>
          </div>
        </div>

        {/* User Result */}
        {userBet && (
          <div className={`rounded-lg p-4 mb-6 ${
            userWon ? 'bg-green-900/30 border border-green-500/30' : 
            userLost ? 'bg-red-900/30 border border-red-500/30' : 
            'bg-surface-hover'
          }`}>
            {userWon && (
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 text-yellow-400 mr-2" />
                <span className="text-xl font-bold text-green-400">You Won!</span>
              </div>
            )}
            {userLost && (
              <div className="text-xl font-bold text-red-400 mb-2">You Lost</div>
            )}
            
            <div className="text-sm text-text-muted mb-1">Your Bet</div>
            <div className="font-bold mb-2">
              {userBet.amount.toFixed(3)} SOL on {userBet.side === 0 ? 'Heads' : 'Tails'}
            </div>
            
            {userWon && (
              <>
                <div className="text-sm text-text-muted mb-1">Your Winnings</div>
                <div className="text-2xl font-bold text-green-400">
                  +{roundResult.userWinnings?.toFixed(3) || '0.000'} SOL
                </div>
              </>
            )}
          </div>
        )}

        {/* Jackpot notification if triggered */}
        {roundResult.jackpotTriggered && (
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-6 h-6 text-yellow-400 mr-2" />
              <span className="text-xl font-bold text-yellow-400">JACKPOT TRIGGERED!</span>
            </div>
            <div className="text-sm text-text-muted">
              {roundResult.jackpotAmount?.toFixed(3)} SOL added to winner pool!
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full btn-primary py-4 text-lg font-bold"
        >
          Continue Playing
        </button>
      </div>
    </div>
  );
};

export default SettlementDisplay;