import React, { useState, useEffect } from 'react';
import { useSSE } from '../hooks/useSSE';
import { useGame } from '../contexts/GameContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { History, X, Crown, Skull, Gift, RefreshCcw } from 'lucide-react';
import { getUserBetPDA } from '../lib/anchor';

const CoinTossHistory = () => {
  const { isConnected, events } = useSSE();
  const { claimWinnings, history, userBet, roundState, program } = useGame();
  const { publicKey } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [claimableRounds, setClaimableRounds] = useState({});
  const [isChecking, setIsChecking] = useState(false);

  // Load history from local storage on mount
  const [coinHistory, setCoinHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('flipsol_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Verify claimable winnings from on-chain data
  const checkClaims = async () => {
    if (!program || !publicKey) return;

    setIsChecking(true);
    const checks = {};

    // Check top 25 rounds
    const roundsToCheck = coinHistory
      .filter(r => r.isOnchain || r.roundId)
      .slice(0, 25);

    try {
      await Promise.all(roundsToCheck.map(async (round) => {
        try {
          const [pda] = await getUserBetPDA(publicKey, round.roundId);
          // fetchNullable is faster than try/catch
          const betAccount = await program.account.userBet.fetchNullable(pda);

          if (betAccount) {
            const isWinner = betAccount.side === round.winner;
            if (!betAccount.claimed && isWinner) {
              checks[round.roundId] = true;
            }
          }
        } catch (e) {
          // ignore error
        }
      }));

      setClaimableRounds(prev => ({ ...prev, ...checks }));
    } catch (error) {
      console.error("Error checking claims:", error);
    } finally {
      setIsChecking(false);
    }
  };

  // Check claims once when opening logic could go here, but kept manual for responsiveness

  // Save to local storage whenever history updates
  useEffect(() => {
    localStorage.setItem('flipsol_history', JSON.stringify(coinHistory));
  }, [coinHistory]);

  // Sync with GameContext history
  useEffect(() => {
    if (history && history.length > 0) {
      const recentHistory = history
        .filter(round => round.settled && round.winner !== null)
        .slice(0, 25) // Take newest 25
        .map(round => ({
          roundId: round.roundId,
          winner: round.winner,
          winnerName: round.winner === 0 ? 'HEADS' : 'TAILS',
          pot: (round.headsTotal + round.tailsTotal) || 0,
          timestamp: round.timestamp || round.settledAt || new Date().toISOString(),
          isOnchain: true
        }));

      setCoinHistory(recentHistory);
    }
  }, [history]);

  // Listen for real-time round settlements
  useEffect(() => {
    const handleRoundSettlement = (event) => {
      const data = event.detail;
      setCoinHistory(prev => {
        if (prev.some(r => r.roundId === data.roundId)) return prev;

        return [{
          roundId: data.roundId,
          winner: data.winningSide,
          winnerName: data.winner || (data.winningSide === 0 ? 'HEADS' : 'TAILS'),
          pot: data.pot || 0,
          timestamp: new Date().toISOString(),
          isOnchain: true
        }, ...prev].slice(0, 50);
      });
    };

    window.addEventListener('round_settled', handleRoundSettlement);
    const handleTestCoinToss = (event) => {
      const data = event.detail;
      setCoinHistory(prev => [{
        roundId: data.roundId,
        winner: data.winningSide,
        winnerName: data.winner,
        pot: data.pot || 0,
        timestamp: new Date().toISOString(),
        isTest: true
      }, ...prev].slice(0, 50));
    };
    window.addEventListener('testCoinToss', handleTestCoinToss);

    return () => {
      window.removeEventListener('round_settled', handleRoundSettlement);
      window.removeEventListener('testCoinToss', handleTestCoinToss);
    };
  }, []);

  const canClaimRound = (roundId) => !!claimableRounds[roundId];

  const handleClaim = async (roundId) => {
    try {
      await claimWinnings(roundId);
      // Remove from claimable list upon success optimization
      setClaimableRounds(prev => {
        const next = { ...prev };
        delete next[roundId];
        return next;
      });
    } catch (error) {
      console.error('Failed to claim winnings:', error);
    }
  };

  const CoinIcon = ({ winner, size = "w-6 h-6" }) => {
    return (
      <div className={`${size} rounded-full flex items-center justify-center ${winner === 0
        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900'
        : 'bg-gradient-to-br from-purple-500 to-purple-700 text-white'
        } shadow-lg border-2 border-white/20`}>
        {winner === 0 ? (
          <Crown className="w-3 h-3" />
        ) : (
          <Skull className="w-3 h-3" />
        )}
      </div>
    );
  };

  const AnalyticsChart = ({ data }) => {
    if (!data || data.length < 2) return null;

    const chartData = [...data].sort((a, b) => Number(a.roundId) - Number(b.roundId)).slice(-20);
    const maxPot = Math.max(...chartData.map(d => d.pot || 0), 1);
    const width = 300;
    const height = 100;
    const barWidth = (width / chartData.length) - 2;

    return (
      <div className="mb-4 p-3 bg-black/40 rounded-lg border border-amber-900/30">
        <h4 className="text-xs font-semibold text-amber-500 mb-2 uppercase tracking-wider">Trend Analysis</h4>
        <div className="flex gap-4 text-xs text-gray-400 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Heads
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div> Tails
          </div>
        </div>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <line x1="0" y1={height} x2={width} y2={height} stroke="#333" strokeWidth="1" />
          {chartData.map((d, i) => {
            const barHeight = (d.pot / maxPot) * (height - 10);
            const x = i * (width / chartData.length);
            const color = d.winner === 0 ? '#eab308' : '#a855f7';
            return (
              <g key={i}>
                <rect x={x} y={height - barHeight} width={barWidth} height={barHeight} fill={color} opacity="0.8" rx="2" />
                <circle cx={x + barWidth / 2} cy={height - barHeight - 4} r="1.5" fill="#fff" opacity="0.5" />
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[9998] flex items-end gap-2">
        <div className="flex gap-1 flex-col-reverse">
          {coinHistory.slice(0, 5).map((result, idx) => (
            <div
              key={result.roundId || idx}
              className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer transform hover:scale-110"
              onClick={() => setIsOpen(true)}
            >
              <CoinIcon winner={result.winner} size="w-4 h-4" />
            </div>
          ))}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all shadow-lg backdrop-blur-md
                     bg-amber-900/40 border-amber-400/60 text-amber-200 hover:bg-amber-900/60"
        >
          <History className="w-4 h-4" />
          <span className="text-sm font-semibold">Croupier</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-end p-4">
          <div className="bg-black/40 absolute inset-0" onClick={() => setIsOpen(false)} />

          <div className="relative bg-black/95 border-2 border-amber-600 rounded-lg p-6 max-h-[80vh] w-96 overflow-y-auto shadow-2xl backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-600/30">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-amber-200">Croupier's Log</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-amber-400 hover:text-amber-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-500/30 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-amber-300">
                  {isConnected ? 'LIVE' : 'OFFLINE'} • {coinHistory.length} flips
                </span>
              </div>
              <button
                onClick={checkClaims}
                disabled={isChecking}
                className="flex items-center gap-1.5 px-2 py-1 bg-amber-900/50 hover:bg-amber-900/80 border border-amber-600/50 rounded text-xs text-amber-300 transition-all disabled:opacity-50"
              >
                <RefreshCcw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Scanning...' : 'Scan Wins'}
              </button>
            </div>

            <AnalyticsChart data={coinHistory} />

            <div className="space-y-3 flex-1 overflow-y-auto">
              {coinHistory.length === 0 ? (
                <div className="text-center py-8 text-amber-400/70">No coin flips recorded yet</div>
              ) : (
                coinHistory.slice().sort((a, b) => Number(b.roundId) - Number(a.roundId)).map((result, idx) => {
                  const canClaim = canClaimRound(result.roundId);
                  return (
                    <div
                      key={result.roundId || idx}
                      className={`flex items-center gap-3 p-3 rounded-lg border 
                                 ${canClaim ? 'border-green-500/50 bg-green-900/20' : 'border-amber-500/20 bg-gradient-to-r from-amber-900/10 to-amber-800/10'}`}
                    >
                      <CoinIcon winner={result.winner} size="w-8 h-8" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-200">Round #{result.roundId}</span>
                          {canClaim && (
                            <span className="px-1.5 py-0.5 bg-green-500 text-black text-xs font-bold rounded animate-pulse">WINNER</span>
                          )}
                          {!canClaim && result.isOnchain && (
                            <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded">ONCHAIN</span>
                          )}
                        </div>
                        <div className="text-sm text-amber-300">
                          {result.winnerName} wins
                          {result.pot > 0 && <span className="text-amber-400"> • {result.pot.toFixed(3)} SOL</span>}
                        </div>
                        <div className="text-xs text-amber-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {canClaim && (
                        <button
                          onClick={() => handleClaim(result.roundId)}
                          className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-500 
                                     text-white text-xs rounded-lg transition-all font-bold shadow-lg shadow-green-900/50"
                          title="Claim your winnings"
                        >
                          <Gift className="w-3 h-3" />
                          Claim
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CoinTossHistory;