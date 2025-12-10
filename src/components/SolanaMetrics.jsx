import React, { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWallet } from '../contexts/WalletContext';

const SolanaMetrics = () => {
  const { connection } = useConnection();
  const { lastTxTime } = useWallet();
  const [metrics, setMetrics] = useState({
    blockTime: null,
    slot: null,
    txLatency: null,
    networkStatus: 'unknown'
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const slot = await connection.getSlot();
        const blockTime = await connection.getBlockTime(slot);
        const now = Date.now() / 1000;
        const latency = blockTime ? Math.round((now - blockTime) * 1000) : null;
        
        setMetrics(prev => ({
          ...prev,
          slot,
          blockTime: latency,
          networkStatus: latency < 1000 ? 'excellent' : latency < 2000 ? 'good' : 'fair'
        }));
      } catch (error) {
        console.error('Failed to fetch network metrics:', error);
        setMetrics(prev => ({
          ...prev,
          networkStatus: 'error'
        }));
      }
    };

    // Initial fetch
    updateMetrics();
    
    // Update every 15 seconds to reduce RPC hammering
    const interval = setInterval(updateMetrics, 15000);
    
    return () => clearInterval(interval);
  }, [connection]);

  // Update transaction latency when a new transaction completes
  useEffect(() => {
    if (lastTxTime) {
      const latency = Date.now() - lastTxTime;
      setMetrics(prev => ({
        ...prev,
        txLatency: latency
      }));
      
      // Show metrics briefly after transaction
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    }
  }, [lastTxTime]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-yellow-400';
      case 'fair': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'fair': return '🟠';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="solana-metrics-container">
      {/* Always visible network status */}
      <div className="network-status">
        <div className="status-indicator">
          <span className="status-icon">{getStatusIcon(metrics.networkStatus)}</span>
          <span className={`status-text ${getStatusColor(metrics.networkStatus)}`}>
            {metrics.blockTime !== null ? `${metrics.blockTime}ms` : '--'}
          </span>
        </div>
      </div>

      {/* Expandable metrics panel */}
      <div className={`metrics-panel ${isVisible ? 'visible' : ''}`}>
        {metrics.txLatency && (
          <div className="metric-item instant-settle">
            <div className="metric-flash">⚡ INSTANT SETTLE</div>
            <div className="metric-value">Confirmed in {metrics.txLatency}ms</div>
          </div>
        )}
        
        <div className="metric-item">
          <span className="metric-label">Block Latency</span>
          <span className="metric-value">{metrics.blockTime || '--'}ms</span>
        </div>
        
        <div className="metric-item">
          <span className="metric-label">Current Slot</span>
          <span className="metric-value">{metrics.slot || '--'}</span>
        </div>
        
        <div className="metric-item">
          <span className="metric-label">Network</span>
          <span className={`metric-value ${getStatusColor(metrics.networkStatus)}`}>
            {metrics.networkStatus.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SolanaMetrics;