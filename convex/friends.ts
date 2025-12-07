import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// FRIEND QUERIES
// ============================================

// Get all friends (approved friendships)
export const getFriends = query({
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

    const kidId = session.kidId;

    // Get friendships where kid is either kid1 or kid2
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_kid1", (q) => q.eq("kidId1", kidId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_kid2", (q) => q.eq("kidId2", kidId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    const allFriendships = [...friendships1, ...friendships2];

    // Enrich with friend details
    const friends = await Promise.all(
      allFriendships.map(async (friendship) => {
        const friendId = friendship.kidId1 === kidId ? friendship.kidId2 : friendship.kidId1;
        const friend = await ctx.db.get(friendId);
        if (!friend) return null;

        // Get friend's virtual wallet for coins display
        const virtualWallet = await ctx.db
          .query("virtualWallets")
          .withIndex("by_kid", (q) => q.eq("kidId", friendId))
          .first();

        // Get friend's recent achievements count
        const achievements = await ctx.db
          .query("kidAchievements")
          .withIndex("by_kid", (q) => q.eq("kidId", friendId))
          .collect();

        return {
          friendship,
          friend: {
            _id: friend._id,
            name: friend.name,
            level: friend.level,
            xp: friend.xp,
            streak: friend.streak,
            coins: virtualWallet?.coins || 0,
            achievementCount: achievements.length,
          },
        };
      })
    );

    return friends.filter((f) => f !== null);
  },
});

// Get pending friend requests (received)
export const getPendingRequests = query({
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

    const kidId = session.kidId;

    // Get pending requests where this kid is the recipient (not the requester)
    const requests1 = await ctx.db
      .query("friendships")
      .withIndex("by_kid1", (q) => q.eq("kidId1", kidId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.neq(q.field("requestedBy"), kidId)
        )
      )
      .collect();

    const requests2 = await ctx.db
      .query("friendships")
      .withIndex("by_kid2", (q) => q.eq("kidId2", kidId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.neq(q.field("requestedBy"), kidId)
        )
      )
      .collect();

    const allRequests = [...requests1, ...requests2];

    // Enrich with requester details
    const enriched = await Promise.all(
      allRequests.map(async (request) => {
        const requesterId = request.requestedBy;
        const requester = await ctx.db.get(requesterId);
        if (!requester) return null;

        return {
          request,
          requester: {
            _id: requester._id,
            name: requester.name,
            level: requester.level,
          },
        };
      })
    );

    return enriched.filter((r) => r !== null);
  },
});

// Get sent friend requests (pending)
export const getSentRequests = query({
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

    const kidId = session.kidId;

    // Get pending requests where this kid is the requester
    const requests1 = await ctx.db
      .query("friendships")
      .withIndex("by_kid1", (q) => q.eq("kidId1", kidId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("requestedBy"), kidId)
        )
      )
      .collect();

    const requests2 = await ctx.db
      .query("friendships")
      .withIndex("by_kid2", (q) => q.eq("kidId2", kidId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("requestedBy"), kidId)
        )
      )
      .collect();

    const allRequests = [...requests1, ...requests2];

    // Enrich with recipient details
    const enriched = await Promise.all(
      allRequests.map(async (request) => {
        const recipientId = request.kidId1 === kidId ? request.kidId2 : request.kidId1;
        const recipient = await ctx.db.get(recipientId);
        if (!recipient) return null;

        return {
          request,
          recipient: {
            _id: recipient._id,
            name: recipient.name,
            level: recipient.level,
          },
        };
      })
    );

    return enriched.filter((r) => r !== null);
  },
});

// Search for kids to add as friends (by friend code or name)
export const searchKids = query({
  args: {
    token: v.string(),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return [];
    }

    const kidId = session.kidId;
    const kid = await ctx.db.get(kidId);
    if (!kid) return [];

    const searchLower = args.searchTerm.toLowerCase();

    // Get all kids from the same parent (siblings)
    const siblings = await ctx.db
      .query("kids")
      .withIndex("by_parent", (q) => q.eq("parentId", kid.parentId))
      .collect();

    // Filter by search term and exclude self
    const results = siblings
      .filter((k) => k._id !== kidId && k.name.toLowerCase().includes(searchLower))
      .map((k) => ({
        _id: k._id,
        name: k.name,
        level: k.level,
      }));

    // Check existing friendship status
    const resultsWithStatus = await Promise.all(
      results.map(async (result) => {
        // Check if friendship exists
        const friendship1 = await ctx.db
          .query("friendships")
          .withIndex("by_kid1", (q) => q.eq("kidId1", kidId))
          .filter((q) => q.eq(q.field("kidId2"), result._id))
          .first();

        const friendship2 = await ctx.db
          .query("friendships")
          .withIndex("by_kid2", (q) => q.eq("kidId2", kidId))
          .filter((q) => q.eq(q.field("kidId1"), result._id))
          .first();

        const friendship = friendship1 || friendship2;

        return {
          ...result,
          friendshipStatus: friendship?.status || null,
          friendshipId: friendship?._id || null,
        };
      })
    );

    return resultsWithStatus;
  },
});

