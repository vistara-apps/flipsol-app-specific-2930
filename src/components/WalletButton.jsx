import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

const WalletButton = () => {
  const { connected, publicKey, balance, connect, disconnect } = useWallet();

  if (connected) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block text-right">
          <div className="text-xs sm:text-sm font-mono text-text-muted">{publicKey}</div>
          <div className="text-sm sm:text-base font-semibold">{balance.toFixed(2)} SOL</div>
        </div>
        <button
          onClick={disconnect}
          className="btn-secondary flex items-center gap-2 text-sm sm:text-base py-2 sm:py-3 px-4 sm:px-6"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="btn-primary flex items-center gap-2 text-sm sm:text-base py-2 sm:py-3 px-4 sm:px-6"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
};

export default WalletButton;