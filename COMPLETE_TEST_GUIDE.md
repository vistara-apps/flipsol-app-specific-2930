# 🎰 FlipSOL Complete Testing Guide

## ✅ PROGRAM UPGRADE COMPLETED!

**Smart Contract:** `BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL`  
**Upgrade TX:** `3EDeUT5LUS9HGj17t3JJC8UVbTcUnyyHW7T1bLDchWQqjh7YGTngrWTypatDDwZ9UUKT63CnrvRw58zZ3CBwnCY9`  
**Fixed Issue:** Jackpot PDA transfer mechanism (used direct lamports manipulation)

---

## 🚀 End-to-End Testing Steps

### Phase 1: Start Backend & Frontend

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
npm run dev
```

**Expected Results:**
- Backend: "FlipSOL Engine ONLINE - ready for 100+ concurrent users!"
- Frontend: Available at http://localhost:5173
- Settlement: Re-enabled after program upgrade

### Phase 2: Wallet Connection & UI Testing

1. **Open http://localhost:5173**
2. **Connect Phantom/Solflare wallet**
3. **Check UI Elements:**
   - ✅ Round timer shows 90-second cycles (60s betting + 30s break)
   - ✅ Betting cards visible during betting phase
   - ✅ Casino break message during break phase
   - ✅ FlipSOL Engine status in bottom-right corner

### Phase 3: Betting Flow Testing

1. **Wait for betting phase** (round timer shows "🎲 PLACE BETS")
2. **Place test bet:**
   - Choose Heads or Tails
   - Amount: 0.01 SOL (minimum)
   - Sign transaction
3. **Expected Results:**
   - Transaction confirms within 5-10 seconds
   - Current pot updates immediately
   - Your bet shows in round state

### Phase 4: Settlement Testing (CRITICAL)

1. **Wait for round to expire** (60 seconds)
2. **Watch FlipSOL Engine status:**
   - Should show: "🎯 SETTLING Round #X"
   - Then: "✅ SETTLED Round #X - TX: abc123..."
3. **Check results:**
   - Round shows as settled
   - Winning side determined
   - If you won, claim button appears

### Phase 5: Winnings Claim Testing

1. **If you won the round:**
   - Click "Claim Winnings" button
   - Sign transaction
   - Check SOL balance increases
2. **If you lost:**
   - No claim button (expected)
   - SOL goes to winner pool

---

## 🎯 Key Success Metrics

### ✅ Settlement Working:
- No more "Transfer: `from` must not carry data" errors
- Rounds settle automatically after 60 seconds
- Backend logs show successful settlements

### ✅ Jackpot Testing:
- ~0.0129% chance per round (1 in 7777)
- When triggered, entire jackpot transfers to winner pool
- No settlement failures due to PDA transfer issues

### ✅ User Experience:
- Smooth betting flow
- Clear timer and status
- Real-time updates
- Error handling for failed transactions

---

## 🔍 Monitoring & Logs

### Backend Logs to Watch:
```
✅ Round X settled successfully - TX: <hash>
🎉 Round X closed - HEADS/TAILS wins!
💰 Jackpot triggered (rare!)
```

### Error Logs (Should NOT see):
```
❌ Transfer: `from` must not carry data
❌ AccountNotEnoughKeys
❌ Failed to close round
```

### Frontend Monitoring:
- FlipSOL Engine status shows green ✅
- Rounds Created vs Rounds Settled counters
- Real-time activity updates

---

## 🚨 What to Test Specifically

### 1. Normal Round Settlement:
- Most common case (99.99% of rounds)
- Basic win/loss distribution
- Rake collection (2%)
- Jackpot contribution (1%)

### 2. Jackpot Trigger (Rare):
- Random chance ~0.0129%
- Entire jackpot transfers to winner pool
- No settlement failures
- Proper lamports manipulation

### 3. Edge Cases:
- Round with only 1 bet
- Round with many bets on same side
- Network/RPC issues
- Wallet disconnection

### 4. Concurrent Users:
- Multiple wallets betting simultaneously
- Race conditions in settlement
- Backend load handling

---

## 📊 Performance Targets

- **Settlement Time:** <10 seconds after round expires
- **Transaction Confirmation:** <5 seconds  
- **UI Responsiveness:** <1 second updates
- **Concurrent Users:** Up to 100+ (as designed)
- **Error Rate:** <1% for normal operations

---

## 🛠️ Troubleshooting

### If Settlement Fails:
1. Check FlipSOL Engine status
2. Restart backend if needed
3. Check SOL balance for transaction fees
4. Verify RPC connectivity

### If UI Issues:
1. Hard refresh browser (Cmd+Shift+R)
2. Clear wallet cache
3. Reconnect wallet
4. Check console for errors

### If Performance Issues:
1. Check network connection
2. Monitor RPC rate limits
3. Check backend logs for bottlenecks

---

## 🎉 Demo Recording Checklist

For recording/demonstration:

1. **Start with clean state** - fresh terminals
2. **Show wallet balance** before/after
3. **Demonstrate complete cycle:** bet → wait → settle → claim
4. **Show FlipSOL Engine** status throughout
5. **Highlight key improvements:** fixed settlement, timing, UI
6. **Test multiple rounds** to show consistency
7. **Show error handling** (disconnect wallet, etc.)

---

## Next Steps After Testing

If all tests pass:
- ✅ Ready for broader user testing
- ✅ Settlement system fully functional  
- ⚠️ Still need: secrets management, redundancy, monitoring

If issues found:
- Debug specific failures
- Check program logs on-chain
- Verify transaction details
- Adjust timing if needed