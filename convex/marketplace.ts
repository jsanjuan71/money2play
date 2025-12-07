import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// BROWSE MARKETPLACE
// ============================================

export const getActiveListings = query({
  args: {
    token: v.optional(v.string()),
    filterType: v.optional(v.string()),
    filterRarity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let kidId: Id<"kids"> | null = null;

    // Get current kid if authenticated (to exclude own listings)
    if (args.token) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", args.token!))
        .first();

      if (session && session.userType === "kid" && session.kidId) {
        if (session.expiresAt >= Date.now()) {
          kidId = session.kidId;
        }
      }
    }

    // Get all active listings
    const listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Enrich with item and seller data
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        const item = await ctx.db.get(listing.itemId);
        const seller = await ctx.db.get(listing.sellerId);

        if (!item || !seller) return null;

        // Apply filters
        if (args.filterType && item.type !== args.filterType) return null;
        if (args.filterRarity && item.rarity !== args.filterRarity) return null;

        return {
          ...listing,
          item,
          seller: {
            _id: seller._id,
            name: seller.name,
            level: seller.level,
          },
          isOwnListing: kidId ? listing.sellerId === kidId : false,
        };
      })
    );

    return enrichedListings.filter((l) => l !== null);
  },
});

export const getListingById = query({
  args: {
    listingId: v.id("marketplaceListings"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return null;

    const item = await ctx.db.get(listing.itemId);
    const seller = await ctx.db.get(listing.sellerId);

    if (!item || !seller) return null;

    return {
      ...listing,
      item,
      seller: {
        _id: seller._id,
        name: seller.name,
        level: seller.level,
      },
    };
  },
});

// ============================================
// KID'S INVENTORY & LISTINGS
// ============================================

export const getMyInventory = query({
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

    const kidId = session.kidId;

    // Get kid's inventory
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .collect();

    // Get active listings to know which items are listed
    const activeListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", kidId))
      .collect();

    const listedInventoryIds = new Set(
      activeListings
        .filter((l) => l.status === "active")
        .map((l) => l.inventoryId)
    );

    // Enrich with item data
    const enrichedInventory = await Promise.all(
      inventory.map(async (inv) => {
        const item = await ctx.db.get(inv.itemId);
        if (!item) return null;

        return {
          ...inv,
          item,
          isListed: listedInventoryIds.has(inv._id),
        };
      })
    );

    return enrichedInventory.filter((i) => i !== null);
  },
});

export const getMyListings = query({
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

    const listings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", session.kidId!))
      .collect();

    // Enrich with item and buyer data
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        const item = await ctx.db.get(listing.itemId);
        if (!item) return null;

        let buyer = null;
        if (listing.buyerId) {
          const buyerData = await ctx.db.get(listing.buyerId);
          if (buyerData) {
            buyer = {
              _id: buyerData._id,
              name: buyerData.name,
            };
          }
        }

        return {
          ...listing,
          item,
          buyer,
        };
      })
    );

    return enrichedListings.filter((l) => l !== null);
  },
});

export const getMarketplaceStats = query({
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

    const kidId = session.kidId;

    // Get my listings
    const myListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", kidId))
      .collect();

    const activeListings = myListings.filter((l) => l.status === "active");
    const soldListings = myListings.filter((l) => l.status === "sold");

    // Calculate total earned from sales
    const totalEarned = soldListings.reduce((sum, l) => sum + l.coinPrice, 0);

    // Get coin transactions for purchases
    const coinTransactions = await ctx.db
      .query("coinTransactions")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .collect();

    const purchases = coinTransactions.filter(
      (t) => t.type === "marketplace_purchase"
    );
    const totalSpent = purchases.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      activeListings: activeListings.length,
      totalSold: soldListings.length,
      totalEarned,
      totalSpent,
    };
  },
});

// ============================================
// CREATE & MANAGE LISTINGS
// ============================================

