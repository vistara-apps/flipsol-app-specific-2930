import React, { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet as useCustomWallet } from '../contexts/WalletContext';
import { Wallet } from 'lucide-react';

const WalletButton = () => {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { balance, updateBalance, loading } = useCustomWallet();

  useEffect(() => {
    if (publicKey) {
      updateBalance(publicKey);
    }
  }, [publicKey, updateBalance]);

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (publicKey) {
    const address = publicKey.toString();
    const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex flex-col items-end hidden sm:flex">
          <div className="text-sm font-semibold">{shortAddress}</div>
          <div className="text-xs text-text-muted">
            {loading ? '...' : `${balance.toFixed(2)} SOL`}
          </div>
        </div>
        <div className="flex flex-col items-end sm:hidden">
          <div className="text-xs font-semibold">{shortAddress}</div>
          <div className="text-xs text-text-muted">
            {loading ? '...' : `${balance.toFixed(2)}`}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="btn-secondary px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap"
          disabled={loading}
        >
          <span className="hidden sm:inline">Disconnect</span>
          <span className="sm:hidden">Discon.</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="btn-primary flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap"
      disabled={connecting}
    >
      <Wallet className="w-4 h-4 flex-shrink-0" />
      <span className="hidden sm:inline">{connecting ? 'Connecting...' : 'Connect Wallet'}</span>
      <span className="sm:hidden">{connecting ? 'Connecting...' : 'Connect'}</span>
    </button>
  );
};

export default WalletButton;