// Get friend stats summary
export const getFriendStats = query({
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

    const kidId = session.kidId;

    // Count friends
    const friends1 = await ctx.db
      .query("friendships")
      .withIndex("by_kid1", (q) => q.eq("kidId1", kidId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    const friends2 = await ctx.db
      .query("friendships")
      .withIndex("by_kid2", (q) => q.eq("kidId2", kidId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    // Count pending requests received
    const pending1 = await ctx.db
      .query("friendships")
      .withIndex("by_kid1", (q) => q.eq("kidId1", kidId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.neq(q.field("requestedBy"), kidId)
        )
      )
      .collect();

    const pending2 = await ctx.db
      .query("friendships")
      .withIndex("by_kid2", (q) => q.eq("kidId2", kidId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.neq(q.field("requestedBy"), kidId)
        )
      )
      .collect();

    return {
      friendCount: friends1.length + friends2.length,
      pendingCount: pending1.length + pending2.length,
    };
  },
});

// ============================================
// FRIEND MUTATIONS
// ============================================

// Send friend request
export const sendFriendRequest = mutation({
  args: {
    token: v.string(),
    targetKidId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const kidId = session.kidId;

    if (kidId === args.targetKidId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if target kid exists
    const targetKid = await ctx.db.get(args.targetKidId);
    if (!targetKid) {
      throw new Error("Kid not found");
    }

    // Check if friendship already exists
    const existing1 = await ctx.db
      .query("friendships")
      .withIndex("by_kid1", (q) => q.eq("kidId1", kidId))
      .filter((q) => q.eq(q.field("kidId2"), args.targetKidId))
      .first();

    const existing2 = await ctx.db
      .query("friendships")
      .withIndex("by_kid2", (q) => q.eq("kidId2", kidId))
      .filter((q) => q.eq(q.field("kidId1"), args.targetKidId))
      .first();

    if (existing1 || existing2) {
      const existing = existing1 || existing2;
      if (existing?.status === "approved") {
        throw new Error("Already friends");
      }
      if (existing?.status === "pending") {
        throw new Error("Friend request already pending");
      }
      if (existing?.status === "blocked") {
        throw new Error("Cannot send friend request");
      }
    }

    const now = Date.now();
    const kid = await ctx.db.get(kidId);

    // Create friendship request
    await ctx.db.insert("friendships", {
      kidId1: kidId,
      kidId2: args.targetKidId,
      status: "pending",
      requestedBy: kidId,
      parentApproved: false, // Requires parent approval
      createdAt: now,
    });

    // Notify the target kid
    await ctx.db.insert("notifications", {
      kidId: args.targetKidId,
      type: "tip",
      title: "New Friend Request!",
      message: `${kid?.name || "Someone"} wants to be your friend!`,
      isRead: false,
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Sent friend request to ${targetKid.name}`,
      category: "social",
      createdAt: now,
    });

    return { success: true };
  },
});

// Accept friend request
export const acceptFriendRequest = mutation({
  args: {
    token: v.string(),
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const kidId = session.kidId;
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    // Verify this kid is the recipient (not the requester)
    if (friendship.requestedBy === kidId) {
      throw new Error("Cannot accept your own request");
    }

    // Verify this kid is part of the friendship
    if (friendship.kidId1 !== kidId && friendship.kidId2 !== kidId) {
      throw new Error("Unauthorized");
    }

    if (friendship.status !== "pending") {
      throw new Error("Request already processed");
    }

    const now = Date.now();
    const kid = await ctx.db.get(kidId);
    const requesterId = friendship.requestedBy;
    const requester = await ctx.db.get(requesterId);

    // Update friendship status
    await ctx.db.patch(args.friendshipId, {
      status: "approved",
      parentApproved: true, // Auto-approve for now (can add parent approval flow)
    });

    // Notify the requester
    await ctx.db.insert("notifications", {
      kidId: requesterId,
      type: "tip",
      title: "Friend Request Accepted!",
      message: `${kid?.name || "Someone"} accepted your friend request!`,
      isRead: false,
      createdAt: now,
    });

    // Log activity for both
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Became friends with ${requester?.name || "someone"}`,
      category: "social",
      createdAt: now,
    });

    await ctx.db.insert("activityLog", {
      kidId: requesterId,
      action: `Became friends with ${kid?.name || "someone"}`,
      category: "social",
      createdAt: now,
    });

    return { success: true };
  },
});

// Decline friend request
export const declineFriendRequest = mutation({
  args: {
    token: v.string(),
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const kidId = session.kidId;
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    // Verify this kid is the recipient (not the requester)
    if (friendship.requestedBy === kidId) {
      throw new Error("Use cancel instead");
    }

    // Verify this kid is part of the friendship
    if (friendship.kidId1 !== kidId && friendship.kidId2 !== kidId) {
      throw new Error("Unauthorized");
    }

    if (friendship.status !== "pending") {
      throw new Error("Request already processed");
    }

    // Delete the friendship request
    await ctx.db.delete(args.friendshipId);

    return { success: true };
  },
});

// Cancel sent friend request
export const cancelFriendRequest = mutation({
  args: {
    token: v.string(),
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const kidId = session.kidId;
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    // Verify this kid is the requester
    if (friendship.requestedBy !== kidId) {
      throw new Error("Can only cancel your own requests");
    }

    if (friendship.status !== "pending") {
      throw new Error("Request already processed");
    }

    // Delete the friendship request
    await ctx.db.delete(args.friendshipId);

    return { success: true };
  },
});

// Remove friend
export const removeFriend = mutation({
  args: {
    token: v.string(),
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      throw new Error("Unauthorized");
    }

    const kidId = session.kidId;
    const friendship = await ctx.db.get(args.friendshipId);

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    // Verify this kid is part of the friendship
    if (friendship.kidId1 !== kidId && friendship.kidId2 !== kidId) {
      throw new Error("Unauthorized");
    }

    if (friendship.status !== "approved") {
      throw new Error("Not friends");
    }

    // Delete the friendship
    await ctx.db.delete(args.friendshipId);

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: "Removed a friend",
      category: "social",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Get friend's public profile
export const getFriendProfile = query({
  args: {
    token: v.string(),
    friendId: v.id("kids"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return null;
    }

    const kidId = session.kidId;

    // Check if they are friends
    const friendship1 = await ctx.db
      .query("friendships")
      .withIndex("by_kid1", (q) => q.eq("kidId1", kidId))
      .filter((q) =>
        q.and(
          q.eq(q.field("kidId2"), args.friendId),
          q.eq(q.field("status"), "approved")
        )
      )
      .first();

    const friendship2 = await ctx.db
      .query("friendships")
      .withIndex("by_kid2", (q) => q.eq("kidId2", kidId))
      .filter((q) =>
        q.and(
          q.eq(q.field("kidId1"), args.friendId),
          q.eq(q.field("status"), "approved")
        )
      )
      .first();

    if (!friendship1 && !friendship2) {
      return null; // Not friends, can't view profile
    }

    const friend = await ctx.db.get(args.friendId);
    if (!friend) return null;

    // Get friend's data
    const virtualWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", args.friendId))
      .first();

    const achievements = await ctx.db
      .query("kidAchievements")
      .withIndex("by_kid", (q) => q.eq("kidId", args.friendId))
      .collect();

    // Get recent achievements with details
    const recentAchievements = await Promise.all(
      achievements.slice(0, 5).map(async (ka) => {
        const achievement = await ctx.db.get(ka.achievementId);
        return achievement
          ? {
              name: achievement.name,
              iconUrl: achievement.iconUrl,
              unlockedAt: ka.unlockedAt,
            }
          : null;
      })
    );

    const completedMissions = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_status", (q) =>
        q.eq("kidId", args.friendId).eq("status", "completed")
      )
      .collect();

    return {
      _id: friend._id,
      name: friend.name,
      level: friend.level,
      xp: friend.xp,
      streak: friend.streak,
      coins: virtualWallet?.coins || 0,
      achievementCount: achievements.length,
      recentAchievements: recentAchievements.filter((a) => a !== null),
      missionsCompleted: completedMissions.length,
      friendSince: (friendship1 || friendship2)?.createdAt,
    };
  },
});
