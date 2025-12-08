import React from 'react';
import { ArrowUp, ArrowDown, Trophy, Clock } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const History = () => {
  const { history } = useGame();

  if (history.length === 0) {
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