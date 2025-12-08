import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const Leaderboard = () => {
  const { leaderboard } = useGame();

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return { 
          icon: <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-jackpot" />,
          label: 'Gold medal - First place',
          color: 'text-jackpot'
        };
      case 2:
        return { 
          icon: <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-text-muted" />,
          label: 'Silver medal - Second place',
          color: 'text-text-muted'
        };
      case 3:
        return { 
          icon: <Award className="w-5 h-5 sm:w-6 sm:h-6 text-tails" />,
          label: 'Bronze medal - Third place',
          color: 'text-tails'
        };
      default:
        return { 
          icon: <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs sm:text-sm font-bold">{rank}</div>,
          label: `Rank ${rank}`,
          color: 'text-text'
        };
    }
  };

  const getBorderClass = (rank) => {
    if (rank === 1) return 'border-2 border-jackpot/50';
    if (rank === 2) return 'border-2 border-text-muted/30';
    if (rank === 3) return 'border-2 border-tails/50';
    return '';
  };

  return (
    <div 
      className="space-y-md"
      role="region"
      aria-label="Leaderboard"
    >
      {leaderboard.map((player, index) => {
        const rankInfo = getRankIcon(player.rank);
        
        return (
          <article
            key={player.address}
            className={`card hover:bg-surface-hover transition-colors duration-fast ${getBorderClass(player.rank)}`}
            aria-label={`${rankInfo.label}: ${player.address} with ${player.totalWon.toFixed(2)} SOL won`}
          >
            <div className="flex items-center justify-between gap-md">
              <div className="flex items-center gap-3 sm:gap-md">
                <div 
                  className="flex-shrink-0"
                  aria-hidden="true"
                >
                  {rankInfo.icon}
                </div>
                <div>
                  <div className="text-mono font-semibold">{player.address}</div>
                  <div className="text-caption text-text-muted">Rank #{player.rank}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg sm:text-2xl font-bold text-accent">
                  {player.totalWon.toFixed(2)} SOL
                </div>
                <div className="text-caption text-text-muted">Total Won</div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default Leaderboard;