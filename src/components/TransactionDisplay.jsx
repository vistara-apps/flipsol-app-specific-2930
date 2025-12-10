import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

const TransactionDisplay = ({ txHash, type = 'transaction', network = 'devnet', className = '' }) => {
  const [copied, setCopied] = useState(false);

  if (!txHash) return null;

  const getSolscanUrl = (hash, network) => {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://solscan.io/tx/${hash}${cluster}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTxHash = (hash) => {
    if (!hash || typeof hash !== 'string') return 'Invalid';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bet':
        return '🎲';
      case 'claim':
        return '💰';
      case 'settlement':
        return '⚡';
      default:
        return '📋';
    }
  };

  return (
    <div className={`bg-surface-hover rounded-lg border border-border p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(type)}</span>
          <div className="flex flex-col">
            <span className="text-xs text-text-muted capitalize">{type} Transaction</span>
            <span className="text-sm font-mono text-white">{formatTxHash(txHash)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={() => copyToClipboard(txHash)}
            className="p-2 rounded-md hover:bg-surface transition-colors text-text-muted hover:text-white"
            title="Copy transaction hash"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          
          {/* Solscan link */}
          <a
            href={getSolscanUrl(txHash, network)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md hover:bg-surface transition-colors text-text-muted hover:text-primary flex items-center gap-1"
            title="View on Solscan"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default TransactionDisplay;