import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const GameContext = createContext(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [roundState, setRoundState] = useState({
    roundId: 1,
    headsTotal: 0,
    tailsTotal: 0,
    endsAt: Date.now() + 60000, // 60 seconds from now
    settled: false,
    winningSide: null,
    jackpotTriggered: false,
  });
  const [userBet, setUserBet] = useState(null);
  const [jackpotPool, setJackpotPool] = useState(12.5);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([
    { address: 'Fg6P...aB9x', totalWon: 45.2, rank: 1 },
    { address: 'Hj8K...cD3z', totalWon: 38.7, rank: 2 },
    { address: 'Lm2N...eF5w', totalWon: 31.4, rank: 3 },
  ]);
  const [timeLeft, setTimeLeft] = useState(60);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((roundState.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0 && !roundState.settled) {
        settleRound();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roundState]);

  const placeBet = useCallback((side, amount) => {
    setUserBet({ side, amount, claimed: false });
    
    setRoundState(prev => ({
      ...prev,
      headsTotal: side === 0 ? prev.headsTotal + amount : prev.headsTotal,
      tailsTotal: side === 1 ? prev.tailsTotal + amount : prev.tailsTotal,
    }));
  }, []);

  const settleRound = useCallback(() => {
    // Provably fair randomness simulation
    const randomValue = Math.random();
    const winningSide = randomValue > 0.5 ? 0 : 1; // 0 = Heads, 1 = Tails
    const jackpotTriggered = Math.random() < 0.01; // 1% chance
    
    const totalPot = roundState.headsTotal + roundState.tailsTotal;
    const rake = totalPot * 0.02; // 2% rake
    const jackpotContribution = totalPot * 0.01; // 1% to jackpot
    
    setRoundState(prev => ({
      ...prev,
      settled: true,
      winningSide,
      jackpotTriggered,
    }));

    if (jackpotTriggered) {
      setJackpotPool(0);
    } else {
      setJackpotPool(prev => prev + jackpotContribution);
    }

    // Add to history
    setHistory(prev => [{
      roundId: roundState.roundId,
      winningSide,
      totalPot,
      jackpotTriggered,
      timestamp: Date.now(),
    }, ...prev].slice(0, 100));
  }, [roundState]);

  const claimWinnings = useCallback(() => {
    if (!userBet || userBet.claimed || roundState.winningSide !== userBet.side) {
      return 0;
    }

    const totalPot = roundState.headsTotal + roundState.tailsTotal;
    const winningTotal = roundState.winningSide === 0 ? roundState.headsTotal : roundState.tailsTotal;
    const userShare = userBet.amount / winningTotal;
    const rake = totalPot * 0.02;
    const jackpotContribution = totalPot * 0.01;
    const winnerPool = totalPot - rake - jackpotContribution;
    
    let payout = winnerPool * userShare;
    
    if (roundState.jackpotTriggered) {
      payout += jackpotPool * userShare;
    }

    setUserBet(prev => ({ ...prev, claimed: true }));
    return payout;
  }, [userBet, roundState, jackpotPool]);

  const startNewRound = useCallback(() => {
    setCurrentRound(prev => prev + 1);
    setRoundState({
      roundId: currentRound + 1,
      headsTotal: 0,
      tailsTotal: 0,
      endsAt: Date.now() + 60000,
      settled: false,
      winningSide: null,
      jackpotTriggered: false,
    });
    setUserBet(null);
    setTimeLeft(60);
  }, [currentRound]);

  return (
    <GameContext.Provider
      value={{
        currentRound,
        roundState,
        userBet,
        jackpotPool,
        history,
        leaderboard,
        timeLeft,
        placeBet,
        claimWinnings,
        startNewRound,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};