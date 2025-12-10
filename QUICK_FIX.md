# Quick Fix Applied

## Issue Fixed
The UI was showing "Loading round data..." indefinitely because:
1. The program was initialized but no rounds had been started yet
2. When `currentRound` is 0, the code tried to fetch round 0 which doesn't exist
3. This left `roundState` as null, showing the loading message

## Changes Made

1. **RoundTimer.jsx**: Changed "Loading round data..." to "No active round"
2. **GameContext.jsx**: 
   - Added check for `currentRound === 0` (no rounds started)
   - Set `roundState` to null when no rounds exist
   - Improved error handling in `fetchGlobalState`
3. **BettingArea.jsx**: 
   - Added "Start New Round" button for authority wallet
   - Shows helpful message based on whether user is admin

## How It Works Now

1. **If no rounds started** (`currentRound === 0`):
   - Shows "No active round"
   - Authority can click "Start New Round" button
   - Regular users see "Waiting for a new round to start..."

2. **If round exists**:
   - Fetches and displays round data normally
   - Shows timer, betting options, etc.

## Next Steps

1. **Start a round** (as authority):
   - Connect your wallet (must be the authority wallet)
   - Click "Start New Round" button
   - Set duration (default 60 seconds)
   - Confirm transaction

2. **Place bets**:
   - Once round is active, users can place bets
   - Choose Heads or Tails
   - Enter amount and confirm

3. **Round closes automatically**:
   - When timer expires, admin can close round
   - Winners can claim their winnings

## Testing

Refresh your browser and you should see:
- "No active round" instead of "Loading round data..."
- If you're the authority, a "Start New Round" button
- Once you start a round, the UI will update to show the active round
