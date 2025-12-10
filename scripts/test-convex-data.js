// Test script to populate Convex with sample data
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "https://hearty-koala-391.convex.cloud");

async function addTestData() {
  console.log("🚀 Adding test data to Convex...");
  
  try {
    // Test referral tracking
    console.log("📈 Adding test referral...");
    await convex.mutation("referrals:trackReferral", {
      referrerWallet: "8FhgQskw2XdcG1opJN3EivQBoYi3iyk4uFwxKnB9N7Jw",
      referredWallet: "4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t",
      referralCode: "8FhgQskw2XdcG1opJN3EivQBoYi3iyk4uFwxKnB9N7Jw",
    });
    
    // Test bet recording
    console.log("🎯 Adding test bet...");
    await convex.mutation("gameData:recordBet", {
      userWallet: "4ym542u1DuC2i9hVxnr2EAdss8fHp4Rf4RFnyfqfy82t",
      roundId: 1,
      side: 0, // Heads
      amount: 0.5,
      txSignature: "5K7Jx2dNzv8fwB1QdJ5L4K8xH3xE2P9R1T6Y4K8L2M1N5Q9T8X6V3C7B4N2M",
      referrerWallet: "8FhgQskw2XdcG1opJN3EivQBoYi3iyk4uFwxKnB9N7Jw",
    });
    
    // Add another bet
    console.log("🎯 Adding second test bet...");
    await convex.mutation("gameData:recordBet", {
      userWallet: "BnH9sAdZuku74uWsfdncYYzMASprDHiRiAZd2jwchXL1",
      roundId: 1,
      side: 1, // Tails
      amount: 1.2,
      txSignature: "2A4B6C8D0E2F4H6J8K0L2M4N6P8Q0R2S4T6U8V0W2X4Y6Z8",
    });
    
    // Test round settlement
    console.log("🏁 Recording test round settlement...");
    await convex.mutation("gameData:recordRoundSettlement", {
      roundId: 1,
      winningSide: 0, // Heads wins
      headsTotal: 0.5,
      tailsTotal: 1.2,
      totalPot: 1.7,
      rakeAmount: 0.034,
      jackpotAmount: 0.017,
      participantCount: 2,
    });
    
    console.log("✅ Test data added successfully!");
    console.log("🌐 Open http://localhost:5173/ to see the live data!");
    
  } catch (error) {
    console.error("❌ Error adding test data:", error);
  }
}

addTestData();