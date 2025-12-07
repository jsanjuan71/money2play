import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// INVESTMENT OPTIONS (Available to invest in)
// ============================================

export const getInvestmentOptions = query({
  args: {},
  handler: async (ctx) => {
    const options = await ctx.db
      .query("investmentOptions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return options;
  },
});

export const getInvestmentOption = query({
  args: {
    optionId: v.id("investmentOptions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.optionId);
  },
});

// ============================================
// KID'S PORTFOLIO
// ============================================

export const getPortfolio = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "kid" || !session.kidId) {
      return [];
    }

    if (session.expiresAt < Date.now()) {
      return [];
    }

    const investments = await ctx.db
      .query("investments")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    // Get current prices for each investment
    const portfolioWithPrices = await Promise.all(
      investments.map(async (inv) => {
        const option = await ctx.db.get(inv.optionId);
        if (!option) return null;

        const currentValue = inv.shares * option.currentPrice;
        const gainLoss = currentValue - inv.totalInvested;
        const gainLossPercent =
          inv.totalInvested > 0
            ? ((gainLoss / inv.totalInvested) * 100).toFixed(2)
            : "0.00";

        return {
          ...inv,
          option,
          currentValue,
          gainLoss,
          gainLossPercent,
        };
      })
    );

    return portfolioWithPrices.filter((p) => p !== null);
  },
});

export const getPortfolioSummary = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "kid" || !session.kidId) {
      return null;
    }

    const investments = await ctx.db
      .query("investments")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const inv of investments) {
      const option = await ctx.db.get(inv.optionId);
      if (option) {
        totalInvested += inv.totalInvested;
        totalCurrentValue += inv.shares * option.currentPrice;
      }
    }

    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPercent =
      totalInvested > 0
        ? ((totalGainLoss / totalInvested) * 100).toFixed(2)
        : "0.00";

    return {
      totalInvested,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
      investmentCount: investments.length,
    };
  },
});

// ============================================
// BUY / SELL INVESTMENTS
// ============================================

