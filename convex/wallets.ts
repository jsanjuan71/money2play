import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// WALLET QUERIES
// ============================================

// Get kid's wallet (for parent or kid)
export const getWallet = query({
  args: {
    token: v.string(),
    kidId: v.optional(v.id("kids")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    let targetKidId: Id<"kids">;

    if (session.userType === "kid" && session.kidId) {
      targetKidId = session.kidId;
    } else if (session.userType === "parent" && args.kidId) {
      // Verify parent owns this kid
      const kid = await ctx.db.get(args.kidId);
      if (!kid || kid.parentId !== session.userId) {
        return null;
      }
      targetKidId = args.kidId;
    } else {
      return null;
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", targetKidId))
      .first();

    const virtualWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", targetKidId))
      .first();

    return {
      wallet,
      virtualWallet,
    };
  },
});

// Get transaction history
export const getTransactions = query({
  args: {
    token: v.string(),
    kidId: v.optional(v.id("kids")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    let targetKidId: Id<"kids">;

    if (session.userType === "kid" && session.kidId) {
      targetKidId = session.kidId;
    } else if (session.userType === "parent" && args.kidId) {
      const kid = await ctx.db.get(args.kidId);
      if (!kid || kid.parentId !== session.userId) {
        return [];
      }
      targetKidId = args.kidId;
    } else {
      return [];
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_kid", (q) => q.eq("kidId", targetKidId))
      .order("desc")
      .take(args.limit || 50);

    return transactions;
  },
});

// Get coin transaction history
export const getCoinTransactions = query({
  args: {
    token: v.string(),
    kidId: v.optional(v.id("kids")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    let targetKidId: Id<"kids">;

    if (session.userType === "kid" && session.kidId) {
      targetKidId = session.kidId;
    } else if (session.userType === "parent" && args.kidId) {
      const kid = await ctx.db.get(args.kidId);
      if (!kid || kid.parentId !== session.userId) {
        return [];
      }
      targetKidId = args.kidId;
    } else {
      return [];
    }

    const transactions = await ctx.db
      .query("coinTransactions")
      .withIndex("by_kid", (q) => q.eq("kidId", targetKidId))
      .order("desc")
      .take(args.limit || 50);

    return transactions;
  },
});

// ============================================
// WALLET MUTATIONS (Parent actions)
// ============================================

// Parent deposits money to kid's wallet
export const depositMoney = mutation({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
    amount: v.number(), // in cents
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired");
    }

    // Verify parent owns this kid
    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentId !== session.userId) {
      throw new Error("Unauthorized");
    }

    // Get wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Update wallet balance
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance + args.amount,
      updatedAt: Date.now(),
    });

    // Create transaction record
    await ctx.db.insert("transactions", {
      kidId: args.kidId,
      walletId: wallet._id,
      type: "deposit",
      amount: args.amount,
      description: args.description || "Deposit from parent",
      parentId: session.userId,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId: args.kidId,
      parentId: session.userId,
      action: `Deposited ${(args.amount / 100).toFixed(2)}`,
      category: "money",
      details: args.description,
      createdAt: Date.now(),
    });

    // Notify kid
    await ctx.db.insert("notifications", {
      kidId: args.kidId,
      type: "allowance_received",
      title: "Money received!",
      message: `You received $${(args.amount / 100).toFixed(2)} from your parent!`,
      isRead: false,
      createdAt: Date.now(),
    });

    return { success: true, newBalance: wallet.balance + args.amount };
  },
});

// ============================================
// SAVINGS GOALS
// ============================================

