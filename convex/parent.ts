import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// KIDS MANAGEMENT
// ============================================

export const getKidsWithDetails = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      return [];
    }

    const kids = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentId", session.userId!))
      .collect();

    const enrichedKids = await Promise.all(
      kids.map(async (kid) => {
        // Get wallet
        const wallet = await ctx.db
          .query("wallets")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .first();

        // Get virtual wallet
        const virtualWallet = await ctx.db
          .query("virtualWallets")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .first();

        // Get allowance config
        const allowance = await ctx.db
          .query("allowanceConfig")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .first();

        // Get savings goals
        const savingsGoals = await ctx.db
          .query("savingsGoals")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .collect();

        const activeSavings = savingsGoals.filter((g) => !g.isCompleted);
        const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);

        // Get recent activity
        const recentActivity = await ctx.db
          .query("activityLog")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .order("desc")
          .take(5);

        // Get investments summary
        const investments = await ctx.db
          .query("investments")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .collect();

        let investmentValue = 0;
        for (const inv of investments) {
          const option = await ctx.db.get(inv.optionId);
          if (option) {
            investmentValue += inv.shares * option.currentPrice;
          }
        }

        // Get completed missions count
        const completedMissions = await ctx.db
          .query("missionProgress")
          .withIndex("by_kid_and_status", (q) =>
            q.eq("kidId", kid._id).eq("status", "completed")
          )
          .collect();

        return {
          ...kid,
          wallet: wallet || { balance: 0 },
          virtualWallet: virtualWallet || { coins: 0, lifetimeEarned: 0 },
          allowance: allowance || null,
          savingsGoals: {
            active: activeSavings.length,
            totalSaved,
          },
          investments: {
            count: investments.length,
            totalValue: investmentValue,
          },
          missions: {
            completed: completedMissions.length,
          },
          recentActivity,
        };
      })
    );

    return enrichedKids;
  },
});

export const getKidDetails = query({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      return null;
    }

    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentId !== session.userId) {
      return null;
    }

    // Get all related data
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    const virtualWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .order("desc")
      .take(20);

    const coinTransactions = await ctx.db
      .query("coinTransactions")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .order("desc")
      .take(20);

    const savingsGoals = await ctx.db
      .query("savingsGoals")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .collect();

    const activityLog = await ctx.db
      .query("activityLog")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .order("desc")
      .take(50);

    const allowance = await ctx.db
      .query("allowanceConfig")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    return {
      kid,
      wallet,
      virtualWallet,
      transactions,
      coinTransactions,
      savingsGoals,
      activityLog,
      allowance,
    };
  },
});

export const updateKid = mutation({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
    name: v.optional(v.string()),
    pin: v.optional(v.string()),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentId !== session.userId) {
      throw new Error("Kid not found");
    }

    const updates: any = {};
    if (args.name) updates.name = args.name;
    if (args.pin) updates.pin = args.pin;
    if (args.birthDate !== undefined) updates.birthDate = args.birthDate;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.kidId, updates);
    }

    return { success: true };
  },
});

export const deleteKid = mutation({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentId !== session.userId) {
      throw new Error("Kid not found");
    }

    // Delete related records
    // Note: In production, you might want to soft-delete or archive instead

    // Delete wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();
    if (wallet) await ctx.db.delete(wallet._id);

    // Delete virtual wallet
    const virtualWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();
    if (virtualWallet) await ctx.db.delete(virtualWallet._id);

    // Delete allowance config
    const allowance = await ctx.db
      .query("allowanceConfig")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();
    if (allowance) await ctx.db.delete(allowance._id);

    // Delete the kid
    await ctx.db.delete(args.kidId);

    return { success: true };
  },
});

// ============================================
// ALLOWANCE MANAGEMENT
// ============================================

export const getAllowanceConfigs = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      return [];
    }

    const kids = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentId", session.userId!))
      .collect();

    const configs = await Promise.all(
      kids.map(async (kid) => {
        const config = await ctx.db
          .query("allowanceConfig")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .first();

        return {
          kid,
          config,
        };
      })
    );

    return configs;
  },
});

