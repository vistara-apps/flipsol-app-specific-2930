import React from 'react';
import { Coins } from 'lucide-react';
import WalletButton from './WalletButton';

const Header = () => {
  return (
    <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">FlipSOL</h1>
              <p className="text-xs sm:text-sm text-text-muted hidden sm:block">Provably Fair Coin Flip</p>
            </div>
          </div>
          
          <WalletButton />
        </div>
      </div>
    </header>
  );
};

export default Header;