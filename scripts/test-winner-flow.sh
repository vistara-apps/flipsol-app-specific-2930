#!/bin/bash

echo "🎲 FlipSOL Winner Flow Test"
echo "=========================="

WALLET="4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t"
BACKEND_URL="http://localhost:3001"

# Step 1: Create new round
echo -e "\n1️⃣ Creating new round..."
ROUND_RESPONSE=$(curl -s -X POST $BACKEND_URL/api/cron/start-round -H "Content-Type: application/json")
ROUND_ID=$(echo $ROUND_RESPONSE | grep -o '"roundId":[0-9]*' | cut -d':' -f2)
echo "✅ Created Round #$ROUND_ID"

# Step 2: Place bet on HEADS
echo -e "\n2️⃣ Placing bet on HEADS..."
cd scripts
node place-bet.cjs $ROUND_ID 0 0.05
cd ..

# Step 3: Check unclaimed (should be empty)
echo -e "\n3️⃣ Checking unclaimed winnings (should be empty)..."
curl -s $BACKEND_URL/api/user/unclaimed-winnings/$WALLET | jq '.'

# Step 4: Wait for round to expire
echo -e "\n4️⃣ Waiting 65 seconds for round to expire..."
sleep 65

# Step 5: Manual settle (backend should do this automatically)
echo -e "\n5️⃣ Settling round..."
cd scripts
node manual-close-round.cjs $ROUND_ID
cd ..

# Step 6: Check round result
echo -e "\n6️⃣ Checking round result..."
cd scripts
node check-state.cjs | grep "Round #$ROUND_ID" -A 5
cd ..

# Step 7: Check unclaimed winnings again
echo -e "\n7️⃣ Checking unclaimed winnings (should show if you won)..."
UNCLAIMED_RESPONSE=$(curl -s $BACKEND_URL/api/user/unclaimed-winnings/$WALLET)
echo $UNCLAIMED_RESPONSE | jq '.'

# Step 8: Get bet history
echo -e "\n8️⃣ Checking bet history..."
curl -s $BACKEND_URL/api/user/bet-history/$WALLET | jq '.betHistory[0]'

# Summary
echo -e "\n📊 Summary:"
TOTAL_UNCLAIMED=$(echo $UNCLAIMED_RESPONSE | jq -r '.totalUnclaimed')
echo "Total unclaimed: $TOTAL_UNCLAIMED SOL"

if [ "$TOTAL_UNCLAIMED" != "0" ]; then
    echo "🎉 You have winnings to claim! Check the frontend or run:"
    echo "   node scripts/claim-winnings.cjs $ROUND_ID"
else
    echo "😢 No winnings to claim (you either lost or already claimed)"
fi