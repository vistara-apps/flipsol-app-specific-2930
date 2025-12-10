# 🎰 End-to-End Casino Flow Review

## Complete Pipeline: Backend → SSE → Frontend

### ✅ **1. Bet Placement Flow**

**Player Action:**
1. User selects Heads/Tails and amount in `UnifiedBettingCard`
2. Frontend calls `placeBet()` in `GameContext`
3. Transaction sent to Solana program

**Backend Detection:**
4. **Indexer** (`backend/src/indexer/index.ts`) listens to program account changes
5. When `UserBet` account changes → `indexUserBet()` called
6. **SSE Event Emitted:** `bet_placed` with:
   ```json
   {
     "type": "bet_placed",
     "roundId": 123,
     "userWallet": "ABC...XYZ",
     "side": 0,
     "sideName": "Heads",
     "amount": 0.5,
     "timestamp": "2025-12-10T..."
   }
   ```

**Frontend Update:**
7. `GameContext` receives `bet_placed` event via SSE
8. Calls `fetchRoundState()` to refresh totals
9. `LiveBetFeed` receives event and shows notification
10. **Bet appears in live feed table immediately** ✅

---

### ✅ **2. Round Monitoring & Settlement**

**Backend Cron Engine:**
1. **FlipSOLEngine** (`backend/src/services/casinoAgent.ts`) runs every **30 seconds**
2. `processRoundCycle()` checks:
   - Current round state
   - If round expired (`endsAt < now`)
   - If round has bets (`totalPot > 0`)
   - If round not yet settled

**Settlement Trigger:**
3. When round expires with bets → `closeRound()` called
4. Transaction sent to Solana to settle round
5. **SSE Event Emitted:** `round_settled` with:
   ```json
   {
     "type": "round_settled",
     "roundId": 123,
     "transactionHash": "ABC...",
     "pot": 1.5,
     "headsTotal": 0.8,
     "tailsTotal": 0.7,
     "winningSide": 0,
     "winner": "HEADS",
     "timestamp": "2025-12-10T..."
   }
   ```

**Frontend Settlement:**
6. `GameContext` receives `round_settled` event
7. Updates `roundState` with settlement data
8. **Triggers coin toss animation** ✅
9. Fetches user bet to enable claim button

---

### ✅ **3. Coin Toss Animation & Winner Celebration**

**Animation Trigger:**
1. `BettingArea` watches `roundState.settled` changes
2. When `settled === true` and new round → `setShowCoinToss(true)`
3. `CoinTossAnimation` component renders

**Animation Sequence:**
4. Coin flips for 3 seconds
5. Shows winner (Heads/Tails)
6. **If user won:** 
   - Shows "YOU WON!" message
   - **Triggers golden confetti** 🎉 ✅
   - Confetti fires 3 times (0ms, 300ms, 600ms)

**After Animation:**
7. `ClaimCard` appears if user won
8. User can claim winnings
9. Confetti also triggers on successful bet placement

---

### ✅ **4. Real-Time Updates**

**Round Status Updates:**
- Every 30 seconds, backend emits `round_status` events
- Frontend updates pot totals in real-time
- Timer updates automatically

**Bet Feed Updates:**
- New bets appear immediately via SSE
- Convex query also refreshes (backup)
- Live feed shows latest bets with user addresses

**User Count:**
- SSE broadcasts `users_online` events
- Shows active users count in header

---

## 🔍 **Flow Verification Checklist**

### Backend ✅
- [x] Cron runs every 30 seconds (`CHECK_INTERVAL = 30000`)
- [x] Detects expired rounds correctly
- [x] Emits `round_settled` SSE event on settlement
- [x] Emits `round_status` every cycle
- [x] Indexer emits `bet_placed` on new bets
- [x] Prevents multiple round starts (guards in place)
- [x] Handles jackpot account not initialized error

### SSE Stream ✅
- [x] `/api/feed/stream` endpoint active
- [x] Events broadcast to all connected clients
- [x] `bet_placed` events emitted from indexer
- [x] `round_settled` events emitted from cron engine
- [x] `round_status` events emitted every cycle

### Frontend State Updates ✅
- [x] `GameContext` listens to all SSE events
- [x] `bet_placed` → refreshes round state
- [x] `round_settled` → triggers coin toss
- [x] `round_status` → updates pot totals
- [x] `round_started` → refreshes global state

### UI Components ✅
- [x] `LiveBetFeed` shows bets immediately
- [x] `UnifiedBettingCard` updates pot totals
- [x] `CircularTimer` shows countdown
- [x] `CoinTossAnimation` triggers on settlement
- [x] Winner confetti triggers if user won
- [x] `ClaimCard` appears for winners

---

## 🎯 **Complete User Journey**

1. **Player places bet** → Transaction sent → Indexer detects → SSE `bet_placed` → Frontend updates table ✅
2. **Round expires** → Cron detects (30s check) → Settlement transaction → SSE `round_settled` → Coin toss animation ✅
3. **Coin toss completes** → If user won → Confetti celebration → Claim card appears ✅
4. **User claims** → Transaction sent → Balance updated → Success ✅

---

## 🚀 **Performance**

- **Bet Detection:** ~1-2 seconds (Solana confirmation + indexer)
- **Settlement Detection:** Max 30 seconds (cron interval)
- **Frontend Updates:** Instant (SSE push)
- **Animation:** 3 seconds coin toss + 2 seconds result = 5 seconds total

---

## ✅ **All Systems Operational**

The complete pipeline is working end-to-end:
- Backend monitoring ✅
- SSE event streaming ✅
- Frontend state management ✅
- Real-time UI updates ✅
- Winner celebrations ✅

