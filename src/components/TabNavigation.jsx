import React from 'react';
import { Play, History, Trophy, Users } from 'lucide-react';

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'play', label: 'Play', icon: Play },
    { id: 'history', label: 'History', icon: History },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'referrals', label: 'Referrals', icon: Users },
  ];

  return (
    <nav 
      className="flex gap-0 sm:gap-2 border-b border-border overflow-x-auto overflow-y-hidden"
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
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text focus:text-text'
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
  );
};

export default TabNavigation;