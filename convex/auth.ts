import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Simple hash function (in production, use bcrypt via an action)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36) + str.length.toString(36);
}

// Generate a random token
function generateToken(): string {
  return (
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2) +
    Date.now().toString(36)
  );
}

// ============================================
// PARENT AUTHENTICATION
// ============================================

export const registerParent = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      throw new Error("Email already registered");
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash: simpleHash(args.password),
      name: args.name,
      createdAt: Date.now(),
      settings: {
        language: args.language || "en",
        theme: "light",
        notifications: true,
      },
    });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("sessions", {
      userId,
      token,
      userType: "parent",
      expiresAt,
      createdAt: Date.now(),
    });

    return { userId, token };
  },
});

export const loginParent = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.passwordHash !== simpleHash(args.password)) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });

    // Create new session
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      userType: "parent",
      expiresAt,
      createdAt: Date.now(),
    });

    return { userId: user._id, token, user: { name: user.name, email: user.email } };
  },
});

// ============================================
// KID AUTHENTICATION
// ============================================

export const loginKid = mutation({
  args: {
    parentEmail: v.string(),
    kidName: v.string(),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    // Find parent by email
    const parent = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.parentEmail.toLowerCase()))
      .first();

    if (!parent) {
      throw new Error("Account not found");
    }

    // Find kid by parent and name
    const kid = await ctx.db
      .query("kids")
      .withIndex("by_parent_and_name", (q) =>
        q.eq("parentId", parent._id).eq("name", args.kidName)
      )
      .first();

    if (!kid) {
      throw new Error("Kid account not found");
    }

    if (kid.pin !== args.pin) {
      throw new Error("Invalid PIN");
    }

    // Update last login and streak
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak = kid.streak;
    if (kid.lastActiveDate === yesterday) {
      newStreak = kid.streak + 1;
    } else if (kid.lastActiveDate !== today) {
      newStreak = 1;
    }

    await ctx.db.patch(kid._id, {
      lastLoginAt: Date.now(),
      lastActiveDate: today,
      streak: newStreak,
    });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days for kids

    await ctx.db.insert("sessions", {
      kidId: kid._id,
      token,
      userType: "kid",
      expiresAt,
      createdAt: Date.now(),
    });

    return {
      kidId: kid._id,
      token,
      kid: {
        name: kid.name,
        level: kid.level,
        xp: kid.xp,
        streak: newStreak,
      },
    };
  },
});

// ============================================
// SESSION MANAGEMENT
// ============================================

export const validateSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      return null;
    }

    if (session.userType === "parent" && session.userId) {
      const user = await ctx.db.get(session.userId);
      if (!user) return null;
      return {
        type: "parent" as const,
        userId: session.userId,
        user: { name: user.name, email: user.email, settings: user.settings },
      };
    }

    if (session.userType === "kid" && session.kidId) {
      const kid = await ctx.db.get(session.kidId);
      if (!kid) return null;

      // Get virtual wallet
      const virtualWallet = await ctx.db
        .query("virtualWallets")
        .withIndex("by_kid", (q) => q.eq("kidId", session.kidId as Id<"kids">))
        .first();

      return {
        type: "kid" as const,
        kidId: session.kidId,
        kid: {
          name: kid.name,
          level: kid.level,
          xp: kid.xp,
          streak: kid.streak,
          coins: virtualWallet?.coins || 0,
          settings: kid.settings,
        },
      };
    }

    return null;
  },
});

export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// ============================================
// KID MANAGEMENT (by Parent)
// ============================================

export const addKid = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    pin: v.string(),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate parent session
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

    const parent = await ctx.db.get(session.userId);
    if (!parent) {
      throw new Error("Parent not found");
    }

    // Check if kid name already exists for this parent
    const existingKid = await ctx.db
      .query("kids")
      .withIndex("by_parent_and_name", (q) =>
        q.eq("parentId", session.userId!).eq("name", args.name)
      )
      .first();

    if (existingKid) {
      throw new Error("A child with this name already exists");
    }

    // Validate PIN (4-6 digits)
    if (!/^\d{4,6}$/.test(args.pin)) {
      throw new Error("PIN must be 4-6 digits");
    }

    // Create kid account
    const kidId = await ctx.db.insert("kids", {
      parentId: session.userId,
      name: args.name,
      pin: args.pin,
      birthDate: args.birthDate,
      createdAt: Date.now(),
      settings: {
        language: parent.settings.language,
        theme: parent.settings.theme,
      },
      level: 1,
      xp: 0,
      streak: 0,
    });

    // Create real money wallet
    await ctx.db.insert("wallets", {
      kidId,
      balance: 0,
      currency: "USD",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create virtual coins wallet
    await ctx.db.insert("virtualWallets", {
      kidId,
      coins: 100, // Starting bonus!
      lifetimeEarned: 100,
      lifetimeSpent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create avatar config
    await ctx.db.insert("avatarConfigs", {
      kidId,
      equippedItems: {},
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      parentId: session.userId,
      action: "Kid account created",
      category: "auth",
      createdAt: Date.now(),
    });

    // Welcome notification
    await ctx.db.insert("notifications", {
      kidId,
      type: "tip",
      title: "Welcome to Money n Play!",
      message: "You received 100 coins to start your adventure!",
      isRead: false,
      createdAt: Date.now(),
    });

    return { kidId };
  },
});

export const getKids = query({
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

    if (session.expiresAt < Date.now()) {
      return [];
    }

    const kids = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentId", session.userId!))
      .collect();

    // Get wallets for each kid
    const kidsWithWallets = await Promise.all(
      kids.map(async (kid) => {
        const wallet = await ctx.db
          .query("wallets")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .first();

        const virtualWallet = await ctx.db
          .query("virtualWallets")
          .withIndex("by_kid", (q) => q.eq("kidId", kid._id))
          .first();

        return {
          _id: kid._id,
          name: kid.name,
          level: kid.level,
          xp: kid.xp,
          streak: kid.streak,
          balance: wallet?.balance || 0,
          coins: virtualWallet?.coins || 0,
          lastActiveDate: kid.lastActiveDate,
        };
      })
    );

    return kidsWithWallets;
  },
});
