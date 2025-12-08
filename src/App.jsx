import React, { useState } from 'react';
import { GameProvider } from './contexts/GameContext';
import Header from './components/Header';
import JackpotBanner from './components/JackpotBanner';
import BettingArea from './components/BettingArea';
import RoundTimer from './components/RoundTimer';
import TabNavigation from './components/TabNavigation';
import History from './components/History';
import Leaderboard from './components/Leaderboard';

function App() {
  const [activeTab, setActiveTab] = useState('play');

  return (
    <GameProvider>
      <div className="min-h-screen bg-bg">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <JackpotBanner />
          
          <div className="mt-6 sm:mt-8">
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <div className="mt-6 sm:mt-8">
              {activeTab === 'play' && (
                <div className="space-y-6 sm:space-y-8">
                  <RoundTimer />
                  <BettingArea />
                </div>
              )}
              
              {activeTab === 'history' && <History />}
              
              {activeTab === 'leaderboard' && <Leaderboard />}
            </div>
          </div>
        </main>
      </div>
    </GameProvider>
  );
}

export default App;