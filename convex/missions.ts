import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// GET AVAILABLE MISSIONS
// ============================================

export const getAvailableMissions = query({
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
    const kid = await ctx.db.get(kidId);
    if (!kid) return [];

    // Get all active missions
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get kid's progress on missions
    const progressRecords = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .collect();

    const progressMap = new Map(
      progressRecords.map((p) => [p.missionId, p])
    );

    // Filter and enrich missions
    const enrichedMissions = missions
      .filter((mission) => {
        // Check level requirement
        if (mission.requirements.minLevel && kid.level < mission.requirements.minLevel) {
          return false;
        }
        return true;
      })
      .map((mission) => {
        const progress = progressMap.get(mission._id);
        return {
          ...mission,
          progress: progress || null,
          status: progress?.status || "available",
          progressPercent: progress?.progress || 0,
        };
      });

    return enrichedMissions;
  },
});

export const getMissionById = query({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.userType !== "kid" || !session.kidId) {
      return null;
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) return null;

    const progress = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_mission", (q) =>
        q.eq("kidId", session.kidId!).eq("missionId", args.missionId)
      )
      .first();

    return {
      ...mission,
      progress: progress || null,
      status: progress?.status || "available",
      progressPercent: progress?.progress || 0,
    };
  },
});

export const getActiveMissions = query({
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

    const inProgressMissions = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_status", (q) =>
        q.eq("kidId", session.kidId!).eq("status", "in_progress")
      )
      .collect();

    const enriched = await Promise.all(
      inProgressMissions.map(async (progress) => {
        const mission = await ctx.db.get(progress.missionId);
        if (!mission) return null;
        return {
          ...mission,
          progress,
          status: progress.status,
          progressPercent: progress.progress,
        };
      })
    );

    return enriched.filter((m) => m !== null);
  },
});

export const getCompletedMissions = query({
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

    const completedMissions = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_status", (q) =>
        q.eq("kidId", session.kidId!).eq("status", "completed")
      )
      .collect();

    const enriched = await Promise.all(
      completedMissions.map(async (progress) => {
        const mission = await ctx.db.get(progress.missionId);
        if (!mission) return null;
        return {
          ...mission,
          progress,
          status: progress.status,
          progressPercent: progress.progress,
          completedAt: progress.completedAt,
        };
      })
    );

    return enriched.filter((m) => m !== null);
  },
});

// ============================================
// MISSION ACTIONS
// ============================================

export const startMission = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
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

    // Check if mission exists
    const mission = await ctx.db.get(args.missionId);
    if (!mission || !mission.isActive) {
      throw new Error("Mission not available");
    }

    // Check if already started
    const existingProgress = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_mission", (q) =>
        q.eq("kidId", kidId).eq("missionId", args.missionId)
      )
      .first();

    if (existingProgress) {
      if (existingProgress.status === "completed") {
        throw new Error("Mission already completed");
      }
      if (existingProgress.status === "in_progress") {
        return { success: true, message: "Mission already in progress" };
      }
    }

    const now = Date.now();
    const expiresAt = mission.durationDays
      ? now + mission.durationDays * 24 * 60 * 60 * 1000
      : undefined;

    if (existingProgress) {
      await ctx.db.patch(existingProgress._id, {
        status: "in_progress",
        progress: 0,
        startedAt: now,
        expiresAt,
      });
    } else {
      await ctx.db.insert("missionProgress", {
        kidId,
        missionId: args.missionId,
        status: "in_progress",
        progress: 0,
        startedAt: now,
        expiresAt,
      });
    }

    // Log activity
    await ctx.db.insert("activityLog", {
      kidId,
      action: `Started mission: ${mission.title}`,
      category: "mission",
      createdAt: now,
    });

    return { success: true };
  },
});

export const updateMissionProgress = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
    progress: v.number(),
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

    const progressRecord = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_mission", (q) =>
        q.eq("kidId", kidId).eq("missionId", args.missionId)
      )
      .first();

    if (!progressRecord || progressRecord.status !== "in_progress") {
      throw new Error("Mission not in progress");
    }

    const newProgress = Math.min(100, Math.max(0, args.progress));

    await ctx.db.patch(progressRecord._id, {
      progress: newProgress,
    });

    // Auto-complete if 100%
    if (newProgress >= 100) {
      return await completeMissionInternal(ctx, kidId, args.missionId, progressRecord._id);
    }

    return { success: true, progress: newProgress };
  },
});

