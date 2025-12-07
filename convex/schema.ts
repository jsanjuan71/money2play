import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // USERS & AUTHENTICATION
  // ============================================

  // Parent accounts
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    settings: v.object({
      language: v.string(),
      theme: v.string(),
      notifications: v.boolean(),
    }),
  })
    .index("by_email", ["email"]),

  // Child accounts (linked to parent)
  kids: defineTable({
    parentId: v.id("users"),
    name: v.string(),
    pin: v.string(), // 4-6 digit PIN for kid login
    birthDate: v.optional(v.string()),
    avatarId: v.optional(v.id("avatarConfigs")),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    settings: v.object({
      language: v.string(),
      theme: v.string(),
    }),
    // Gamification
    level: v.number(),
    xp: v.number(),
    streak: v.number(), // days in a row
    lastActiveDate: v.optional(v.string()),
  })
    .index("by_parent", ["parentId"])
    .index("by_parent_and_name", ["parentId", "name"]),

  // Sessions for auth
  sessions: defineTable({



    userId: v.optional(v.id("users")),
    kidId: v.optional(v.id("kids")),
    token: v.string(),
    userType: v.union(v.literal("parent"), v.literal("kid")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_kid", ["kidId"]),

  // ============================================
  // WALLETS & MONEY
  // ============================================

  // Real money wallet (non-withdrawable by kids)
  wallets: defineTable({
    kidId: v.id("kids"),
    balance: v.number(), // in cents to avoid float issues
    currency: v.string(), // "USD", "EUR", etc.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidId"]),

  // Virtual coins wallet (earned through missions, learning)
  virtualWallets: defineTable({
    kidId: v.id("kids"),
    coins: v.number(),
    lifetimeEarned: v.number(),
    lifetimeSpent: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidId"]),

  // All transactions (real money)
  transactions: defineTable({
    kidId: v.id("kids"),
    walletId: v.id("wallets"),
    type: v.union(
      v.literal("deposit"), // parent adds money
      v.literal("allowance"), // recurring allowance
      v.literal("transfer_to_savings"),
      v.literal("transfer_from_savings"),
      v.literal("investment_buy"),
      v.literal("investment_sell")
    ),
    amount: v.number(), // in cents, positive or negative
    description: v.string(),
    parentId: v.optional(v.id("users")), // who initiated if parent
    approvalId: v.optional(v.id("approvalRequests")),
    createdAt: v.number(),
  })
    .index("by_kid", ["kidId"])
    .index("by_wallet", ["walletId"])
    .index("by_kid_and_date", ["kidId", "createdAt"]),

  // Virtual coin transactions
  coinTransactions: defineTable({
    kidId: v.id("kids"),
    type: v.union(
      v.literal("mission_reward"),
      v.literal("learning_reward"),
      v.literal("achievement_bonus"),
      v.literal("daily_login"),
      v.literal("purchase"),
      v.literal("marketplace_sale"),
      v.literal("marketplace_purchase")
    ),
    amount: v.number(), // positive = earned, negative = spent
    description: v.string(),
    relatedId: v.optional(v.string()), // mission ID, item ID, etc.
    createdAt: v.number(),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_and_date", ["kidId", "createdAt"]),

  // ============================================
  // SAVINGS & GOALS
  // ============================================

  savingsGoals: defineTable({
    kidId: v.id("kids"),
    name: v.string(),
    targetAmount: v.number(), // in cents
    currentAmount: v.number(),
    imageUrl: v.optional(v.string()),
    deadline: v.optional(v.number()),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_active", ["kidId", "isCompleted"]),

  // ============================================
  // SIMULATED INVESTMENTS
  // ============================================

  // Available investment options (admin-created)
  investmentOptions: defineTable({
    name: v.string(),
    symbol: v.string(), // "GOOG", "APPL" - simplified
    description: v.string(),
    category: v.union(
      v.literal("stocks"),
      v.literal("crypto"),
      v.literal("savings_bond"),
      v.literal("fun_fund") // kid-friendly names
    ),
    riskLevel: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    currentPrice: v.number(), // in cents
    priceHistory: v.array(v.object({
      price: v.number(),
      timestamp: v.number(),
    })),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_category", ["category"]),

  // Kid's investment holdings
  investments: defineTable({
    kidId: v.id("kids"),
    optionId: v.id("investmentOptions"),
    shares: v.number(), // can be fractional
    averageBuyPrice: v.number(),
    totalInvested: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_and_option", ["kidId", "optionId"]),

  // ============================================
  // MISSIONS & LEARNING
  // ============================================

  // Mission templates (admin-created)
  missions: defineTable({
    title: v.string(),
    titleEs: v.string(), // Spanish translation
    description: v.string(),
    descriptionEs: v.string(),
    type: v.union(
      v.literal("savings"), // "Save $5 this week"
      v.literal("learning"), // "Watch a video about budgeting"
      v.literal("decision"), // "Choose needs vs wants"
      v.literal("investment"), // "Make your first investment"
      v.literal("social"), // "Help a friend in marketplace"
      v.literal("daily") // Daily tasks
    ),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
    coinReward: v.number(),
    xpReward: v.number(),
    requirements: v.object({
      minAge: v.optional(v.number()),
      maxAge: v.optional(v.number()),
      prerequisiteMissions: v.optional(v.array(v.id("missions"))),
      minLevel: v.optional(v.number()),
    }),
    // For savings missions
    targetAmount: v.optional(v.number()),
    // For time-limited missions
    durationDays: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_active", ["isActive"]),

  // Kid's mission progress
  missionProgress: defineTable({
    kidId: v.id("kids"),
    missionId: v.id("missions"),
    status: v.union(
      v.literal("available"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("expired")
    ),
    progress: v.number(), // 0-100
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_and_mission", ["kidId", "missionId"])
    .index("by_kid_and_status", ["kidId", "status"]),

  // Educational content
  educationalContent: defineTable({
    title: v.string(),
    titleEs: v.string(),
    description: v.string(),
    descriptionEs: v.string(),
    type: v.union(
      v.literal("video"),
      v.literal("article"),
      v.literal("quiz"),
      v.literal("story")
    ),
    category: v.union(
      v.literal("budgeting"),
      v.literal("saving"),
      v.literal("investing"),
      v.literal("earning"),
      v.literal("spending_wisely"),
      v.literal("needs_vs_wants")
    ),
    contentUrl: v.optional(v.string()),
    content: v.optional(v.string()), // for articles/stories
    thumbnailUrl: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    coinReward: v.number(),
    xpReward: v.number(),
    ageRange: v.object({
      min: v.number(),
      max: v.number(),
    }),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // Track what content kids have viewed/completed
  contentProgress: defineTable({
    kidId: v.id("kids"),
    contentId: v.id("educationalContent"),
    isCompleted: v.boolean(),
    watchedSeconds: v.optional(v.number()),
    quizScore: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_and_content", ["kidId", "contentId"]),

  // ============================================
  // AVATARS & COSMETICS
  // ============================================

  // Available avatar items (shop items)
  avatarItems: defineTable({
    name: v.string(),
    nameEs: v.string(),
    type: v.union(
      v.literal("body"),
      v.literal("hair"),
      v.literal("eyes"),
      v.literal("mouth"),
      v.literal("outfit"),
      v.literal("accessory"),
      v.literal("background"),
      v.literal("pet")
    ),
    imageUrl: v.string(),
    coinPrice: v.number(),
    rarity: v.union(
      v.literal("common"),
      v.literal("uncommon"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary")
    ),
    isDefault: v.boolean(), // free starter items
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_rarity", ["rarity"])
    .index("by_default", ["isDefault"]),

  // Kid's avatar configuration
  avatarConfigs: defineTable({
    kidId: v.id("kids"),
    equippedItems: v.object({
      body: v.optional(v.id("avatarItems")),
      hair: v.optional(v.id("avatarItems")),
      eyes: v.optional(v.id("avatarItems")),
      mouth: v.optional(v.id("avatarItems")),
      outfit: v.optional(v.id("avatarItems")),
      accessory: v.optional(v.id("avatarItems")),
      background: v.optional(v.id("avatarItems")),
      pet: v.optional(v.id("avatarItems")),
    }),
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidId"]),

  // Kid's inventory (owned items)
  inventory: defineTable({
    kidId: v.id("kids"),
    itemId: v.id("avatarItems"),
    acquiredAt: v.number(),
    acquiredFrom: v.union(
      v.literal("shop"),
      v.literal("reward"),
      v.literal("marketplace"),
      v.literal("starter")
    ),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_and_item", ["kidId", "itemId"]),

  // ============================================
  // MARKETPLACE (Virtual items between kids)
  // ============================================

  marketplaceListings: defineTable({
    sellerId: v.id("kids"),
    itemId: v.id("avatarItems"),
    inventoryId: v.id("inventory"),
    coinPrice: v.number(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("sold"),
      v.literal("cancelled")
    ),
    buyerId: v.optional(v.id("kids")),
    soldAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_seller", ["sellerId"])
    .index("by_status", ["status"])
    .index("by_item", ["itemId"]),

  // ============================================
  // PARENTAL CONTROLS & APPROVALS
  // ============================================

  approvalRequests: defineTable({
    kidId: v.id("kids"),
    parentId: v.id("users"),
    type: v.union(
      v.literal("withdraw_to_savings"),
      v.literal("large_purchase"),
      v.literal("investment"),
      v.literal("marketplace_listing"),
      v.literal("friend_request")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    details: v.object({
      amount: v.optional(v.number()),
      itemId: v.optional(v.string()),
      description: v.string(),
    }),
    parentNote: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_kid", ["kidId"])
    .index("by_parent_and_status", ["parentId", "status"]),

  // Allowance configuration
  allowanceConfig: defineTable({
    kidId: v.id("kids"),
    parentId: v.id("users"),
    amount: v.number(), // in cents
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly")
    ),
    dayOfWeek: v.optional(v.number()), // 0-6 for weekly
    dayOfMonth: v.optional(v.number()), // 1-31 for monthly
    isActive: v.boolean(),
    nextPaymentAt: v.number(),
    lastPaymentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_kid", ["kidId"])
    .index("by_active", ["isActive"]),

  // ============================================
  // ACTIVITY & NOTIFICATIONS
  // ============================================

  activityLog: defineTable({
    kidId: v.id("kids"),
    parentId: v.optional(v.id("users")),
    action: v.string(),
    category: v.union(
      v.literal("auth"),
      v.literal("money"),
      v.literal("savings"),
      v.literal("investment"),
      v.literal("mission"),
      v.literal("learning"),
      v.literal("shop"),
      v.literal("marketplace"),
      v.literal("social"),
      v.literal("avatar")
    ),
    details: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_and_category", ["kidId", "category"])
    .index("by_kid_and_date", ["kidId", "createdAt"]),

  notifications: defineTable({
    userId: v.optional(v.id("users")),
    kidId: v.optional(v.id("kids")),
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
    isRead: v.boolean(),
    relatedId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_kid_unread", ["kidId", "isRead"]),

  // ============================================
  // ACHIEVEMENTS & BADGES
  // ============================================

  achievements: defineTable({
    name: v.string(),
    nameEs: v.string(),
    description: v.string(),
    descriptionEs: v.string(),
    iconUrl: v.string(),
    category: v.union(
      v.literal("savings"),
      v.literal("investing"),
      v.literal("learning"),
      v.literal("social"),
      v.literal("streak"),
      v.literal("milestone")
    ),
    requirement: v.object({
      type: v.string(),
      value: v.number(),
    }),
    coinReward: v.number(),
    xpReward: v.number(),
    isActive: v.boolean(),
  })
    .index("by_category", ["category"]),

  kidAchievements: defineTable({
    kidId: v.id("kids"),
    achievementId: v.id("achievements"),
    unlockedAt: v.number(),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_and_achievement", ["kidId", "achievementId"]),

  // ============================================
  // SOCIAL (Safe, parent-approved)
  // ============================================

  friendships: defineTable({
    kidId1: v.id("kids"),
    kidId2: v.id("kids"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("blocked")
    ),
    requestedBy: v.id("kids"),
    parentApproved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_kid1", ["kidId1"])
    .index("by_kid2", ["kidId2"])
    .index("by_status", ["status"]),
});
