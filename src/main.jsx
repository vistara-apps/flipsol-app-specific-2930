import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { WalletProvider } from './contexts/WalletContext.jsx'
import { GameProvider } from './contexts/GameContext.jsx'
import { ReferralProvider } from './contexts/ReferralContext.jsx'
import { ConvexProvider } from "convex/react";
import convex from './lib/convex';
import { Buffer } from 'buffer'

// Polyfill Buffer for browser
window.Buffer = Buffer
globalThis.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <WalletProvider>
        <ReferralProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </ReferralProvider>
      </WalletProvider>
    </ConvexProvider>
  </React.StrictMode>,
)