async function completeMissionInternal(
  ctx: any,
  kidId: Id<"kids">,
  missionId: Id<"missions">,
  progressId: Id<"missionProgress">
) {
  const mission = await ctx.db.get(missionId);
  if (!mission) throw new Error("Mission not found");

  const now = Date.now();

  // Mark as completed
  await ctx.db.patch(progressId, {
    status: "completed",
    progress: 100,
    completedAt: now,
  });

  // Get kid's virtual wallet
  const wallet = await ctx.db
    .query("virtualWallets")
    .withIndex("by_kid", (q: any) => q.eq("kidId", kidId))
    .first();

  if (wallet) {
    // Award coins
    await ctx.db.patch(wallet._id, {
      coins: wallet.coins + mission.coinReward,
      lifetimeEarned: wallet.lifetimeEarned + mission.coinReward,
      updatedAt: now,
    });

    // Record coin transaction
    await ctx.db.insert("coinTransactions", {
      kidId,
      type: "mission_reward",
      amount: mission.coinReward,
      description: `Completed mission: ${mission.title}`,
      relatedId: missionId,
      createdAt: now,
    });
  }

  // Award XP
  const kid = await ctx.db.get(kidId);
  if (kid) {
    const newXp = kid.xp + mission.xpReward;
    const newLevel = Math.floor(newXp / 100) + 1; // Level up every 100 XP
    const leveledUp = newLevel > kid.level;

    await ctx.db.patch(kidId, {
      xp: newXp,
      level: newLevel,
    });

    if (leveledUp) {
      await ctx.db.insert("notifications", {
        kidId,
        type: "level_up",
        title: "Level Up!",
        message: `Congratulations! You reached level ${newLevel}!`,
        isRead: false,
        createdAt: now,
      });
    }
  }

  // Log activity
  await ctx.db.insert("activityLog", {
    kidId,
    action: `Completed mission: ${mission.title}`,
    category: "mission",
    details: `Earned ${mission.coinReward} coins and ${mission.xpReward} XP`,
    createdAt: now,
  });

  // Send notification
  await ctx.db.insert("notifications", {
    kidId,
    type: "mission_completed",
    title: "Mission Complete!",
    message: `You completed "${mission.title}" and earned ${mission.coinReward} coins!`,
    isRead: false,
    relatedId: missionId,
    createdAt: now,
  });

  return {
    success: true,
    completed: true,
    coinReward: mission.coinReward,
    xpReward: mission.xpReward,
  };
}

export const completeMission = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
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

    const progressRecord = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid_and_mission", (q) =>
        q.eq("kidId", kidId).eq("missionId", args.missionId)
      )
      .first();

    if (!progressRecord || progressRecord.status !== "in_progress") {
      throw new Error("Mission not in progress");
    }

    return await completeMissionInternal(ctx, kidId, args.missionId, progressRecord._id);
  },
});

// ============================================
// MISSION STATS
// ============================================

export const getMissionStats = query({
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

    const allProgress = await ctx.db
      .query("missionProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .collect();

    const completed = allProgress.filter((p) => p.status === "completed");
    const inProgress = allProgress.filter((p) => p.status === "in_progress");

    // Calculate total rewards earned
    let totalCoinsEarned = 0;
    let totalXpEarned = 0;

    for (const progress of completed) {
      const mission = await ctx.db.get(progress.missionId);
      if (mission) {
        totalCoinsEarned += mission.coinReward;
        totalXpEarned += mission.xpReward;
      }
    }

    return {
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      totalCoinsEarned,
      totalXpEarned,
    };
  },
});

// ============================================
// SEED MISSIONS (DEV)
// ============================================

