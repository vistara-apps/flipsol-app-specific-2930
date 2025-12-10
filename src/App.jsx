import React, { useState } from 'react';
import { GameProvider } from './contexts/GameContext';
import Header from './components/Header';
import BettingArea from './components/BettingArea';
import FlipArena from './components/FlipArena';
import RoundTimer from './components/RoundTimer';
import TabNavigation from './components/TabNavigation';
import History from './components/History';
import Leaderboard from './components/Leaderboard';
import ReferralDashboard from './components/ReferralDashboard';
import ConvexDebug from './components/ConvexDebug';
import CronStatus from './components/CronStatus';
import UnclaimedWinnings from './components/UnclaimedWinnings';
import SolanaMetrics from './components/SolanaMetrics';
import SSEDebugPanel from './components/SSEDebugPanel';
import CoinTossHistory from './components/CoinTossHistory';
import LiveBetFeed from './components/LiveBetFeed';
import WalletStatusIndicator from './components/WalletStatusIndicator';

function App() {
  const [activeTab, setActiveTab] = useState('play');

  return (
    <GameProvider>
      <div
        className="app-layout"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(236, 72, 153, 0.06) 0%, transparent 40%),
            linear-gradient(135deg, 
              #1a1a1a 0%, 
              #202020 15%, 
              #1a1a1a 30%, 
              #252525 50%, 
              #1a1a1a 70%, 
              #1f1f1f 100%
            )
          `,
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Header Area */}
        <div className="header-area">
          <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Sidebar removed to prevent duplicates */}

          {/* Center - Main Content */}
          <div className="center-area">
            {activeTab === 'play' && (
              <FlipArena>
                <BettingArea />
              </FlipArena>
            )}

            {activeTab === 'history' && <History />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'referrals' && (
              <div>
                <ReferralDashboard />
                <ConvexDebug />
              </div>
            )}
          </div>

          {/* Metrics Area */}
          <div className="metrics-area">
            <SolanaMetrics />
          </div>
        </div>

        {/* System Monitoring */}
        <CronStatus />
        <WalletStatusIndicator />

        {/* Agent Brain - Shows real-time events */}
        <SSEDebugPanel />

        {/* Croupier - Coin toss history */}
        <CoinTossHistory />
      </div>
    </GameProvider>
  );
}

export default App;