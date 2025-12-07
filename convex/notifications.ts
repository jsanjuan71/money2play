import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// KID NOTIFICATION QUERIES
// ============================================

// Get all notifications for a kid
export const getKidNotifications = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return [];
    }

    const limit = args.limit || 50;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Get unread notifications for a kid
export const getUnreadNotifications = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return [];
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_kid_unread", (q) =>
        q.eq("kidId", session.kidId!).eq("isRead", false)
      )
      .order("desc")
      .collect();

    return notifications;
  },
});

// Get unread count for a kid
export const getUnreadCount = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_kid_unread", (q) =>
        q.eq("kidId", session.kidId!).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

// Get notifications grouped by date
export const getNotificationsGrouped = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return { today: [], yesterday: [], earlier: [], unreadCount: 0 };
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .order("desc")
      .take(100);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const today: typeof notifications = [];
    const yesterday: typeof notifications = [];
    const earlier: typeof notifications = [];
    let unreadCount = 0;

    for (const notification of notifications) {
      if (!notification.isRead) unreadCount++;

      if (notification.createdAt >= todayStart) {
        today.push(notification);
      } else if (notification.createdAt >= yesterdayStart) {
        yesterday.push(notification);
      } else {
        earlier.push(notification);
      }
    }

    return { today, yesterday, earlier, unreadCount };
  },
});

// ============================================
// KID NOTIFICATION MUTATIONS
// ============================================

// Mark a single notification as read
export const markAsRead = mutation({
  args: {
    token: v.string(),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.kidId !== session.kidId) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return { success: true };
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_kid_unread", (q) =>
        q.eq("kidId", session.kidId!).eq("isRead", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
      });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: {
    token: v.string(),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.kidId !== session.kidId) {
      throw new Error("Notification not found");
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});

// Clear all notifications (keep last 7 days)
export const clearOldNotifications = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .filter((q) => q.lt(q.field("createdAt"), sevenDaysAgo))
      .collect();

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }

    return { success: true, count: oldNotifications.length };
  },
});

// ============================================
// CREATE NOTIFICATION (Internal helper)
// ============================================

export const createNotification = mutation({
  args: {
    token: v.string(),
    type: v.union(
      v.literal("approval_request"),
      v.literal("approval_response"),
      v.literal("allowance_received"),
      v.literal("mission_completed"),
      v.literal("goal_reached"),
      v.literal("marketplace_sale"),
      v.literal("level_up"),
      v.literal("streak_bonus"),
      v.literal("tip")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const notificationId = await ctx.db.insert("notifications", {
      kidId: session.kidId,
      type: args.type,
      title: args.title,
      message: args.message,
      isRead: false,
      relatedId: args.relatedId,
      createdAt: Date.now(),
    });

    return { success: true, notificationId };
  },
});

// ============================================
// DAILY LOGIN STREAK CHECK
// ============================================

export const checkDailyLogin = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return { streakUpdated: false };
    }

    const kid = await ctx.db.get(session.kidId);
    if (!kid) return { streakUpdated: false };

    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Already logged in today
    if (kid.lastActiveDate === today) {
      return { streakUpdated: false, currentStreak: kid.streak };
    }

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let newStreak = 1;
    let streakBonus = 0;

    // Continue streak if last active was yesterday
    if (kid.lastActiveDate === yesterday) {
      newStreak = kid.streak + 1;

      // Award streak bonuses at milestones
      if (newStreak === 3) streakBonus = 10;
      else if (newStreak === 7) streakBonus = 25;
      else if (newStreak === 14) streakBonus = 50;
      else if (newStreak === 30) streakBonus = 100;
      else if (newStreak % 30 === 0) streakBonus = 100; // Every 30 days
    }

    // Update kid's streak
    await ctx.db.patch(session.kidId, {
      streak: newStreak,
      lastActiveDate: today,
      lastLoginAt: Date.now(),
    });

    // Award daily login bonus
    const virtualWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .first();

    const dailyBonus = 5; // 5 coins daily login
    const totalBonus = dailyBonus + streakBonus;

    if (virtualWallet && totalBonus > 0) {
      await ctx.db.patch(virtualWallet._id, {
        coins: virtualWallet.coins + totalBonus,
        lifetimeEarned: virtualWallet.lifetimeEarned + totalBonus,
        updatedAt: Date.now(),
      });

      // Record transaction
      await ctx.db.insert("coinTransactions", {
        kidId: session.kidId,
        type: "daily_login",
        amount: totalBonus,
        description: streakBonus > 0
          ? `Daily login + ${newStreak}-day streak bonus!`
          : "Daily login bonus",
        createdAt: Date.now(),
      });
    }

    // Create notification for streak milestone
    if (streakBonus > 0) {
      await ctx.db.insert("notifications", {
        kidId: session.kidId,
        type: "streak_bonus",
        title: `${newStreak}-Day Streak!`,
        message: `Amazing! You've logged in ${newStreak} days in a row! +${streakBonus} bonus coins!`,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    // Always create daily login notification
    await ctx.db.insert("notifications", {
      kidId: session.kidId,
      type: "tip",
      title: "Welcome Back!",
      message: `Daily login bonus: +${dailyBonus} coins${newStreak > 1 ? ` | Streak: ${newStreak} days` : ""}`,
      isRead: false,
      createdAt: Date.now(),
    });

    return {
      streakUpdated: true,
      currentStreak: newStreak,
      dailyBonus,
      streakBonus,
      totalBonus,
    };
  },
});

// ============================================
// NOTIFICATION PREFERENCES (Future)
// ============================================

export const getNotificationSettings = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return null;
    }

    const kid = await ctx.db.get(session.kidId);
    if (!kid) return null;

    // Default settings - could be stored in kid.settings in the future
    return {
      missions: true,
      achievements: true,
      marketplace: true,
      allowance: true,
      tips: true,
    };
  },
});
