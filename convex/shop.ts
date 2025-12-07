import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// BROWSE SHOP ITEMS
// ============================================

export const getShopItems = query({
  args: {
    filterType: v.optional(v.string()),
    filterRarity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("avatarItems")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter by type
    if (args.filterType) {
      items = items.filter((item) => item.type === args.filterType);
    }

    // Filter by rarity
    if (args.filterRarity) {
      items = items.filter((item) => item.rarity === args.filterRarity);
    }

    // Sort by price (free items first, then by price)
    items.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.coinPrice - b.coinPrice;
    });

    return items;
  },
});

export const getShopItemsByType = query({
  args: {
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("avatarItems")
      .withIndex("by_type", (q) => q.eq("type", args.type as any))
      .collect();

    return items.filter((item) => item.isActive);
  },
});

export const getShopItemById = query({
  args: {
    itemId: v.id("avatarItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.itemId);
  },
});

// ============================================
// CHECK OWNERSHIP
// ============================================

export const checkOwnership = query({
  args: {
    token: v.string(),
    itemId: v.id("avatarItems"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "kid" || !session.kidId) {
      return false;
    }

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_kid_and_item", (q) =>
        q.eq("kidId", session.kidId!).eq("itemId", args.itemId)
      )
      .first();

    return inventory !== null;
  },
});

export const getOwnedItemIds = query({
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

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    return inventory.map((inv) => inv.itemId);
  },
});

// ============================================
// PURCHASE FROM SHOP
// ============================================

export const purchaseItem = mutation({
  args: {
    token: v.string(),
    itemId: v.id("avatarItems"),
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

    // Get item
    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      throw new Error("Item not available");
    }

    // Check if already owned
    const existingInventory = await ctx.db
      .query("inventory")
      .withIndex("by_kid_and_item", (q) =>
        q.eq("kidId", kidId).eq("itemId", args.itemId)
      )
      .first();

    if (existingInventory) {
      throw new Error("You already own this item");
    }

    // Get virtual wallet
    const wallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Check funds (skip for free/default items)
    if (item.coinPrice > 0 && wallet.coins < item.coinPrice) {
      throw new Error("Insufficient coins");
    }

    // Deduct coins (if not free)
    if (item.coinPrice > 0) {
      await ctx.db.patch(wallet._id, {
        coins: wallet.coins - item.coinPrice,
        lifetimeSpent: wallet.lifetimeSpent + item.coinPrice,
        updatedAt: Date.now(),
      });

      // Record transaction
      await ctx.db.insert("coinTransactions", {
        kidId,
        type: "purchase",
        amount: -item.coinPrice,
        description: `Bought ${item.name} from shop`,
        relatedId: args.itemId,
        createdAt: Date.now(),
      });
    }

    // Add to inventory
    await ctx.db.insert("inventory", {
      kidId,
      itemId: args.itemId,
      acquiredAt: Date.now(),
      acquiredFrom: item.isDefault ? "starter" : "shop",
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: item.coinPrice > 0
        ? `Bought ${item.name} for ${item.coinPrice} coins`
        : `Claimed free item: ${item.name}`,
      category: "shop",
      createdAt: Date.now(),
    });

    return {
      success: true,
      itemName: item.name,
      coinPrice: item.coinPrice,
    };
  },
});

// ============================================
// AVATAR CONFIGURATION
// ============================================

export const getAvatarConfig = query({
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

    const config = await ctx.db
      .query("avatarConfigs")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .first();

    if (!config) {
      return {
        equippedItems: {},
        items: {},
      };
    }

    // Fetch actual item data for equipped items
    const equippedItemsData: Record<string, any> = {};

    for (const [slot, itemId] of Object.entries(config.equippedItems)) {
      if (itemId) {
        const item = await ctx.db.get(itemId as Id<"avatarItems">);
        if (item) {
          equippedItemsData[slot] = item;
        }
      }
    }

    return {
      ...config,
      items: equippedItemsData,
    };
  },
});

export const equipItem = mutation({
  args: {
    token: v.string(),
    itemId: v.id("avatarItems"),
    slot: v.string(),
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

    // Verify ownership
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_kid_and_item", (q) =>
        q.eq("kidId", kidId).eq("itemId", args.itemId)
      )
      .first();

    if (!inventory) {
      throw new Error("You don't own this item");
    }

    // Get item to verify slot matches type
    const item = await ctx.db.get(args.itemId);
    if (!item || item.type !== args.slot) {
      throw new Error("Item type doesn't match slot");
    }

    // Get or create avatar config
    let config = await ctx.db
      .query("avatarConfigs")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .first();

    if (!config) {
      // Create new config
      await ctx.db.insert("avatarConfigs", {
        kidId,
        equippedItems: {
          [args.slot]: args.itemId,
        },
        updatedAt: Date.now(),
      });
    } else {
      // Update existing config
      const newEquippedItems = {
        ...config.equippedItems,
        [args.slot]: args.itemId,
      };

      await ctx.db.patch(config._id, {
        equippedItems: newEquippedItems,
        updatedAt: Date.now(),
      });
    }

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Equipped ${item.name}`,
      category: "avatar",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const unequipItem = mutation({
  args: {
    token: v.string(),
    slot: v.string(),
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

    const config = await ctx.db
      .query("avatarConfigs")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .first();

    if (!config) {
      return { success: true };
    }

    const newEquippedItems = { ...config.equippedItems };
    delete (newEquippedItems as any)[args.slot];

    await ctx.db.patch(config._id, {
      equippedItems: newEquippedItems,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// GET INVENTORY BY TYPE (for avatar editor)
// ============================================

export const getInventoryByType = query({
  args: {
    token: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "kid" || !session.kidId) {
      return [];
    }

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    const itemsWithDetails = await Promise.all(
      inventory.map(async (inv) => {
        const item = await ctx.db.get(inv.itemId);
        if (!item || item.type !== args.type) return null;
        return {
          ...inv,
          item,
        };
      })
    );

    return itemsWithDetails.filter((i) => i !== null);
  },
});

// ============================================
// CLAIM FREE STARTER ITEMS
// ============================================

export const claimStarterItems = mutation({
  args: {
    token: v.string(),
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

    // Get all default items
    const defaultItems = await ctx.db
      .query("avatarItems")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();

    let claimedCount = 0;

    for (const item of defaultItems) {
      // Check if already owned
      const existing = await ctx.db
        .query("inventory")
        .withIndex("by_kid_and_item", (q) =>
          q.eq("kidId", kidId).eq("itemId", item._id)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("inventory", {
          kidId,
          itemId: item._id,
          acquiredAt: Date.now(),
          acquiredFrom: "starter",
        });
        claimedCount++;
      }
    }

    if (claimedCount > 0) {
      await ctx.db.insert("activityLog", {
        kidId,
        action: `Claimed ${claimedCount} starter items`,
        category: "shop",
        createdAt: Date.now(),
      });
    }

    return { success: true, claimedCount };
  },
});

// ============================================
// SHOP STATS
// ============================================

export const getShopStats = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("avatarItems")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const byRarity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const item of items) {
      byRarity[item.rarity] = (byRarity[item.rarity] || 0) + 1;
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    return {
      totalItems: items.length,
      byRarity,
      byType,
    };
  },
});
