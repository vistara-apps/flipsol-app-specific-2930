import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Record a new bet
export const recordBet = mutation({
  args: {
    userWallet: v.string(),
    roundId: v.number(),
    side: v.number(),
    amount: v.number(),
    txSignature: v.string(),
    referrerWallet: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Record the bet
    const betId = await ctx.db.insert("userBets", {
      userWallet: args.userWallet,
      roundId: args.roundId,
      side: args.side,
      amount: args.amount,
      claimed: false,
      referrerWallet: args.referrerWallet,
      txSignature: args.txSignature,
      createdAt: Date.now(),
    });

    // Update user stats
    const stats = await ctx.db
      .query("userStats")
      .filter((q) => q.eq(q.field("wallet"), args.userWallet))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalVolume: stats.totalVolume + args.amount,
        totalBets: stats.totalBets + 1,
        lastActiveAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userStats", {
        wallet: args.userWallet,
        totalVolume: args.amount,
        totalWinnings: 0,
        totalBets: 1,
        winRate: 0,
        biggestWin: 0,
        totalReferred: 0,
        referralEarnings: 0,
        lastActiveAt: Date.now(),
        createdAt: Date.now(),
      });
    }

    // Add to activity feed
    await ctx.db.insert("activityFeed", {
      type: "bet",
      userWallet: args.userWallet,
      amount: args.amount,
      roundId: args.roundId,
      side: args.side,
      message: `${args.userWallet.slice(0, 4)}...${args.userWallet.slice(-4)} bet ${args.amount} SOL on ${args.side === 0 ? 'Heads' : 'Tails'}`,
      createdAt: Date.now(),
    });

    // Record referral earnings if applicable
    if (args.referrerWallet) {
      const commissionRate = 0.005; // 0.5% of bet
      const commissionAmount = args.amount * commissionRate;

      await ctx.db.insert("referralEarnings", {
        referrerWallet: args.referrerWallet,
        referredWallet: args.userWallet,
        roundId: args.roundId,
        betAmount: args.amount,
        commissionAmount,
        commissionRate,
        gameType: "coinflip",
        createdAt: Date.now(),
      });

      // Update referrer stats
      const referrerStats = await ctx.db
        .query("userStats")
        .filter((q) => q.eq(q.field("wallet"), args.referrerWallet))
        .first();

      if (referrerStats) {
        await ctx.db.patch(referrerStats._id, {
          referralEarnings: referrerStats.referralEarnings + commissionAmount,
          lastActiveAt: Date.now(),
        });
      }
    }

    return betId;
  },
});

// Record round settlement
export const recordRoundSettlement = mutation({
  args: {
    roundId: v.number(),
    winningSide: v.number(),
    headsTotal: v.number(),
    tailsTotal: v.number(),
    totalPot: v.number(),
    rakeAmount: v.number(),
    jackpotAmount: v.number(),
    participantCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Record round data
    await ctx.db.insert("gameRounds", {
      roundId: args.roundId,
      winningSide: args.winningSide,
      headsTotal: args.headsTotal,
      tailsTotal: args.tailsTotal,
      totalPot: args.totalPot,
      rakeAmount: args.rakeAmount,
      jackpotAmount: args.jackpotAmount,
      participantCount: args.participantCount,
      settlementTime: Date.now(),
      createdAt: Date.now(),
    });

    // Update all user bets for this round
    const bets = await ctx.db
      .query("userBets")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect();

    const winningSidePot = args.winningSide === 0 ? args.headsTotal : args.tailsTotal;
    const netPot = args.totalPot - args.rakeAmount - args.jackpotAmount;

    for (const bet of bets) {
      const won = bet.side === args.winningSide;
      let payout = 0;

      if (won && winningSidePot > 0) {
        payout = (bet.amount / winningSidePot) * netPot;
      }

      await ctx.db.patch(bet._id, {
        won,
        payout,
      });

      // Update user stats for winners
      if (won && payout > 0) {
        const userStats = await ctx.db
          .query("userStats")
          .filter((q) => q.eq(q.field("wallet"), bet.userWallet))
          .first();

        if (userStats) {
          const newTotalWinnings = userStats.totalWinnings + payout;
          const newWinRate = ((userStats.winRate * (userStats.totalBets - 1)) + (won ? 1 : 0)) / userStats.totalBets;
          const newBiggestWin = Math.max(userStats.biggestWin, payout);

          await ctx.db.patch(userStats._id, {
            totalWinnings: newTotalWinnings,
            winRate: newWinRate,
            biggestWin: newBiggestWin,
            lastActiveAt: Date.now(),
          });

          // Add win to activity feed
          await ctx.db.insert("activityFeed", {
            type: "win",
            userWallet: bet.userWallet,
            amount: payout,
            roundId: args.roundId,
            side: bet.side,
            message: `${bet.userWallet.slice(0, 4)}...${bet.userWallet.slice(-4)} won ${payout.toFixed(3)} SOL!`,
            createdAt: Date.now(),
          });
        }
      }
    }

    // Check for jackpot trigger (rare wins)
    if (args.jackpotAmount > 10) { // Threshold for jackpot notification
      await ctx.db.insert("activityFeed", {
        type: "jackpot",
        userWallet: "system",
        amount: args.jackpotAmount,
        roundId: args.roundId,
        message: `🎰 Jackpot of ${args.jackpotAmount.toFixed(2)} SOL hit in Round #${args.roundId}!`,
        createdAt: Date.now(),
      });
    }
  },
});

// Get user betting history
export const getUserHistory = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("userBets")
      .withIndex("by_user", (q) => q.eq("userWallet", args.wallet))
      .order("desc")
      .take(50);

    return bets.map(bet => ({
      roundId: bet.roundId,
      side: bet.side,
      amount: bet.amount,
      won: bet.won,
      payout: bet.payout,
      claimed: bet.claimed,
      createdAt: bet.createdAt,
    }));
  },
});

// Get live activity feed
export const getActivityFeed = query({
  handler: async (ctx) => {
    const activity = await ctx.db
      .query("activityFeed")
      .withIndex("by_time", (q) => q)
      .order("desc")
      .take(20);

    return activity.map(item => ({
      type: item.type,
      message: item.message,
      amount: item.amount,
      createdAt: item.createdAt,
    }));
  },
});

// Get recent bets for live feed
export const getRecentBets = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const bets = await ctx.db
      .query("userBets")
      .withIndex("by_time", (q) => q)
      .order("desc")
      .take(limit);

    return bets.map(bet => ({
      _id: bet._id,
      userWallet: bet.userWallet,
      roundId: bet.roundId,
      side: bet.side,
      amount: bet.amount,
      createdAt: bet.createdAt,
    }));
  },
});

// Get leaderboard
export const getGameLeaderboard = query({
  handler: async (ctx) => {
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_winnings", (q) => q)
      .order("desc")
      .take(50);

    return stats.map((stat, index) => ({
      rank: index + 1,
      wallet: `${stat.wallet.slice(0, 4)}...${stat.wallet.slice(-4)}`,
      totalVolume: stat.totalVolume,
      totalWinnings: stat.totalWinnings,
      winRate: stat.winRate,
      biggestWin: stat.biggestWin,
    }));
  },
});