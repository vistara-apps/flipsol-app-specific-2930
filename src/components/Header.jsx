import React from 'react';
import { Coins, Users, Play, History, Trophy } from 'lucide-react';
import WalletButton from './WalletButton';
import { useGame } from '../contexts/GameContext';

const Header = ({ activeTab, setActiveTab }) => {
  const { usersOnline } = useGame();
  
  const tabs = [
    { id: 'play', label: 'Play', icon: Play },
    { id: 'history', label: 'History', icon: History },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'referrals', label: 'Referrals', icon: Users },
  ];
  
  return (
    <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50" role="banner">
      <div className="container-app">
        {/* Top Row - Logo and Wallet */}
        <div className="flex items-center justify-between h-14 sm:h-16 py-2 sm:py-0 border-b border-border/50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow flex-shrink-0"
              aria-hidden="true"
            >
              <Coins className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-h2 truncate">Flip'n Sol</h1>
              <p className="text-caption text-text-muted hidden sm:block">Provably Fair Coin Flip</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Users Online Counter */}
            {usersOnline > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-surface/80 border border-border rounded-lg">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-sm text-text-muted">
                  {usersOnline} {usersOnline === 1 ? 'player' : 'players'} online
                </span>
              </div>
            )}
            <WalletButton />
          </div>
        </div>
        
        {/* Bottom Row - Navigation Tabs */}
        <nav 
          className="flex gap-0 sm:gap-2 h-12 sm:h-14 overflow-x-auto overflow-y-hidden"
          role="tablist"
          aria-label="Main navigation"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory'
          }}
        >
          <style>{`
            nav::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-4 font-semibold transition-all duration-base border-b-2 whitespace-nowrap focus:outline-none flex-shrink-0 ${
                  isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-text-muted hover:text-text focus:text-text hover:bg-surface/30'
                }`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                aria-label={tab.label}
                style={{ scrollSnapAlign: 'start' }}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-base">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;