export const buyInvestment = mutation({
  args: {
    token: v.string(),
    optionId: v.id("investmentOptions"),
    amount: v.number(), // in cents - how much to invest
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "kid" || !session.kidId) {
      throw new Error("Unauthorized");
    }

    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired");
    }

    const kidId = session.kidId;

    // Get investment option
    const option = await ctx.db.get(args.optionId);
    if (!option || !option.isActive) {
      throw new Error("Investment option not available");
    }

    // Get wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .first();

    if (!wallet || wallet.balance < args.amount) {
      throw new Error("Insufficient funds");
    }

    // Calculate shares to buy
    const sharesToBuy = args.amount / option.currentPrice;

    // Deduct from wallet
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance - args.amount,
      updatedAt: Date.now(),
    });

    // Check if already has this investment
    const existingInvestment = await ctx.db
      .query("investments")
      .withIndex("by_kid_and_option", (q) =>
        q.eq("kidId", kidId).eq("optionId", args.optionId)
      )
      .first();

    if (existingInvestment) {
      // Update existing investment
      const newTotalInvested = existingInvestment.totalInvested + args.amount;
      const newShares = existingInvestment.shares + sharesToBuy;
      const newAvgPrice = newTotalInvested / newShares;

      await ctx.db.patch(existingInvestment._id, {
        shares: newShares,
        totalInvested: newTotalInvested,
        averageBuyPrice: newAvgPrice,
        updatedAt: Date.now(),
      });
    } else {
      // Create new investment
      await ctx.db.insert("investments", {
        kidId,
        optionId: args.optionId,
        shares: sharesToBuy,
        averageBuyPrice: option.currentPrice,
        totalInvested: args.amount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Record transaction
    await ctx.db.insert("transactions", {
      kidId,
      walletId: wallet._id,
      type: "investment_buy",
      amount: -args.amount,
      description: `Bought ${sharesToBuy.toFixed(4)} shares of ${option.name}`,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Invested $${(args.amount / 100).toFixed(2)} in ${option.name}`,
      category: "investment",
      createdAt: Date.now(),
    });

    return { success: true, sharesBought: sharesToBuy };
  },
});

export const sellInvestment = mutation({
  args: {
    token: v.string(),
    optionId: v.id("investmentOptions"),
    shares: v.number(), // how many shares to sell
  },
  handler: async (ctx, args) => {
    if (args.shares <= 0) {
      throw new Error("Shares must be positive");
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "kid" || !session.kidId) {
      throw new Error("Unauthorized");
    }

    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired");
    }

    const kidId = session.kidId;

    // Get investment option
    const option = await ctx.db.get(args.optionId);
    if (!option) {
      throw new Error("Investment option not found");
    }

    // Get existing investment
    const investment = await ctx.db
      .query("investments")
      .withIndex("by_kid_and_option", (q) =>
        q.eq("kidId", kidId).eq("optionId", args.optionId)
      )
      .first();

    if (!investment || investment.shares < args.shares) {
      throw new Error("Insufficient shares");
    }

    // Calculate sale value
    const saleValue = Math.floor(args.shares * option.currentPrice);

    // Get wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Add to wallet
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance + saleValue,
      updatedAt: Date.now(),
    });

    // Update or delete investment
    const remainingShares = investment.shares - args.shares;
    const costBasisSold = (args.shares / investment.shares) * investment.totalInvested;
    const remainingInvested = investment.totalInvested - costBasisSold;

    if (remainingShares <= 0.0001) {
      // Essentially zero shares, delete the investment
      await ctx.db.delete(investment._id);
    } else {
      await ctx.db.patch(investment._id, {
        shares: remainingShares,
        totalInvested: remainingInvested,
        updatedAt: Date.now(),
      });
    }

    // Calculate gain/loss for this sale
    const gainLoss = saleValue - costBasisSold;

    // Record transaction
    await ctx.db.insert("transactions", {
      kidId,
      walletId: wallet._id,
      type: "investment_sell",
      amount: saleValue,
      description: `Sold ${args.shares.toFixed(4)} shares of ${option.name}${gainLoss >= 0 ? ` (+$${(gainLoss / 100).toFixed(2)})` : ` (-$${(Math.abs(gainLoss) / 100).toFixed(2)})`}`,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Sold ${option.name} for $${(saleValue / 100).toFixed(2)}`,
      category: "investment",
      details: gainLoss >= 0 ? `Profit: $${(gainLoss / 100).toFixed(2)}` : `Loss: $${(Math.abs(gainLoss) / 100).toFixed(2)}`,
      createdAt: Date.now(),
    });

    // Award coins for profitable trades!
    if (gainLoss > 0) {
      const coinReward = Math.floor(gainLoss / 100); // 1 coin per dollar profit
      if (coinReward > 0) {
        const virtualWallet = await ctx.db
          .query("virtualWallets")
          .withIndex("by_kid", (q) => q.eq("kidId", kidId))
          .first();

        if (virtualWallet) {
          await ctx.db.patch(virtualWallet._id, {
            coins: virtualWallet.coins + coinReward,
            lifetimeEarned: virtualWallet.lifetimeEarned + coinReward,
            updatedAt: Date.now(),
          });

          await ctx.db.insert("coinTransactions", {
            kidId,
            type: "achievement_bonus",
            amount: coinReward,
            description: `Profitable trade: ${option.name}`,
            createdAt: Date.now(),
          });

          await ctx.db.insert("notifications", {
            kidId,
            type: "tip",
            title: "Great Trade!",
            message: `You made a profit of $${(gainLoss / 100).toFixed(2)} and earned ${coinReward} coins!`,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    }

    return { success: true, saleValue, gainLoss };
  },
});

// ============================================
// ADMIN: SEED INVESTMENT OPTIONS
// ============================================

// Development seeder - no auth required
export const seedInvestmentOptionsDev = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("investmentOptions").first();

    if (existing) {
      return { message: "Investment options already exist" };
    }

    const now = Date.now();
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;

    const options = [
      {
        name: "Piggy Bank Savings",
        symbol: "PIGGY",
        description: "A safe place for your money that grows slowly but surely. Low risk, steady growth!",
        category: "savings_bond" as const,
        riskLevel: "low" as const,
        currentPrice: 1000,
        priceHistory: [
          { price: 980, timestamp: weekAgo },
          { price: 990, timestamp: dayAgo },
          { price: 1000, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Toy Company",
        symbol: "TOYS",
        description: "Invest in a company that makes awesome toys! Medium risk with good potential.",
        category: "stocks" as const,
        riskLevel: "medium" as const,
        currentPrice: 2500,
        priceHistory: [
          { price: 2300, timestamp: weekAgo },
          { price: 2450, timestamp: dayAgo },
          { price: 2500, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Video Game Studio",
        symbol: "GAME",
        description: "A company that makes popular video games. Can go up or down a lot!",
        category: "stocks" as const,
        riskLevel: "high" as const,
        currentPrice: 5000,
        priceHistory: [
          { price: 4500, timestamp: weekAgo },
          { price: 5200, timestamp: dayAgo },
          { price: 5000, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Ice Cream Shop",
        symbol: "ICECR",
        description: "Everyone loves ice cream! A tasty investment with medium risk.",
        category: "stocks" as const,
        riskLevel: "medium" as const,
        currentPrice: 1500,
        priceHistory: [
          { price: 1400, timestamp: weekAgo },
          { price: 1480, timestamp: dayAgo },
          { price: 1500, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Space Explorer Fund",
        symbol: "SPACE",
        description: "Invest in space technology! Very exciting but very risky.",
        category: "fun_fund" as const,
        riskLevel: "high" as const,
        currentPrice: 7500,
        priceHistory: [
          { price: 7000, timestamp: weekAgo },
          { price: 8000, timestamp: dayAgo },
          { price: 7500, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Pet Store Chain",
        symbol: "PETS",
        description: "A company with pet stores everywhere. Pets are always popular!",
        category: "stocks" as const,
        riskLevel: "low" as const,
        currentPrice: 2000,
        priceHistory: [
          { price: 1950, timestamp: weekAgo },
          { price: 1980, timestamp: dayAgo },
          { price: 2000, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Digital Coins",
        symbol: "DCOIN",
        description: "Virtual currency that can change price a lot. Very risky but exciting!",
        category: "crypto" as const,
        riskLevel: "high" as const,
        currentPrice: 3000,
        priceHistory: [
          { price: 2500, timestamp: weekAgo },
          { price: 3500, timestamp: dayAgo },
          { price: 3000, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Snack Factory",
        symbol: "SNACK",
        description: "Makes your favorite chips and snacks. People always buy snacks!",
        category: "stocks" as const,
        riskLevel: "low" as const,
        currentPrice: 1800,
        priceHistory: [
          { price: 1750, timestamp: weekAgo },
          { price: 1780, timestamp: dayAgo },
          { price: 1800, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
    ];

    for (const option of options) {
      await ctx.db.insert("investmentOptions", option);
    }

    return { message: "Seeded 8 investment options" };
  },
});

export const seedInvestmentOptions = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify parent (admin) session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent") {
      throw new Error("Unauthorized - only parents can seed data");
    }

    // Check if already seeded
    const existing = await ctx.db
      .query("investmentOptions")
      .first();

    if (existing) {
      return { message: "Investment options already exist" };
    }

    const now = Date.now();
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;

    // Kid-friendly investment options
    const options = [
      {
        name: "Piggy Bank Savings",
        symbol: "PIGGY",
        description: "A safe place for your money that grows slowly but surely. Low risk, steady growth!",
        category: "savings_bond" as const,
        riskLevel: "low" as const,
        currentPrice: 1000, // $10.00
        priceHistory: [
          { price: 980, timestamp: weekAgo },
          { price: 990, timestamp: dayAgo },
          { price: 1000, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Toy Company",
        symbol: "TOYS",
        description: "Invest in a company that makes awesome toys! Medium risk with good potential.",
        category: "stocks" as const,
        riskLevel: "medium" as const,
        currentPrice: 2500, // $25.00
        priceHistory: [
          { price: 2300, timestamp: weekAgo },
          { price: 2450, timestamp: dayAgo },
          { price: 2500, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Video Game Studio",
        symbol: "GAME",
        description: "A company that makes popular video games. Can go up or down a lot!",
        category: "stocks" as const,
        riskLevel: "high" as const,
        currentPrice: 5000, // $50.00
        priceHistory: [
          { price: 4500, timestamp: weekAgo },
          { price: 5200, timestamp: dayAgo },
          { price: 5000, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Ice Cream Shop",
        symbol: "ICECR",
        description: "Everyone loves ice cream! A tasty investment with medium risk.",
        category: "stocks" as const,
        riskLevel: "medium" as const,
        currentPrice: 1500, // $15.00
        priceHistory: [
          { price: 1400, timestamp: weekAgo },
          { price: 1480, timestamp: dayAgo },
          { price: 1500, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Space Explorer Fund",
        symbol: "SPACE",
        description: "Invest in space technology! Very exciting but very risky.",
        category: "fun_fund" as const,
        riskLevel: "high" as const,
        currentPrice: 7500, // $75.00
        priceHistory: [
          { price: 7000, timestamp: weekAgo },
          { price: 8000, timestamp: dayAgo },
          { price: 7500, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Pet Store Chain",
        symbol: "PETS",
        description: "A company with pet stores everywhere. Pets are always popular!",
        category: "stocks" as const,
        riskLevel: "low" as const,
        currentPrice: 2000, // $20.00
        priceHistory: [
          { price: 1950, timestamp: weekAgo },
          { price: 1980, timestamp: dayAgo },
          { price: 2000, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Digital Coins",
        symbol: "DCOIN",
        description: "Virtual currency that can change price a lot. Very risky but exciting!",
        category: "crypto" as const,
        riskLevel: "high" as const,
        currentPrice: 3000, // $30.00
        priceHistory: [
          { price: 2500, timestamp: weekAgo },
          { price: 3500, timestamp: dayAgo },
          { price: 3000, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
      {
        name: "Snack Factory",
        symbol: "SNACK",
        description: "Makes your favorite chips and snacks. People always buy snacks!",
        category: "stocks" as const,
        riskLevel: "low" as const,
        currentPrice: 1800, // $18.00
        priceHistory: [
          { price: 1750, timestamp: weekAgo },
          { price: 1780, timestamp: dayAgo },
          { price: 1800, timestamp: now },
        ],
        isActive: true,
        createdAt: now,
      },
    ];

    for (const option of options) {
      await ctx.db.insert("investmentOptions", option);
    }

    return { message: "Seeded 8 investment options" };
  },
});

// ============================================
// PRICE SIMULATION (called periodically)
// ============================================

export const simulatePriceChanges = mutation({
  args: {},
  handler: async (ctx) => {
    const options = await ctx.db
      .query("investmentOptions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const now = Date.now();

    for (const option of options) {
      // Determine price change based on risk level
      let maxChange: number;
      switch (option.riskLevel) {
        case "low":
          maxChange = 0.02; // ±2%
          break;
        case "medium":
          maxChange = 0.05; // ±5%
          break;
        case "high":
          maxChange = 0.10; // ±10%
          break;
        default:
          maxChange = 0.03;
      }

      // Random price change with slight upward bias (markets tend to go up long term)
      const changePercent = (Math.random() * 2 - 0.9) * maxChange; // -0.9 to 1.1 * maxChange
      const newPrice = Math.max(
        100, // minimum $1.00
        Math.round(option.currentPrice * (1 + changePercent))
      );

      // Update price history (keep last 30 entries)
      const newHistory = [
        ...option.priceHistory.slice(-29),
        { price: newPrice, timestamp: now },
      ];

      await ctx.db.patch(option._id, {
        currentPrice: newPrice,
        priceHistory: newHistory,
      });
    }

    return { updated: options.length };
  },
});
