import React, { createContext, useContext, useState, useCallback } from 'react';

const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState(10.5); // Mock balance in SOL

  const connect = useCallback(() => {
    // Simulate wallet connection
    const mockPublicKey = 'Fg6P...aB9x';
    setPublicKey(mockPublicKey);
    setConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setConnected(false);
  }, []);

  const updateBalance = useCallback((newBalance) => {
    setBalance(newBalance);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        connected,
        publicKey,
        balance,
        connect,
        disconnect,
        updateBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};