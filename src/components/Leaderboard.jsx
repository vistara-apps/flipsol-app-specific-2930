import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const Leaderboard = () => {
  const { leaderboard } = useGame();

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-jackpot" />;
      case 2:
        return <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-text-muted" />;
      case 3:
        return <Award className="w-5 h-5 sm:w-6 sm:h-6 text-tails" />;
      default:
        return <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs sm:text-sm font-bold">{rank}</div>;
    }
  };

  return (
    <div className="space-y-4">
      {leaderboard.map((player) => (
        <div
          key={player.address}
          className={`card hover:bg-surface-hover transition-colors ${
            player.rank <= 3 ? 'border-2' : ''
          } ${
            player.rank === 1 ? 'border-jackpot/50' :
            player.rank === 2 ? 'border-text-muted/50' :
            player.rank === 3 ? 'border-tails/50' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                {getRankIcon(player.rank)}
              </div>
              <div>
                <div className="font-mono text-sm sm:text-base font-semibold">{player.address}</div>
                <div className="text-xs sm:text-sm text-text-muted">Rank #{player.rank}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg sm:text-2xl font-bold text-accent">{player.totalWon.toFixed(2)} SOL</div>
              <div className="text-xs sm:text-sm text-text-muted">Total Won</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Leaderboard;