export const getSavingsGoals = query({
  args: {
    token: v.string(),
    kidId: v.optional(v.id("kids")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    let targetKidId: Id<"kids">;

    if (session.userType === "kid" && session.kidId) {
      targetKidId = session.kidId;
    } else if (session.userType === "parent" && args.kidId) {
      const kid = await ctx.db.get(args.kidId);
      if (!kid || kid.parentId !== session.userId) {
        return [];
      }
      targetKidId = args.kidId;
    } else {
      return [];
    }

    const goals = await ctx.db
      .query("savingsGoals")
      .withIndex("by_kid", (q) => q.eq("kidId", targetKidId))
      .collect();

    return goals;
  },
});

export const createSavingsGoal = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    targetAmount: v.number(), // in cents
    imageUrl: v.optional(v.string()),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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

    if (args.targetAmount <= 0) {
      throw new Error("Target amount must be positive");
    }

    const goalId = await ctx.db.insert("savingsGoals", {
      kidId,
      name: args.name,
      targetAmount: args.targetAmount,
      currentAmount: 0,
      imageUrl: args.imageUrl,
      deadline: args.deadline,
      isCompleted: false,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Created savings goal: ${args.name}`,
      category: "savings",
      createdAt: Date.now(),
    });

    return { goalId };
  },
});

export const addToSavingsGoal = mutation({
  args: {
    token: v.string(),
    goalId: v.id("savingsGoals"),
    amount: v.number(), // in cents
  },
  handler: async (ctx, args) => {
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

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Get goal
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.kidId !== kidId) {
      throw new Error("Goal not found");
    }

    if (goal.isCompleted) {
      throw new Error("Goal already completed");
    }

    // Get wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .first();

    if (!wallet || wallet.balance < args.amount) {
      throw new Error("Insufficient funds");
    }

    // Deduct from wallet
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance - args.amount,
      updatedAt: Date.now(),
    });

    // Add to goal
    const newAmount = goal.currentAmount + args.amount;
    const isCompleted = newAmount >= goal.targetAmount;

    await ctx.db.patch(args.goalId, {
      currentAmount: newAmount,
      isCompleted,
      completedAt: isCompleted ? Date.now() : undefined,
    });

    // Create transaction
    await ctx.db.insert("transactions", {
      kidId,
      walletId: wallet._id,
      type: "transfer_to_savings",
      amount: -args.amount,
      description: `Saved to: ${goal.name}`,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Added $${(args.amount / 100).toFixed(2)} to savings goal`,
      category: "savings",
      details: goal.name,
      createdAt: Date.now(),
    });

    // If goal completed, reward with coins!
    if (isCompleted) {
      const coinReward = Math.floor(goal.targetAmount / 100); // 1 coin per dollar saved
      const xpReward = 50;

      // Get virtual wallet
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
          kidId: kidId,
          type: "achievement_bonus",
          amount: coinReward,
          description: `Completed savings goal: ${goal.name}`,
          relatedId: args.goalId,
          createdAt: Date.now(),
        });
      }

      // Add XP
      const kid = await ctx.db.get(kidId);
      if (kid) {
        const newXp = kid.xp + xpReward;
        const newLevel = Math.floor(newXp / 100) + 1;

        await ctx.db.patch(kidId, {
          xp: newXp,
          level: newLevel,
        });

        // Level up notification
        if (newLevel > kid.level) {
          await ctx.db.insert("notifications", {
            kidId: kidId,
            type: "level_up",
            title: "Level Up!",
            message: `Congratulations! You reached Level ${newLevel}!`,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }

      // Goal completed notification
      await ctx.db.insert("notifications", {
        kidId: kidId,
        type: "goal_reached",
        title: "Goal Reached!",
        message: `You completed your savings goal: ${goal.name}! You earned ${coinReward} coins!`,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { success: true, isCompleted, newAmount };
  },
});

export const withdrawFromSavingsGoal = mutation({
  args: {
    token: v.string(),
    goalId: v.id("savingsGoals"),
    amount: v.number(), // in cents
  },
  handler: async (ctx, args) => {
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

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Get goal
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.kidId !== kidId) {
      throw new Error("Goal not found");
    }

    if (goal.currentAmount < args.amount) {
      throw new Error("Insufficient savings");
    }

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
      balance: wallet.balance + args.amount,
      updatedAt: Date.now(),
    });

    // Deduct from goal
    await ctx.db.patch(args.goalId, {
      currentAmount: goal.currentAmount - args.amount,
      isCompleted: false, // Uncomplete if they withdraw
      completedAt: undefined,
    });

    // Create transaction
    await ctx.db.insert("transactions", {
      kidId,
      walletId: wallet._id,
      type: "transfer_from_savings",
      amount: args.amount,
      description: `Withdrawn from: ${goal.name}`,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Withdrew $${(args.amount / 100).toFixed(2)} from savings goal`,
      category: "savings",
      details: goal.name,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteSavingsGoal = mutation({
  args: {
    token: v.string(),
    goalId: v.id("savingsGoals"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "kid" || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const kidId = session.kidId;

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.kidId !== kidId) {
      throw new Error("Goal not found");
    }

    // If there's money in the goal, transfer it back to wallet
    if (goal.currentAmount > 0) {
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("by_kid", (q) => q.eq("kidId", kidId))
        .first();

      if (wallet) {
        await ctx.db.patch(wallet._id, {
          balance: wallet.balance + goal.currentAmount,
          updatedAt: Date.now(),
        });

        await ctx.db.insert("transactions", {
          kidId,
          walletId: wallet._id,
          type: "transfer_from_savings",
          amount: goal.currentAmount,
          description: `Deleted goal: ${goal.name}`,
          createdAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(args.goalId);

    return { success: true };
  },
});