export const seedMissionsDev = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("missions").first();
    if (existing) {
      return { message: "Missions already exist" };
    }

    const now = Date.now();

    const missions = [
      // Daily missions
      {
        title: "Daily Check-in",
        titleEs: "Registro Diario",
        description: "Log in to the app today and check your wallet balance!",
        descriptionEs: "Inicia sesión en la aplicación hoy y revisa tu saldo!",
        type: "daily" as const,
        difficulty: "easy" as const,
        coinReward: 5,
        xpReward: 10,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      {
        title: "Savings Streak",
        titleEs: "Racha de Ahorro",
        description: "Add money to any savings goal today!",
        descriptionEs: "Agrega dinero a cualquier meta de ahorro hoy!",
        type: "daily" as const,
        difficulty: "easy" as const,
        coinReward: 10,
        xpReward: 15,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      // Savings missions
      {
        title: "First Savings Goal",
        titleEs: "Primera Meta de Ahorro",
        description: "Create your very first savings goal!",
        descriptionEs: "Crea tu primera meta de ahorro!",
        type: "savings" as const,
        difficulty: "easy" as const,
        coinReward: 25,
        xpReward: 30,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      {
        title: "Save $10",
        titleEs: "Ahorra $10",
        description: "Save up $10 in any savings goal. You can do it!",
        descriptionEs: "Ahorra $10 en cualquier meta. Tu puedes!",
        type: "savings" as const,
        difficulty: "medium" as const,
        coinReward: 50,
        xpReward: 50,
        requirements: {},
        targetAmount: 1000, // $10 in cents
        isActive: true,
        createdAt: now,
      },
      {
        title: "Super Saver",
        titleEs: "Super Ahorrador",
        description: "Save $50 total! You're a savings champion!",
        descriptionEs: "Ahorra $50 en total! Eres un campeón del ahorro!",
        type: "savings" as const,
        difficulty: "hard" as const,
        coinReward: 150,
        xpReward: 100,
        requirements: { minLevel: 3 },
        targetAmount: 5000, // $50 in cents
        isActive: true,
        createdAt: now,
      },
      // Investment missions
      {
        title: "First Investment",
        titleEs: "Primera Inversión",
        description: "Make your first investment! Start small and learn.",
        descriptionEs: "Haz tu primera inversión! Empieza pequeño y aprende.",
        type: "investment" as const,
        difficulty: "medium" as const,
        coinReward: 30,
        xpReward: 40,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      {
        title: "Diversify Portfolio",
        titleEs: "Diversifica tu Portafolio",
        description: "Own at least 3 different investments at the same time!",
        descriptionEs: "Ten al menos 3 inversiones diferentes al mismo tiempo!",
        type: "investment" as const,
        difficulty: "hard" as const,
        coinReward: 75,
        xpReward: 75,
        requirements: { minLevel: 2 },
        isActive: true,
        createdAt: now,
      },
      {
        title: "Profit Master",
        titleEs: "Maestro de Ganancias",
        description: "Make a profit of $5 or more from selling an investment!",
        descriptionEs: "Obtén una ganancia de $5 o más vendiendo una inversión!",
        type: "investment" as const,
        difficulty: "hard" as const,
        coinReward: 100,
        xpReward: 80,
        requirements: { minLevel: 3 },
        isActive: true,
        createdAt: now,
      },
      // Learning missions
      {
        title: "Watch & Learn",
        titleEs: "Mira y Aprende",
        description: "Watch any educational video in the Learn section!",
        descriptionEs: "Mira cualquier video educativo en la sección Aprender!",
        type: "learning" as const,
        difficulty: "easy" as const,
        coinReward: 15,
        xpReward: 20,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      {
        title: "Quiz Champion",
        titleEs: "Campeón de Quiz",
        description: "Score 80% or higher on any quiz!",
        descriptionEs: "Obtén 80% o más en cualquier quiz!",
        type: "learning" as const,
        difficulty: "medium" as const,
        coinReward: 40,
        xpReward: 45,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      {
        title: "Knowledge Seeker",
        titleEs: "Buscador de Conocimiento",
        description: "Complete 5 different educational contents!",
        descriptionEs: "Completa 5 contenidos educativos diferentes!",
        type: "learning" as const,
        difficulty: "hard" as const,
        coinReward: 100,
        xpReward: 100,
        requirements: { minLevel: 2 },
        isActive: true,
        createdAt: now,
      },
      // Decision missions
      {
        title: "Needs vs Wants",
        titleEs: "Necesidades vs Deseos",
        description: "Learn the difference between needs and wants!",
        descriptionEs: "Aprende la diferencia entre necesidades y deseos!",
        type: "decision" as const,
        difficulty: "easy" as const,
        coinReward: 20,
        xpReward: 25,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      {
        title: "Smart Spender",
        titleEs: "Gastador Inteligente",
        description: "Wait 24 hours before making a purchase over 100 coins!",
        descriptionEs: "Espera 24 horas antes de hacer una compra de más de 100 monedas!",
        type: "decision" as const,
        difficulty: "medium" as const,
        coinReward: 35,
        xpReward: 35,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      // Social missions
      {
        title: "Marketplace Seller",
        titleEs: "Vendedor del Mercado",
        description: "List your first item for sale in the marketplace!",
        descriptionEs: "Publica tu primer artículo en venta en el mercado!",
        type: "social" as const,
        difficulty: "easy" as const,
        coinReward: 20,
        xpReward: 25,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
      {
        title: "Successful Trade",
        titleEs: "Comercio Exitoso",
        description: "Complete a sale in the marketplace!",
        descriptionEs: "Completa una venta en el mercado!",
        type: "social" as const,
        difficulty: "medium" as const,
        coinReward: 50,
        xpReward: 50,
        requirements: {},
        isActive: true,
        createdAt: now,
      },
    ];

    for (const mission of missions) {
      await ctx.db.insert("missions", mission);
    }

    return { message: `Seeded ${missions.length} missions` };
  },
});
