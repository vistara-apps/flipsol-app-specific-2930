import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { Settings, Play, Square } from 'lucide-react';

const RoundSettlementStatus = ({ resultsRevealed = true }) => {
  const {
    roundState,
    loading,
    error,
    closeRound,
    getCurrentRoundInfo
  } = useGame();

  const { publicKey } = useWallet();
  const [isManualSettling, setIsManualSettling] = useState(false);

  const handleManualSettle = async () => {
    if (!roundState || roundState.settled) return;

    try {
      setIsManualSettling(true);
      await closeRound();
    } catch (err) {
      console.error('Manual settlement failed:', err);
    } finally {
      setIsManualSettling(false);
    }
  };

  if (!roundState) {
    return (
      <div className="settlement-status-container">
        <div className="settlement-status waiting">
          <Play size={16} className="text-yellow-400" />
          <span className="status-text">Waiting for Round</span>
        </div>
      </div>
    );
  }

  const roundInfo = getCurrentRoundInfo ? getCurrentRoundInfo() : null;
  const totalPot = (roundState.headsTotal + roundState.tailsTotal) / 1_000_000_000;
  const hasBets = roundState.headsTotal > 0 || roundState.tailsTotal > 0;

  // Determine settlement status
  let statusIcon, statusText, statusColor, canManualSettle = false;

  if (roundState.settled) {
    statusIcon = <Square size={16} className="text-green-400" />;

    if (resultsRevealed) {
      const winnerName = roundState.winningSide === 0 ? "HEADS" : "TAILS";
      statusText = `Round #${roundState.roundId} Ended | ${winnerName} WON!`;
    } else {
      statusText = `Round #${roundState.roundId} Settled - Revealing...`;
    }

    statusColor = "settled";
  } else if (roundInfo?.isBreakPhase && hasBets) {
    statusIcon = <Settings size={16} className="text-orange-400 animate-spin" />;
    statusText = `Round #${roundState.roundId} Settling...`;
    statusColor = "settling";
    canManualSettle = true;
  } else if (roundInfo?.isBettingPhase) {
    statusIcon = <Play size={16} className="text-cyan-400" />;
    statusText = `Round #${roundState.roundId} Active`;
    statusColor = "active";
  } else {
    statusIcon = <Settings size={16} className="text-gray-400" />;
    statusText = `Round #${roundState.roundId} Break`;
    statusColor = "break";
  }

  return (
    <div className="settlement-status-container">
      <div className={`settlement-status ${statusColor}`}>
        {statusIcon}
        <div className="status-info">
          <span className="status-text">{statusText}</span>
          {totalPot > 0 && (
            <span className="status-pot">{totalPot.toFixed(3)} SOL</span>
          )}
        </div>

        {canManualSettle && publicKey && (
          <button
            onClick={handleManualSettle}
            disabled={loading || isManualSettling}
            className="manual-settle-btn"
            title="Manually trigger settlement"
          >
            {isManualSettling ? (
              <Settings size={14} className="animate-spin" />
            ) : (
              <Square size={14} />
            )}
            Settle
          </button>
        )}
      </div>

      {error && (
        <div className="settlement-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default RoundSettlementStatus;