export const setAllowance = mutation({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
    amount: v.number(),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly")
    ),
    dayOfWeek: v.optional(v.number()),
    dayOfMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentId !== session.userId) {
      throw new Error("Kid not found");
    }

    const now = Date.now();

    // Calculate next payment
    let nextPaymentAt = now;
    switch (args.frequency) {
      case "daily":
        nextPaymentAt = now + 24 * 60 * 60 * 1000;
        break;
      case "weekly":
        nextPaymentAt = now + 7 * 24 * 60 * 60 * 1000;
        break;
      case "biweekly":
        nextPaymentAt = now + 14 * 24 * 60 * 60 * 1000;
        break;
      case "monthly":
        nextPaymentAt = now + 30 * 24 * 60 * 60 * 1000;
        break;
    }

    // Check if config exists
    const existing = await ctx.db
      .query("allowanceConfig")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        amount: args.amount,
        frequency: args.frequency,
        dayOfWeek: args.dayOfWeek,
        dayOfMonth: args.dayOfMonth,
        isActive: true,
        nextPaymentAt,
      });
    } else {
      await ctx.db.insert("allowanceConfig", {
        kidId: args.kidId,
        parentId: session.userId,
        amount: args.amount,
        frequency: args.frequency,
        dayOfWeek: args.dayOfWeek,
        dayOfMonth: args.dayOfMonth,
        isActive: true,
        nextPaymentAt,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const pauseAllowance = mutation({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    const config = await ctx.db
      .query("allowanceConfig")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    if (!config || config.parentId !== session.userId) {
      throw new Error("Allowance config not found");
    }

    await ctx.db.patch(config._id, {
      isActive: false,
    });

    return { success: true };
  },
});

export const resumeAllowance = mutation({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    const config = await ctx.db
      .query("allowanceConfig")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    if (!config || config.parentId !== session.userId) {
      throw new Error("Allowance config not found");
    }

    await ctx.db.patch(config._id, {
      isActive: true,
    });

    return { success: true };
  },
});

// ============================================
// APPROVAL REQUESTS
// ============================================

export const getPendingApprovals = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      return [];
    }

    const approvals = await ctx.db
      .query("approvalRequests")
      .withIndex("by_parent_and_status", (q) =>
        q.eq("parentId", session.userId!).eq("status", "pending")
      )
      .collect();

    // Enrich with kid data
    const enriched = await Promise.all(
      approvals.map(async (approval) => {
        const kid = await ctx.db.get(approval.kidId);
        return {
          ...approval,
          kid,
        };
      })
    );

    return enriched;
  },
});

export const getAllApprovals = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      return [];
    }

    const approvals = await ctx.db
      .query("approvalRequests")
      .withIndex("by_parent", (q) => q.eq("parentId", session.userId!))
      .order("desc")
      .take(50);

    // Enrich with kid data
    const enriched = await Promise.all(
      approvals.map(async (approval) => {
        const kid = await ctx.db.get(approval.kidId);
        return {
          ...approval,
          kid,
        };
      })
    );

    return enriched;
  },
});

