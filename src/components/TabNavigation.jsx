import React from 'react';
import { Play, History, Trophy } from 'lucide-react';

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'play', label: 'Play', icon: Play },
    { id: 'history', label: 'History', icon: History },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <nav 
      className="flex gap-2 sm:gap-md border-b border-border overflow-x-auto"
      role="tablist"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-semibold transition-all duration-base border-b-2 whitespace-nowrap focus:outline-none ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text focus:text-text'
            }`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tab.id}-panel`}
            id={`${tab.id}-tab`}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            <span className="text-sm sm:text-base">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default TabNavigation;