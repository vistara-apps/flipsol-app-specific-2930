import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or link a referral
export const trackReferral = mutation({
  args: {
    referrerWallet: v.string(),
    referredWallet: v.string(),
    referralCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if referral already exists
    const existing = await ctx.db
      .query("referrals")
      .withIndex("by_referred", (q) => q.eq("referredWallet", args.referredWallet))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new referral relationship
    const referralId = await ctx.db.insert("referrals", {
      referrerWallet: args.referrerWallet,
      referredWallet: args.referredWallet,
      referralCode: args.referralCode,
      isActive: true,
      createdAt: Date.now(),
    });

    return referralId;
  },
});

// Record referral earnings
export const recordEarnings = mutation({
  args: {
    referrerWallet: v.string(),
    referredWallet: v.string(),
    roundId: v.number(),
    betAmount: v.number(),
    commissionRate: v.number(),
  },
  handler: async (ctx, args) => {
    const commissionAmount = args.betAmount * args.commissionRate;

    await ctx.db.insert("referralEarnings", {
      referrerWallet: args.referrerWallet,
      referredWallet: args.referredWallet,
      roundId: args.roundId,
      betAmount: args.betAmount,
      commissionAmount,
      commissionRate: args.commissionRate,
      gameType: "coinflip",
      createdAt: Date.now(),
    });

    // Update user stats
    const stats = await ctx.db
      .query("userStats")
      .filter((q) => q.eq(q.field("wallet"), args.referrerWallet))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        referralEarnings: stats.referralEarnings + commissionAmount,
        lastActiveAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userStats", {
        wallet: args.referrerWallet,
        totalVolume: 0,
        totalWinnings: 0,
        totalBets: 0,
        winRate: 0,
        biggestWin: 0,
        totalReferred: 1,
        referralEarnings: commissionAmount,
        lastActiveAt: Date.now(),
        createdAt: Date.now(),
      });
    }
  },
});

// Get referral stats for a user
export const getReferralStats = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    // Get direct referrals
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerWallet", args.wallet))
      .collect();

    // Get total earnings
    const earnings = await ctx.db
      .query("referralEarnings")
      .withIndex("by_referrer", (q) => q.eq("referrerWallet", args.wallet))
      .collect();

    const totalEarnings = earnings.reduce((sum, e) => sum + e.commissionAmount, 0);
    const totalVolume = earnings.reduce((sum, e) => sum + e.betAmount, 0);

    // Get recent referral activity
    const recentActivity = earnings
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    return {
      totalReferrals: referrals.length,
      totalEarnings,
      totalVolume,
      recentActivity,
      referrals: referrals.map(r => ({
        wallet: r.referredWallet,
        joinedAt: r.createdAt,
        isActive: r.isActive,
      })),
    };
  },
});

// Get referral leaderboard
export const getLeaderboard = query({
  handler: async (ctx) => {
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_referrals", (q) => q)
      .order("desc")
      .take(50);

    return stats.map((stat, index) => ({
      rank: index + 1,
      wallet: `${stat.wallet.slice(0, 4)}...${stat.wallet.slice(-4)}`,
      fullWallet: stat.wallet,
      totalReferred: stat.totalReferred,
      referralEarnings: stat.referralEarnings,
      totalVolume: stat.totalVolume,
    }));
  },
});

// Check if user was referred
export const getReferrer = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referred", (q) => q.eq("referredWallet", args.wallet))
      .first();

    return referral ? referral.referrerWallet : null;
  },
});