export const approveRequest = mutation({
  args: {
    token: v.string(),
    approvalId: v.id("approvalRequests"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    const approval = await ctx.db.get(args.approvalId);
    if (!approval || approval.parentId !== session.userId) {
      throw new Error("Approval request not found");
    }

    if (approval.status !== "pending") {
      throw new Error("Request already processed");
    }

    const now = Date.now();

    await ctx.db.patch(args.approvalId, {
      status: "approved",
      parentNote: args.note,
      respondedAt: now,
    });

    // Notify kid
    await ctx.db.insert("notifications", {
      kidId: approval.kidId,
      type: "approval_response",
      title: "Request Approved!",
      message: `Your request "${approval.details.description}" was approved!`,
      isRead: false,
      relatedId: args.approvalId,
      createdAt: now,
    });

    return { success: true };
  },
});

export const rejectRequest = mutation({
  args: {
    token: v.string(),
    approvalId: v.id("approvalRequests"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    const approval = await ctx.db.get(args.approvalId);
    if (!approval || approval.parentId !== session.userId) {
      throw new Error("Approval request not found");
    }

    if (approval.status !== "pending") {
      throw new Error("Request already processed");
    }

    const now = Date.now();

    await ctx.db.patch(args.approvalId, {
      status: "rejected",
      parentNote: args.note,
      respondedAt: now,
    });

    // Notify kid
    await ctx.db.insert("notifications", {
      kidId: approval.kidId,
      type: "approval_response",
      title: "Request Not Approved",
      message: `Your request "${approval.details.description}" was not approved.${args.note ? ` Note: ${args.note}` : ""}`,
      isRead: false,
      relatedId: args.approvalId,
      createdAt: now,
    });

    return { success: true };
  },
});

// ============================================
// MONEY TRANSFERS
// ============================================

export const depositToKid = mutation({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
    amount: v.number(),
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

    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentId !== session.userId) {
      throw new Error("Kid not found");
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const now = Date.now();

    // Update wallet
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance + args.amount,
      updatedAt: now,
    });

    // Record transaction
    await ctx.db.insert("transactions", {
      kidId: args.kidId,
      walletId: wallet._id,
      type: "deposit",
      amount: args.amount,
      description: args.description || "Deposit from parent",
      parentId: session.userId,
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId: args.kidId,
      parentId: session.userId,
      action: `Received $${(args.amount / 100).toFixed(2)} from parent`,
      category: "money",
      createdAt: now,
    });

    // Notify kid
    await ctx.db.insert("notifications", {
      kidId: args.kidId,
      type: "allowance_received",
      title: "Money Received!",
      message: `You received $${(args.amount / 100).toFixed(2)}!`,
      isRead: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const giveCoins = mutation({
  args: {
    token: v.string(),
    kidId: v.id("kids"),
    amount: v.number(),
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

    const kid = await ctx.db.get(args.kidId);
    if (!kid || kid.parentId !== session.userId) {
      throw new Error("Kid not found");
    }

    const virtualWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", args.kidId))
      .first();

    if (!virtualWallet) {
      throw new Error("Virtual wallet not found");
    }

    const now = Date.now();

    // Update virtual wallet
    await ctx.db.patch(virtualWallet._id, {
      coins: virtualWallet.coins + args.amount,
      lifetimeEarned: virtualWallet.lifetimeEarned + args.amount,
      updatedAt: now,
    });

    // Record coin transaction
    await ctx.db.insert("coinTransactions", {
      kidId: args.kidId,
      type: "achievement_bonus",
      amount: args.amount,
      description: args.description || "Bonus coins from parent",
      createdAt: now,
    });

    // Notify kid
    await ctx.db.insert("notifications", {
      kidId: args.kidId,
      type: "tip",
      title: "Bonus Coins!",
      message: `You received ${args.amount} coins from your parent!`,
      isRead: false,
      createdAt: now,
    });

    return { success: true };
  },
});

// ============================================
// PARENT NOTIFICATIONS
// ============================================

export const getParentNotifications = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      return [];
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", session.userId!))
      .order("desc")
      .take(20);

    return notifications;
  },
});

export const markNotificationRead = mutation({
  args: {
    token: v.string(),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      throw new Error("Unauthorized");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== session.userId) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return { success: true };
  },
});

// ============================================
// PARENT DASHBOARD STATS
// ============================================

export const getDashboardStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "parent" || !session.userId) {
      return null;
    }

    const kids = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentId", session.userId!))
      .collect();

    let totalBalance = 0;
    let totalCoins = 0;
    let totalSaved = 0;
    let totalInvested = 0;

    for (const kid of kids) {
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
        .first();
      if (wallet) totalBalance += wallet.balance;

      const virtualWallet = await ctx.db
        .query("virtualWallets")
        .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
        .first();
      if (virtualWallet) totalCoins += virtualWallet.coins;

      const savingsGoals = await ctx.db
        .query("savingsGoals")
        .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
        .collect();
      totalSaved += savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);

      const investments = await ctx.db
        .query("investments")
        .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
        .collect();
      totalInvested += investments.reduce((sum, i) => sum + i.totalInvested, 0);
    }

    // Get pending approvals count
    const pendingApprovals = await ctx.db
      .query("approvalRequests")
      .withIndex("by_parent_and_status", (q) =>
        q.eq("parentId", session.userId!).eq("status", "pending")
      )
      .collect();

    return {
      kidsCount: kids.length,
      totalBalance,
      totalCoins,
      totalSaved,
      totalInvested,
      pendingApprovalsCount: pendingApprovals.length,
    };
  },
});
