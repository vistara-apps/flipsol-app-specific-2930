import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const CronStatus = () => {
  const [status, setStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/cron-status`);
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch cron status:', error);
        setStatus({ enabled: false, error: 'Connection failed' });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const getStatusColor = () => {
    if (!status.enabled) return 'border-red-500/50 bg-red-900/20';
    if (status.isRunning) return 'border-green-500/50 bg-green-900/20';
    return 'border-yellow-500/50 bg-yellow-900/20';
  };

  const getStatusIcon = () => {
    if (!status.enabled) return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (status.isRunning) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    return `${Math.floor(diff / 60000)}m ago`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {/* Minimized view */}
      <div 
        className={`${getStatusColor()} border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
          isVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => setIsVisible(true)}
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-xs font-medium">
            {status.enabled ? '🚀 Engine ON' : '❌ Engine OFF'}
          </span>
        </div>
      </div>

      {/* Expanded view */}
      <div 
        className={`${getStatusColor()} border rounded-lg p-4 transition-all duration-200 w-80 ${
          isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none absolute top-0 right-0'
        }`}
        style={{ transform: isVisible ? 'none' : 'translateY(-100%)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium text-sm">
              🚀 FlipSOL Engine
            </span>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-text-muted hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        {status.enabled ? (
          <div className="space-y-2 text-xs">
            {/* Current Activity */}
            <div className="bg-bg/50 rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3 h-3 text-blue-400" />
                <span className="text-blue-400 font-medium">Live Activity</span>
              </div>
              <div className="text-white/90">{status.lastActivity || 'Initializing...'}</div>
              <div className="text-text-muted mt-1">
                Last check: {formatTime(status.lastCheck)}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-bg/30 rounded p-2">
                <div className="text-green-400 text-xs font-medium">🎲 Rounds Created</div>
                <div className="text-lg font-mono">{status.roundsProcessed || 0}</div>
              </div>
              <div className="bg-bg/30 rounded p-2">
                <div className="text-purple-400 text-xs font-medium">🎯 Rounds Settled</div>
                <div className="text-lg font-mono">{status.roundsClosed || 0}</div>
              </div>
            </div>

            {/* Configuration */}
            <div className="bg-bg/30 rounded p-2">
              <div className="text-yellow-400 text-xs font-medium mb-1">⚙️ Configuration</div>
              <div className="grid grid-cols-2 gap-1 text-text-muted">
                <div>Betting: {Math.floor((status.config?.bettingWindow || 60000) / 1000)}s</div>
                <div>Break: {Math.floor((status.config?.breakDuration || 30000) / 1000)}s</div>
                <div>Check: {Math.floor((status.config?.checkInterval || 2000) / 1000)}s</div>
                <div>Total: {Math.floor((status.config?.roundDuration || 90000) / 1000)}s</div>
              </div>
            </div>

            {/* Recent Errors */}
            {status.errors && status.errors.length > 0 && (
              <div className="bg-red-900/30 border border-red-500/30 rounded p-2">
                <div className="text-red-400 text-xs font-medium mb-1">⚠️ Recent Errors</div>
                <div className="text-red-300 text-xs space-y-1 max-h-20 overflow-y-auto">
                  {status.errors.slice(-3).map((error, i) => (
                    <div key={i} className="truncate">{error}</div>
                  ))}
                </div>
              </div>
            )}

            {/* System Info */}
            <div className="text-text-muted text-xs space-y-1">
              <div>Authority: {status.authority?.slice(0, 8)}...{status.authority?.slice(-8)}</div>
              <div>Program: {status.programId?.slice(0, 8)}...{status.programId?.slice(-8)}</div>
            </div>
          </div>
        ) : (
          <div className="text-center text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <div className="text-sm font-medium">FlipSOL Engine Disabled</div>
            <div className="text-xs text-red-300 mt-1">
              {status.error || 'Configuration required'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CronStatus;