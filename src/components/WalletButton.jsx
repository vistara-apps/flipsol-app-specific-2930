import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

const WalletButton = () => {
  const { connected, publicKey, balance, connect, disconnect } = useWallet();

  if (connected) {
    return (
      <div className="flex items-center gap-2 sm:gap-3" role="group" aria-label="Wallet information and actions">
        <div className="hidden sm:block text-right">
          <div className="text-mono text-text-muted" aria-label="Wallet address">{publicKey}</div>
          <div className="text-sm sm:text-base font-semibold" aria-label={`Balance: ${balance.toFixed(2)} SOL`}>
            {balance.toFixed(2)} SOL
          </div>
        </div>
        <button
          onClick={disconnect}
          className="btn-secondary flex items-center gap-2 text-sm sm:text-base py-2 sm:py-3 px-4 sm:px-6"
          aria-label="Disconnect wallet"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Disconnect</span>
          <span className="sm:hidden">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="btn-primary flex items-center gap-2 text-sm sm:text-base py-2 sm:py-3 px-4 sm:px-6"
      aria-label="Connect Solana wallet"
    >
      <Wallet className="w-4 h-4" aria-hidden="true" />
      <span>Connect Wallet</span>
    </button>
  );
};

export default WalletButton;