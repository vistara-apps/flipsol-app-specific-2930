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
        
        <main className="container-app py-lg sm:py-xl" role="main">
          <JackpotBanner />
          
          <div className="mt-lg sm:mt-xl">
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <div className="mt-lg sm:mt-xl">
              {activeTab === 'play' && (
                <div 
                  className="space-y-lg sm:space-y-xl animate-slide-in"
                  role="tabpanel"
                  id="play-panel"
                  aria-labelledby="play-tab"
                >
                  <RoundTimer />
                  <BettingArea />
                </div>
              )}
              
              {activeTab === 'history' && (
                <div
                  className="animate-slide-in"
                  role="tabpanel"
                  id="history-panel"
                  aria-labelledby="history-tab"
                >
                  <History />
                </div>
              )}
              
              {activeTab === 'leaderboard' && (
                <div
                  className="animate-slide-in"
                  role="tabpanel"
                  id="leaderboard-panel"
                  aria-labelledby="leaderboard-tab"
                >
                  <Leaderboard />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </GameProvider>
  );
}

export default App;