import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Referral tracking
  referrals: defineTable({
    referrerWallet: v.string(),
    referredWallet: v.string(),
    referralCode: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_referrer", ["referrerWallet"])
    .index("by_referred", ["referredWallet"])
    .index("by_code", ["referralCode"]),

  // Referral earnings
  referralEarnings: defineTable({
    referrerWallet: v.string(),
    referredWallet: v.string(),
    roundId: v.number(),
    betAmount: v.number(),
    commissionAmount: v.number(),
    commissionRate: v.number(),
    gameType: v.string(), // "coinflip"
    createdAt: v.number(),
  })
    .index("by_referrer", ["referrerWallet"])
    .index("by_round", ["roundId"]),

  // Game rounds for analytics
  gameRounds: defineTable({
    roundId: v.number(),
    winningSide: v.number(),
    headsTotal: v.number(),
    tailsTotal: v.number(),
    totalPot: v.number(),
    rakeAmount: v.number(),
    jackpotAmount: v.number(),
    participantCount: v.number(),
    settlementTime: v.number(),
    createdAt: v.number(),
  })
    .index("by_round", ["roundId"])
    .index("by_time", ["createdAt"]),

  // User bets for analytics
  userBets: defineTable({
    userWallet: v.string(),
    roundId: v.number(),
    side: v.number(),
    amount: v.number(),
    payout: v.optional(v.number()),
    won: v.optional(v.boolean()),
    claimed: v.boolean(),
    referrerWallet: v.optional(v.string()),
    txSignature: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userWallet"])
    .index("by_round", ["roundId"])
    .index("by_referrer", ["referrerWallet"])
    .index("by_time", ["createdAt"]),

  // Leaderboard data
  userStats: defineTable({
    wallet: v.string(),
    totalVolume: v.number(),
    totalWinnings: v.number(),
    totalBets: v.number(),
    winRate: v.number(),
    biggestWin: v.number(),
    totalReferred: v.number(),
    referralEarnings: v.number(),
    lastActiveAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_volume", ["totalVolume"])
    .index("by_winnings", ["totalWinnings"])
    .index("by_referrals", ["totalReferred"]),

  // Live activity feed
  activityFeed: defineTable({
    type: v.union(
      v.literal("bet"),
      v.literal("win"),
      v.literal("jackpot"),
      v.literal("referral")
    ),
    userWallet: v.string(),
    amount: v.number(),
    roundId: v.optional(v.number()),
    side: v.optional(v.number()),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_time", ["createdAt"]),
});