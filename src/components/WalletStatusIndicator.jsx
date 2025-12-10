import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWallet as useCustomWallet } from '../contexts/WalletContext';

const WalletStatusIndicator = () => {
  const { connected, connecting, publicKey } = useWallet();
  const { txInFlight, balance } = useCustomWallet();

  if (!connected && !connecting) return null;

  const getStatusColor = () => {
    if (connecting) return 'text-yellow-400';
    if (txInFlight) return 'text-neon-cyan';
    if (connected) return 'text-green-400';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (connecting) return 'Connecting...';
    if (txInFlight) return 'Transaction in flight';
    if (connected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (connecting) return '🟡';
    if (txInFlight) return '⚡';
    if (connected) return '🟢';
    return '🔴';
  };

  return (
    <div className="wallet-status-container">
      <div className={`wallet-status ${txInFlight ? 'pulsing' : ''}`}>
        <div className="wallet-avatar">
          <div className="avatar-icon">{getStatusIcon()}</div>
          {txInFlight && <div className="tx-pulse"></div>}
        </div>
        
        <div className="wallet-info">
          <div className={`wallet-status-text ${getStatusColor()}`}>
            {getStatusText()}
          </div>
          {connected && publicKey && (
            <>
              <div className="wallet-address">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </div>
              <div className="wallet-balance">
                {balance.toFixed(3)} SOL
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletStatusIndicator;