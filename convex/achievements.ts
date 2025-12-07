import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// ACHIEVEMENT QUERIES
// ============================================

// Get all available achievements
export const getAllAchievements = query({
  args: {},
  handler: async (ctx) => {
    const achievements = await ctx.db
      .query("achievements")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return achievements;
  },
});

// Get achievements by category
export const getAchievementsByCategory = query({
  args: {
    category: v.union(
      v.literal("savings"),
      v.literal("investing"),
      v.literal("learning"),
      v.literal("social"),
      v.literal("streak"),
      v.literal("milestone")
    ),
  },
  handler: async (ctx, args) => {
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return achievements;
  },
});

// Get kid's unlocked achievements
export const getKidAchievements = query({
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

    const kidAchievements = await ctx.db
      .query("kidAchievements")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    // Enrich with achievement details
    const enriched = await Promise.all(
      kidAchievements.map(async (ka) => {
        const achievement = await ctx.db.get(ka.achievementId);
        return {
          ...ka,
          achievement,
        };
      })
    );

    return enriched.filter((e) => e.achievement !== null);
  },
});

// Get kid's achievement progress with all achievements
export const getAchievementProgress = query({
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

    // Get all achievements
    const allAchievements = await ctx.db
      .query("achievements")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get kid's unlocked achievements
    const unlockedAchievements = await ctx.db
      .query("kidAchievements")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    const unlockedIds = new Set(unlockedAchievements.map((ua) => ua.achievementId));

    // Calculate progress for each achievement
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .first();

    const virtualWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .first();

    const completedMissions = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_status", (q) =>
        q.eq("kidId", session.kidId!).eq("status", "completed")
      )
      .collect();

    const completedContent = await ctx.db
      .query("contentProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .filter((q) => q.eq(q.field("isCompleted"), true))
      .collect();

    const investments = await ctx.db
      .query("investments")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    const savingsGoals = await ctx.db
      .query("savingsGoals")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    const completedSavings = savingsGoals.filter((g) => g.isCompleted);

    const marketplaceSales = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", session.kidId!))
      .filter((q) => q.eq(q.field("status"), "sold"))
      .collect();

    // Calculate current values for different requirement types
    const currentValues: Record<string, number> = {
      total_saved: wallet?.balance || 0,
      coins_earned: virtualWallet?.lifetimeEarned || 0,
      missions_completed: completedMissions.length,
      content_completed: completedContent.length,
      investments_made: investments.length,
      savings_goals_completed: completedSavings.length,
      marketplace_sales: marketplaceSales.length,
      streak_days: kid.streak || 0,
      level_reached: kid.level || 1,
      xp_earned: kid.xp || 0,
      login_days: kid.streak || 0,
    };

    const achievementsWithProgress = allAchievements.map((achievement) => {
      const isUnlocked = unlockedIds.has(achievement._id);
      const unlockedData = unlockedAchievements.find(
        (ua) => ua.achievementId === achievement._id
      );

      const currentValue = currentValues[achievement.requirement.type] || 0;
      const progress = Math.min(
        100,
        Math.round((currentValue / achievement.requirement.value) * 100)
      );

      return {
        ...achievement,
        isUnlocked,
        unlockedAt: unlockedData?.unlockedAt,
        currentValue,
        targetValue: achievement.requirement.value,
        progress,
      };
    });

    // Sort: unlocked first (by date), then by progress descending
    achievementsWithProgress.sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      if (a.isUnlocked && b.isUnlocked) {
        return (b.unlockedAt || 0) - (a.unlockedAt || 0);
      }
      return b.progress - a.progress;
    });

    // Calculate stats
    const totalAchievements = allAchievements.length;
    const unlockedCount = unlockedAchievements.length;
    const totalCoinsFromAchievements = unlockedAchievements.reduce((sum, ua) => {
      const achievement = allAchievements.find((a) => a._id === ua.achievementId);
      return sum + (achievement?.coinReward || 0);
    }, 0);
    const totalXpFromAchievements = unlockedAchievements.reduce((sum, ua) => {
      const achievement = allAchievements.find((a) => a._id === ua.achievementId);
      return sum + (achievement?.xpReward || 0);
    }, 0);

    return {
      achievements: achievementsWithProgress,
      stats: {
        total: totalAchievements,
        unlocked: unlockedCount,
        percentage: totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0,
        totalCoinsEarned: totalCoinsFromAchievements,
        totalXpEarned: totalXpFromAchievements,
      },
    };
  },
});

// ============================================
// ACHIEVEMENT MUTATIONS
// ============================================

// Check and unlock achievements for a kid
export const checkAchievements = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || !session.kidId) {
      return { newAchievements: [] };
    }

    const kid = await ctx.db.get(session.kidId);
    if (!kid) return { newAchievements: [] };

    // Get all active achievements
    const allAchievements = await ctx.db
      .query("achievements")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get already unlocked achievements
    const unlockedAchievements = await ctx.db
      .query("kidAchievements")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    const unlockedIds = new Set(unlockedAchievements.map((ua) => ua.achievementId));

    // Get current values for all requirement types
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .first();

    const virtualWallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .first();

    const completedMissions = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_status", (q) =>
        q.eq("kidId", session.kidId!).eq("status", "completed")
      )
      .collect();

    const completedContent = await ctx.db
      .query("contentProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .filter((q) => q.eq(q.field("isCompleted"), true))
      .collect();

    const investments = await ctx.db
      .query("investments")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    const savingsGoals = await ctx.db
      .query("savingsGoals")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    const completedSavings = savingsGoals.filter((g) => g.isCompleted);

    const marketplaceSales = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", session.kidId!))
      .filter((q) => q.eq(q.field("status"), "sold"))
      .collect();

    const currentValues: Record<string, number> = {
      total_saved: wallet?.balance || 0,
      coins_earned: virtualWallet?.lifetimeEarned || 0,
      missions_completed: completedMissions.length,
      content_completed: completedContent.length,
      investments_made: investments.length,
      savings_goals_completed: completedSavings.length,
      marketplace_sales: marketplaceSales.length,
      streak_days: kid.streak || 0,
      level_reached: kid.level || 1,
      xp_earned: kid.xp || 0,
      login_days: kid.streak || 0,
    };

    const now = Date.now();
    const newlyUnlocked: any[] = [];

    // Check each achievement
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement._id)) continue;

      const currentValue = currentValues[achievement.requirement.type] || 0;
      if (currentValue >= achievement.requirement.value) {
        // Unlock the achievement
        await ctx.db.insert("kidAchievements", {
          kidId: session.kidId,
          achievementId: achievement._id,
          unlockedAt: now,
        });

        // Give rewards
        if (virtualWallet && (achievement.coinReward > 0 || achievement.xpReward > 0)) {
          await ctx.db.patch(virtualWallet._id, {
            coins: virtualWallet.coins + achievement.coinReward,
            lifetimeEarned: virtualWallet.lifetimeEarned + achievement.coinReward,
            updatedAt: now,
          });

          // Record coin transaction
          if (achievement.coinReward > 0) {
            await ctx.db.insert("coinTransactions", {
              kidId: session.kidId,
              type: "achievement_bonus",
              amount: achievement.coinReward,
              description: `Achievement unlocked: ${achievement.name}`,
              relatedId: achievement._id,
              createdAt: now,
            });
          }
        }

        // Update XP and level
        if (achievement.xpReward > 0) {
          const newXp = kid.xp + achievement.xpReward;
          const xpPerLevel = 100;
          const newLevel = Math.floor(newXp / xpPerLevel) + 1;

          await ctx.db.patch(session.kidId, {
            xp: newXp,
            level: newLevel,
          });

          // Check for level up notification
          if (newLevel > kid.level) {
            await ctx.db.insert("notifications", {
              kidId: session.kidId,
              type: "level_up",
              title: "Level Up!",
              message: `Congratulations! You reached level ${newLevel}!`,
              isRead: false,
              createdAt: now,
            });
          }
        }

        // Create notification
        await ctx.db.insert("notifications", {
          kidId: session.kidId,
          type: "mission_completed",
          title: "Achievement Unlocked!",
          message: `You earned the "${achievement.name}" badge! +${achievement.coinReward} coins, +${achievement.xpReward} XP`,
          isRead: false,
          relatedId: achievement._id,
          createdAt: now,
        });

        // Log activity
        await ctx.db.insert("activityLog", {
          kidId: session.kidId,
          action: `Unlocked achievement: ${achievement.name}`,
          category: "mission",
          details: `Earned ${achievement.coinReward} coins and ${achievement.xpReward} XP`,
          createdAt: now,
        });

        newlyUnlocked.push(achievement);
      }
    }

    return { newAchievements: newlyUnlocked };
  },
});

// ============================================
// ACHIEVEMENT SEEDER (Dev)
// ============================================