export const createListing = mutation({
  args: {
    token: v.string(),
    inventoryId: v.id("inventory"),
    coinPrice: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.coinPrice <= 0) {
      throw new Error("Price must be positive");
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

    // Verify ownership of inventory item
    const inventoryItem = await ctx.db.get(args.inventoryId);
    if (!inventoryItem || inventoryItem.kidId !== kidId) {
      throw new Error("Item not found in your inventory");
    }

    // Check if item is already listed
    const existingListing = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", kidId))
      .collect();

    const alreadyListed = existingListing.find(
      (l) => l.inventoryId === args.inventoryId && l.status === "active"
    );

    if (alreadyListed) {
      throw new Error("This item is already listed");
    }

    // Get item details
    const item = await ctx.db.get(inventoryItem.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Create listing
    const listingId = await ctx.db.insert("marketplaceListings", {
      sellerId: kidId,
      itemId: inventoryItem.itemId,
      inventoryId: args.inventoryId,
      coinPrice: args.coinPrice,
      description: args.description,
      status: "active",
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Listed ${item.name} for ${args.coinPrice} coins`,
      category: "marketplace",
      createdAt: Date.now(),
    });

    return { success: true, listingId };
  },
});

export const cancelListing = mutation({
  args: {
    token: v.string(),
    listingId: v.id("marketplaceListings"),
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

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.sellerId !== session.kidId) {
      throw new Error("Listing not found");
    }

    if (listing.status !== "active") {
      throw new Error("Listing is not active");
    }

    // Cancel listing
    await ctx.db.patch(args.listingId, {
      status: "cancelled",
    });

    // Get item for log
    const item = await ctx.db.get(listing.itemId);

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId: session.kidId,
      action: `Cancelled listing for ${item?.name || "item"}`,
      category: "marketplace",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateListingPrice = mutation({
  args: {
    token: v.string(),
    listingId: v.id("marketplaceListings"),
    newPrice: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.newPrice <= 0) {
      throw new Error("Price must be positive");
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

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.sellerId !== session.kidId) {
      throw new Error("Listing not found");
    }

    if (listing.status !== "active") {
      throw new Error("Listing is not active");
    }

    await ctx.db.patch(args.listingId, {
      coinPrice: args.newPrice,
    });

    return { success: true };
  },
});

// ============================================
// PURCHASE ITEMS
// ============================================

export const purchaseListing = mutation({
  args: {
    token: v.string(),
    listingId: v.id("marketplaceListings"),
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

    const buyerId = session.kidId;

    // Get listing
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "active") {
      throw new Error("Listing not available");
    }

    // Can't buy own item
    if (listing.sellerId === buyerId) {
      throw new Error("You cannot buy your own item");
    }

    // Get buyer's virtual wallet
    const buyerWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", buyerId))
      .first();

    if (!buyerWallet || buyerWallet.coins < listing.coinPrice) {
      throw new Error("Insufficient coins");
    }

    // Get seller's virtual wallet
    const sellerWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", listing.sellerId))
      .first();

    if (!sellerWallet) {
      throw new Error("Seller wallet not found");
    }

    // Get item details
    const item = await ctx.db.get(listing.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Get seller and buyer names
    const seller = await ctx.db.get(listing.sellerId);
    const buyer = await ctx.db.get(buyerId);

    // === TRANSACTION ===

    // 1. Deduct coins from buyer
    await ctx.db.patch(buyerWallet._id, {
      coins: buyerWallet.coins - listing.coinPrice,
      lifetimeSpent: buyerWallet.lifetimeSpent + listing.coinPrice,
      updatedAt: Date.now(),
    });

    // 2. Add coins to seller
    await ctx.db.patch(sellerWallet._id, {
      coins: sellerWallet.coins + listing.coinPrice,
      lifetimeEarned: sellerWallet.lifetimeEarned + listing.coinPrice,
      updatedAt: Date.now(),
    });

    // 3. Transfer inventory item - delete old and create new
    await ctx.db.delete(listing.inventoryId);
    await ctx.db.insert("inventory", {
      kidId: buyerId,
      itemId: listing.itemId,
      acquiredAt: Date.now(),
      acquiredFrom: "marketplace",
    });

    // 4. Mark listing as sold
    await ctx.db.patch(args.listingId, {
      status: "sold",
      buyerId: buyerId,
      soldAt: Date.now(),
    });

    // 5. Record coin transactions
    await ctx.db.insert("coinTransactions", {
      kidId: buyerId,
      type: "marketplace_purchase",
      amount: -listing.coinPrice,
      description: `Bought ${item.name} from ${seller?.name || "Unknown"}`,
      relatedId: args.listingId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("coinTransactions", {
      kidId: listing.sellerId,
      type: "marketplace_sale",
      amount: listing.coinPrice,
      description: `Sold ${item.name} to ${buyer?.name || "Unknown"}`,
      relatedId: args.listingId,
      createdAt: Date.now(),
    });

    // 6. Log activities
    await ctx.db.insert("activityLog", {
      kidId: buyerId,
      action: `Bought ${item.name} for ${listing.coinPrice} coins`,
      category: "marketplace",
      createdAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      kidId: listing.sellerId,
      action: `Sold ${item.name} for ${listing.coinPrice} coins`,
      category: "marketplace",
      createdAt: Date.now(),
    });

    // 7. Send notifications
    await ctx.db.insert("notifications", {
      kidId: listing.sellerId,
      type: "marketplace_sale",
      title: "Item Sold!",
      message: `${buyer?.name || "Someone"} bought your ${item.name} for ${listing.coinPrice} coins!`,
      isRead: false,
      relatedId: args.listingId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      kidId: buyerId,
      type: "tip",
      title: "Purchase Complete!",
      message: `You now own ${item.name}. Check your inventory!`,
      isRead: false,
      createdAt: Date.now(),
    });

    return {
      success: true,
      itemName: item.name,
      coinPrice: listing.coinPrice,
    };
  },
});

// ============================================
// RECENT TRADES (PUBLIC)
// ============================================

export const getRecentTrades = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const soldListings = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status", (q) => q.eq("status", "sold"))
      .order("desc")
      .take(limit);

    const enrichedTrades = await Promise.all(
      soldListings.map(async (listing) => {
        const item = await ctx.db.get(listing.itemId);
        const seller = await ctx.db.get(listing.sellerId);
        const buyer = listing.buyerId
          ? await ctx.db.get(listing.buyerId)
          : null;

        if (!item) return null;

        return {
          _id: listing._id,
          item: {
            name: item.name,
            type: item.type,
            rarity: item.rarity,
            imageUrl: item.imageUrl,
          },
          coinPrice: listing.coinPrice,
          seller: seller?.name || "Unknown",
          buyer: buyer?.name || "Unknown",
          soldAt: listing.soldAt,
        };
      })
    );

    return enrichedTrades.filter((t) => t !== null);
  },
});

// ============================================
// SEED AVATAR ITEMS (DEV)
// ============================================

export const seedAvatarItemsDev = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("avatarItems").first();

    if (existing) {
      return { message: "Avatar items already exist" };
    }

    const now = Date.now();

    const items = [
      // Bodies
      {
        name: "Default Body",
        nameEs: "Cuerpo Predeterminado",
        type: "body" as const,
        imageUrl: "/avatars/body-default.png",
        coinPrice: 0,
        rarity: "common" as const,
        isDefault: true,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Robot Body",
        nameEs: "Cuerpo Robot",
        type: "body" as const,
        imageUrl: "/avatars/body-robot.png",
        coinPrice: 100,
        rarity: "uncommon" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      // Hair
      {
        name: "Spiky Hair",
        nameEs: "Pelo Puntiagudo",
        type: "hair" as const,
        imageUrl: "/avatars/hair-spiky.png",
        coinPrice: 50,
        rarity: "common" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Rainbow Hair",
        nameEs: "Pelo Arcoiris",
        type: "hair" as const,
        imageUrl: "/avatars/hair-rainbow.png",
        coinPrice: 200,
        rarity: "rare" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Crown Hair",
        nameEs: "Corona",
        type: "hair" as const,
        imageUrl: "/avatars/hair-crown.png",
        coinPrice: 500,
        rarity: "epic" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      // Outfits
      {
        name: "Default Outfit",
        nameEs: "Atuendo Predeterminado",
        type: "outfit" as const,
        imageUrl: "/avatars/outfit-default.png",
        coinPrice: 0,
        rarity: "common" as const,
        isDefault: true,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Superhero Outfit",
        nameEs: "Atuendo de Superhéroe",
        type: "outfit" as const,
        imageUrl: "/avatars/outfit-superhero.png",
        coinPrice: 150,
        rarity: "uncommon" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Space Suit",
        nameEs: "Traje Espacial",
        type: "outfit" as const,
        imageUrl: "/avatars/outfit-space.png",
        coinPrice: 300,
        rarity: "rare" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Golden Armor",
        nameEs: "Armadura Dorada",
        type: "outfit" as const,
        imageUrl: "/avatars/outfit-golden.png",
        coinPrice: 1000,
        rarity: "legendary" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      // Accessories
      {
        name: "Cool Sunglasses",
        nameEs: "Gafas de Sol",
        type: "accessory" as const,
        imageUrl: "/avatars/acc-sunglasses.png",
        coinPrice: 75,
        rarity: "common" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Magic Wand",
        nameEs: "Varita Mágica",
        type: "accessory" as const,
        imageUrl: "/avatars/acc-wand.png",
        coinPrice: 250,
        rarity: "rare" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Dragon Wings",
        nameEs: "Alas de Dragón",
        type: "accessory" as const,
        imageUrl: "/avatars/acc-wings.png",
        coinPrice: 750,
        rarity: "epic" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      // Pets
      {
        name: "Puppy",
        nameEs: "Cachorro",
        type: "pet" as const,
        imageUrl: "/avatars/pet-puppy.png",
        coinPrice: 200,
        rarity: "uncommon" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Baby Dragon",
        nameEs: "Dragón Bebé",
        type: "pet" as const,
        imageUrl: "/avatars/pet-dragon.png",
        coinPrice: 500,
        rarity: "epic" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Phoenix",
        nameEs: "Fénix",
        type: "pet" as const,
        imageUrl: "/avatars/pet-phoenix.png",
        coinPrice: 1500,
        rarity: "legendary" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      // Backgrounds
      {
        name: "Default Background",
        nameEs: "Fondo Predeterminado",
        type: "background" as const,
        imageUrl: "/avatars/bg-default.png",
        coinPrice: 0,
        rarity: "common" as const,
        isDefault: true,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Beach Background",
        nameEs: "Fondo de Playa",
        type: "background" as const,
        imageUrl: "/avatars/bg-beach.png",
        coinPrice: 100,
        rarity: "uncommon" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Space Background",
        nameEs: "Fondo Espacial",
        type: "background" as const,
        imageUrl: "/avatars/bg-space.png",
        coinPrice: 200,
        rarity: "rare" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
      {
        name: "Rainbow Castle",
        nameEs: "Castillo Arcoiris",
        type: "background" as const,
        imageUrl: "/avatars/bg-castle.png",
        coinPrice: 400,
        rarity: "epic" as const,
        isDefault: false,
        isActive: true,
        createdAt: now,
      },
    ];

    for (const item of items) {
      await ctx.db.insert("avatarItems", item);
    }

    return { message: `Seeded ${items.length} avatar items` };
  },
});
