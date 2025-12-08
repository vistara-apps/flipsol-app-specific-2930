import React from 'react';
import { ArrowUp, ArrowDown, Trophy, Clock } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const History = () => {
  const { history } = useGame();

  if (history.length === 0) {
    return (
      <div className="card text-center py-12">
        <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg sm:text-xl font-bold mb-2">No History Yet</h3>
        <p className="text-sm sm:text-base text-text-muted">
          Play your first round to see history here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((round) => {
        const winningSide = round.winningSide === 0 ? 'Heads' : 'Tails';
        const Icon = round.winningSide === 0 ? ArrowUp : ArrowDown;
        const color = round.winningSide === 0 ? 'heads' : 'tails';
        const date = new Date(round.timestamp).toLocaleString();

        return (
          <div key={round.roundId} className="card hover:bg-surface-hover transition-colors">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-${color}/20 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 sm:w-7 sm:h-7 text-${color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold">Round #{round.roundId}</h3>
                    {round.jackpotTriggered && (
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-jackpot" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-text-muted">{date}</p>
                </div>
              </div>
              
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div className="text-xs sm:text-sm text-text-muted">Winner: {winningSide}</div>
                <div className="text-lg sm:text-xl font-bold">{round.totalPot.toFixed(2)} SOL</div>
                {round.jackpotTriggered && (
                  <div className="text-xs sm:text-sm text-jackpot">🎉 Jackpot Hit!</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default History;