export const seedAchievementsDev = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if achievements already exist
    const existing = await ctx.db.query("achievements").first();
    if (existing) {
      return { message: "Achievements already seeded" };
    }

    const achievements = [
      // Savings achievements
      {
        name: "First Saver",
        nameEs: "Primer Ahorrador",
        description: "Save your first dollar",
        descriptionEs: "Ahorra tu primer dólar",
        iconUrl: "/badges/first-saver.png",
        category: "savings" as const,
        requirement: { type: "total_saved", value: 100 }, // 100 cents = $1
        coinReward: 50,
        xpReward: 25,
        isActive: true,
      },
      {
        name: "Piggy Bank Pro",
        nameEs: "Experto en Ahorros",
        description: "Save $10 in total",
        descriptionEs: "Ahorra $10 en total",
        iconUrl: "/badges/piggy-bank-pro.png",
        category: "savings" as const,
        requirement: { type: "total_saved", value: 1000 },
        coinReward: 100,
        xpReward: 50,
        isActive: true,
      },
      {
        name: "Super Saver",
        nameEs: "Super Ahorrador",
        description: "Save $50 in total",
        descriptionEs: "Ahorra $50 en total",
        iconUrl: "/badges/super-saver.png",
        category: "savings" as const,
        requirement: { type: "total_saved", value: 5000 },
        coinReward: 250,
        xpReward: 100,
        isActive: true,
      },
      {
        name: "Goal Getter",
        nameEs: "Logrador de Metas",
        description: "Complete your first savings goal",
        descriptionEs: "Completa tu primera meta de ahorro",
        iconUrl: "/badges/goal-getter.png",
        category: "savings" as const,
        requirement: { type: "savings_goals_completed", value: 1 },
        coinReward: 75,
        xpReward: 50,
        isActive: true,
      },
      {
        name: "Dream Achiever",
        nameEs: "Logrador de Sueños",
        description: "Complete 5 savings goals",
        descriptionEs: "Completa 5 metas de ahorro",
        iconUrl: "/badges/dream-achiever.png",
        category: "savings" as const,
        requirement: { type: "savings_goals_completed", value: 5 },
        coinReward: 200,
        xpReward: 150,
        isActive: true,
      },

      // Investing achievements
      {
        name: "First Investment",
        nameEs: "Primera Inversión",
        description: "Make your first investment",
        descriptionEs: "Haz tu primera inversión",
        iconUrl: "/badges/first-investment.png",
        category: "investing" as const,
        requirement: { type: "investments_made", value: 1 },
        coinReward: 100,
        xpReward: 50,
        isActive: true,
      },
      {
        name: "Diversified Investor",
        nameEs: "Inversionista Diversificado",
        description: "Own 3 different investments",
        descriptionEs: "Posee 3 inversiones diferentes",
        iconUrl: "/badges/diversified-investor.png",
        category: "investing" as const,
        requirement: { type: "investments_made", value: 3 },
        coinReward: 150,
        xpReward: 75,
        isActive: true,
      },
      {
        name: "Portfolio Master",
        nameEs: "Maestro del Portafolio",
        description: "Own 5 different investments",
        descriptionEs: "Posee 5 inversiones diferentes",
        iconUrl: "/badges/portfolio-master.png",
        category: "investing" as const,
        requirement: { type: "investments_made", value: 5 },
        coinReward: 300,
        xpReward: 150,
        isActive: true,
      },

      // Learning achievements
      {
        name: "Curious Mind",
        nameEs: "Mente Curiosa",
        description: "Complete your first lesson",
        descriptionEs: "Completa tu primera lección",
        iconUrl: "/badges/curious-mind.png",
        category: "learning" as const,
        requirement: { type: "content_completed", value: 1 },
        coinReward: 50,
        xpReward: 25,
        isActive: true,
      },
      {
        name: "Knowledge Seeker",
        nameEs: "Buscador de Conocimiento",
        description: "Complete 5 lessons",
        descriptionEs: "Completa 5 lecciones",
        iconUrl: "/badges/knowledge-seeker.png",
        category: "learning" as const,
        requirement: { type: "content_completed", value: 5 },
        coinReward: 100,
        xpReward: 75,
        isActive: true,
      },
      {
        name: "Money Genius",
        nameEs: "Genio del Dinero",
        description: "Complete 15 lessons",
        descriptionEs: "Completa 15 lecciones",
        iconUrl: "/badges/money-genius.png",
        category: "learning" as const,
        requirement: { type: "content_completed", value: 15 },
        coinReward: 250,
        xpReward: 150,
        isActive: true,
      },

      // Mission achievements
      {
        name: "Mission Starter",
        nameEs: "Iniciador de Misiones",
        description: "Complete your first mission",
        descriptionEs: "Completa tu primera misión",
        iconUrl: "/badges/mission-starter.png",
        category: "milestone" as const,
        requirement: { type: "missions_completed", value: 1 },
        coinReward: 50,
        xpReward: 25,
        isActive: true,
      },
      {
        name: "Mission Expert",
        nameEs: "Experto en Misiones",
        description: "Complete 10 missions",
        descriptionEs: "Completa 10 misiones",
        iconUrl: "/badges/mission-expert.png",
        category: "milestone" as const,
        requirement: { type: "missions_completed", value: 10 },
        coinReward: 150,
        xpReward: 100,
        isActive: true,
      },
      {
        name: "Mission Legend",
        nameEs: "Leyenda de Misiones",
        description: "Complete 50 missions",
        descriptionEs: "Completa 50 misiones",
        iconUrl: "/badges/mission-legend.png",
        category: "milestone" as const,
        requirement: { type: "missions_completed", value: 50 },
        coinReward: 500,
        xpReward: 300,
        isActive: true,
      },

      // Streak achievements
      {
        name: "3-Day Streak",
        nameEs: "Racha de 3 Días",
        description: "Log in 3 days in a row",
        descriptionEs: "Inicia sesión 3 días seguidos",
        iconUrl: "/badges/streak-3.png",
        category: "streak" as const,
        requirement: { type: "streak_days", value: 3 },
        coinReward: 30,
        xpReward: 20,
        isActive: true,
      },
      {
        name: "Week Warrior",
        nameEs: "Guerrero de la Semana",
        description: "Log in 7 days in a row",
        descriptionEs: "Inicia sesión 7 días seguidos",
        iconUrl: "/badges/streak-7.png",
        category: "streak" as const,
        requirement: { type: "streak_days", value: 7 },
        coinReward: 75,
        xpReward: 50,
        isActive: true,
      },
      {
        name: "Month Master",
        nameEs: "Maestro del Mes",
        description: "Log in 30 days in a row",
        descriptionEs: "Inicia sesión 30 días seguidos",
        iconUrl: "/badges/streak-30.png",
        category: "streak" as const,
        requirement: { type: "streak_days", value: 30 },
        coinReward: 300,
        xpReward: 200,
        isActive: true,
      },

      // Social achievements
      {
        name: "First Sale",
        nameEs: "Primera Venta",
        description: "Sell an item in the marketplace",
        descriptionEs: "Vende un artículo en el mercado",
        iconUrl: "/badges/first-sale.png",
        category: "social" as const,
        requirement: { type: "marketplace_sales", value: 1 },
        coinReward: 50,
        xpReward: 25,
        isActive: true,
      },
      {
        name: "Marketplace Mogul",
        nameEs: "Magnate del Mercado",
        description: "Complete 10 marketplace sales",
        descriptionEs: "Completa 10 ventas en el mercado",
        iconUrl: "/badges/marketplace-mogul.png",
        category: "social" as const,
        requirement: { type: "marketplace_sales", value: 10 },
        coinReward: 200,
        xpReward: 100,
        isActive: true,
      },

      // Milestone achievements
      {
        name: "Level 5",
        nameEs: "Nivel 5",
        description: "Reach level 5",
        descriptionEs: "Alcanza el nivel 5",
        iconUrl: "/badges/level-5.png",
        category: "milestone" as const,
        requirement: { type: "level_reached", value: 5 },
        coinReward: 100,
        xpReward: 50,
        isActive: true,
      },
      {
        name: "Level 10",
        nameEs: "Nivel 10",
        description: "Reach level 10",
        descriptionEs: "Alcanza el nivel 10",
        iconUrl: "/badges/level-10.png",
        category: "milestone" as const,
        requirement: { type: "level_reached", value: 10 },
        coinReward: 250,
        xpReward: 100,
        isActive: true,
      },
      {
        name: "Coin Collector",
        nameEs: "Coleccionista de Monedas",
        description: "Earn 1,000 coins total",
        descriptionEs: "Gana 1,000 monedas en total",
        iconUrl: "/badges/coin-collector.png",
        category: "milestone" as const,
        requirement: { type: "coins_earned", value: 1000 },
        coinReward: 100,
        xpReward: 50,
        isActive: true,
      },
      {
        name: "Coin Master",
        nameEs: "Maestro de Monedas",
        description: "Earn 10,000 coins total",
        descriptionEs: "Gana 10,000 monedas en total",
        iconUrl: "/badges/coin-master.png",
        category: "milestone" as const,
        requirement: { type: "coins_earned", value: 10000 },
        coinReward: 500,
        xpReward: 250,
        isActive: true,
      },
    ];

    for (const achievement of achievements) {
      await ctx.db.insert("achievements", achievement);
    }

    return { message: `Seeded ${achievements.length} achievements` };
  },
});
