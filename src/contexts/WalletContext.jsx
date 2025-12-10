import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { NETWORK, RPC_URL } from '../config/constants';
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

const WalletContextProvider = ({ children }) => {
  const { connection } = useConnection();
  const { publicKey } = useSolanaWallet();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastTxTime, setLastTxTime] = useState(null);
  const [txInFlight, setTxInFlight] = useState(false);

  const updateBalance = useCallback(async (publicKeyToUpdate) => {
    const pk = publicKeyToUpdate || publicKey;
    if (!pk || !connection) {
      setBalance(0);
      return;
    }

    try {
      setLoading(true);
      const bal = await connection.getBalance(pk);
      setBalance(bal / 1e9); // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (publicKey) {
      updateBalance(publicKey);
      // Refresh balance periodically
      const interval = setInterval(() => {
        updateBalance(publicKey);
      }, 30000); // Every 30 seconds (reduced from 10)
      return () => clearInterval(interval);
    } else {
      setBalance(0);
    }
  }, [publicKey, updateBalance]);

  const markTransactionStart = useCallback(() => {
    setTxInFlight(true);
  }, []);

  const markTransactionComplete = useCallback(() => {
    setLastTxTime(Date.now());
    setTxInFlight(false);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        connection,
        balance,
        loading,
        updateBalance,
        lastTxTime,
        txInFlight,
        markTransactionStart,
        markTransactionComplete,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const WalletProvider = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = useMemo(() => {
    const envNetwork = NETWORK;
    if (envNetwork === 'mainnet-beta') return WalletAdapterNetwork.Mainnet;
    if (envNetwork === 'testnet') return WalletAdapterNetwork.Testnet;
    return WalletAdapterNetwork.Devnet;
  }, []);

  // Use custom RPC URL if provided, otherwise use cluster API
  const endpoint = useMemo(() => {
    if (RPC_URL && RPC_URL !== '') {
      return RPC_URL;
    }
    if (network === WalletAdapterNetwork.Devnet) {
      return clusterApiUrl('devnet');
    }
    if (network === WalletAdapterNetwork.Testnet) {
      return clusterApiUrl('testnet');
    }
    return clusterApiUrl('mainnet-beta');
  }, [network]);

  const wallets = useMemo(
    () => [
      // Phantom is auto-detected, no need to include it
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextProvider>
            {children}
          </WalletContextProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
