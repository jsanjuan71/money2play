import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// GET EDUCATIONAL CONTENT
// ============================================

export const getEducationalContent = query({
  args: {
    filterType: v.optional(v.string()),
    filterCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let content = await ctx.db
      .query("educationalContent")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (args.filterType) {
      content = content.filter((c) => c.type === args.filterType);
    }

    if (args.filterCategory) {
      content = content.filter((c) => c.category === args.filterCategory);
    }

    return content;
  },
});

export const getContentById = query({
  args: {
    contentId: v.id("educationalContent"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contentId);
  },
});

export const getContentByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("educationalContent")
      .withIndex("by_category", (q) => q.eq("category", args.category as any))
      .collect();

    return content.filter((c) => c.isActive);
  },
});

// ============================================
// KID'S PROGRESS
// ============================================

export const getMyProgress = query({
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

    const progress = await ctx.db
      .query("contentProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", session.kidId!))
      .collect();

    // Enrich with content data
    const enriched = await Promise.all(
      progress.map(async (p) => {
        const content = await ctx.db.get(p.contentId);
        return {
          ...p,
          content,
        };
      })
    );

    return enriched.filter((p) => p.content !== null);
  },
});

export const getContentWithProgress = query({
  args: {
    token: v.string(),
    filterType: v.optional(v.string()),
    filterCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    let kidId: Id<"kids"> | null = null;
    if (session && session.userType === "kid" && session.kidId) {
      kidId = session.kidId;
    }

    // Get all content
    let content = await ctx.db
      .query("educationalContent")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (args.filterType) {
      content = content.filter((c) => c.type === args.filterType);
    }

    if (args.filterCategory) {
      content = content.filter((c) => c.category === args.filterCategory);
    }

    // Get progress if logged in
    let progressMap = new Map<string, any>();
    if (kidId) {
      const progress = await ctx.db
        .query("contentProgress")
        .withIndex("by_kid", (q) => q.eq("kidId", kidId!))
        .collect();

      progressMap = new Map(progress.map((p) => [p.contentId, p]));
    }

    // Combine content with progress
    return content.map((c) => ({
      ...c,
      progress: progressMap.get(c._id) || null,
      isCompleted: progressMap.get(c._id)?.isCompleted || false,
    }));
  },
});

// ============================================
// TRACK PROGRESS & COMPLETE CONTENT
// ============================================

export const startContent = mutation({
  args: {
    token: v.string(),
    contentId: v.id("educationalContent"),
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

    // Check if content exists
    const content = await ctx.db.get(args.contentId);
    if (!content || !content.isActive) {
      throw new Error("Content not available");
    }

    // Check if already started
    const existing = await ctx.db
      .query("contentProgress")
      .withIndex("by_kid_and_content", (q) =>
        q.eq("kidId", kidId).eq("contentId", args.contentId)
      )
      .first();

    if (existing) {
      return { success: true, progressId: existing._id };
    }

    // Create progress record
    const progressId = await ctx.db.insert("contentProgress", {
      kidId,
      contentId: args.contentId,
      isCompleted: false,
      createdAt: Date.now(),
    });

    return { success: true, progressId };
  },
});

export const updateWatchProgress = mutation({
  args: {
    token: v.string(),
    contentId: v.id("educationalContent"),
    watchedSeconds: v.number(),
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

    const progress = await ctx.db
      .query("contentProgress")
      .withIndex("by_kid_and_content", (q) =>
        q.eq("kidId", kidId).eq("contentId", args.contentId)
      )
      .first();

    if (!progress) {
      throw new Error("Progress not found, start content first");
    }

    await ctx.db.patch(progress._id, {
      watchedSeconds: args.watchedSeconds,
    });

    return { success: true };
  },
});

export const completeContent = mutation({
  args: {
    token: v.string(),
    contentId: v.id("educationalContent"),
    quizScore: v.optional(v.number()),
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
    const now = Date.now();

    // Get content
    const content = await ctx.db.get(args.contentId);
    if (!content) {
      throw new Error("Content not found");
    }

    // Get or create progress
    let progress = await ctx.db
      .query("contentProgress")
      .withIndex("by_kid_and_content", (q) =>
        q.eq("kidId", kidId).eq("contentId", args.contentId)
      )
      .first();

    if (progress?.isCompleted) {
      return { success: true, alreadyCompleted: true };
    }

    // For quizzes, check if score meets minimum (e.g., 60%)
    if (content.type === "quiz" && args.quizScore !== undefined) {
      if (args.quizScore < 60) {
        if (progress) {
          await ctx.db.patch(progress._id, {
            quizScore: args.quizScore,
          });
        }
        throw new Error("Score too low. You need at least 60% to pass!");
      }
    }

    // Update or create progress
    if (progress) {
      await ctx.db.patch(progress._id, {
        isCompleted: true,
        completedAt: now,
        quizScore: args.quizScore,
      });
    } else {
      await ctx.db.insert("contentProgress", {
        kidId,
        contentId: args.contentId,
        isCompleted: true,
        completedAt: now,
        quizScore: args.quizScore,
        createdAt: now,
      });
    }

    // Award coins
    const wallet = await ctx.db
      .query("virtualWallets")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .first();

    if (wallet) {
      await ctx.db.patch(wallet._id, {
        coins: wallet.coins + content.coinReward,
        lifetimeEarned: wallet.lifetimeEarned + content.coinReward,
        updatedAt: now,
      });

      await ctx.db.insert("coinTransactions", {
        kidId,
        type: "learning_reward",
        amount: content.coinReward,
        description: `Completed: ${content.title}`,
        relatedId: args.contentId,
        createdAt: now,
      });
    }

    // Award XP
    const kid = await ctx.db.get(kidId);
    if (kid) {
      const newXp = kid.xp + content.xpReward;
      const newLevel = Math.floor(newXp / 100) + 1;
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
      action: `Completed ${content.type}: ${content.title}`,
      category: "learning",
      details: args.quizScore ? `Score: ${args.quizScore}%` : undefined,
      createdAt: now,
    });

    return {
      success: true,
      coinReward: content.coinReward,
      xpReward: content.xpReward,
    };
  },
});

// ============================================
// LEARNING STATS
// ============================================

export const getLearningStats = query({
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

    const progress = await ctx.db
      .query("contentProgress")
      .withIndex("by_kid", (q) => q.eq("kidId", kidId))
      .collect();

    const completed = progress.filter((p) => p.isCompleted);

    // Calculate stats
    let totalCoinsEarned = 0;
    let totalXpEarned = 0;
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const p of completed) {
      const content = await ctx.db.get(p.contentId);
      if (content) {
        totalCoinsEarned += content.coinReward;
        totalXpEarned += content.xpReward;
        byType[content.type] = (byType[content.type] || 0) + 1;
        byCategory[content.category] = (byCategory[content.category] || 0) + 1;
      }
    }

    // Get total available content
    const allContent = await ctx.db
      .query("educationalContent")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return {
      completedCount: completed.length,
      totalCount: allContent.length,
      totalCoinsEarned,
      totalXpEarned,
      byType,
      byCategory,
    };
  },
});

// ============================================
// SEED EDUCATIONAL CONTENT (DEV)
// ============================================

export const seedEducationalContentDev = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("educationalContent").first();
    if (existing) {
      return { message: "Educational content already exists" };
    }

    const now = Date.now();

    const content = [
      // Videos
      {
        title: "What is Money?",
        titleEs: "¿Qué es el Dinero?",
        description: "Learn the basics of what money is and why we use it!",
        descriptionEs: "Aprende lo básico sobre qué es el dinero y por qué lo usamos!",
        type: "video" as const,
        category: "budgeting" as const,
        contentUrl: "https://www.youtube.com/watch?v=example1",
        durationMinutes: 5,
        coinReward: 10,
        xpReward: 15,
        ageRange: { min: 5, max: 12 },
        isActive: true,
        createdAt: now,
      },
      {
        title: "Why Saving is Important",
        titleEs: "Por Qué Ahorrar es Importante",
        description: "Discover why saving money helps you get what you really want!",
        descriptionEs: "Descubre por qué ahorrar dinero te ayuda a conseguir lo que realmente quieres!",
        type: "video" as const,
        category: "saving" as const,
        contentUrl: "https://www.youtube.com/watch?v=example2",
        durationMinutes: 7,
        coinReward: 15,
        xpReward: 20,
        ageRange: { min: 5, max: 12 },
        isActive: true,
        createdAt: now,
      },
      {
        title: "Introduction to Investing",
        titleEs: "Introducción a las Inversiones",
        description: "Learn how your money can grow by investing wisely!",
        descriptionEs: "Aprende cómo tu dinero puede crecer invirtiendo sabiamente!",
        type: "video" as const,
        category: "investing" as const,
        contentUrl: "https://www.youtube.com/watch?v=example3",
        durationMinutes: 10,
        coinReward: 20,
        xpReward: 25,
        ageRange: { min: 8, max: 14 },
        isActive: true,
        createdAt: now,
      },
      // Articles
      {
        title: "10 Ways to Earn Money as a Kid",
        titleEs: "10 Formas de Ganar Dinero Siendo Niño",
        description: "Creative ideas for earning your own money!",
        descriptionEs: "Ideas creativas para ganar tu propio dinero!",
        type: "article" as const,
        category: "earning" as const,
        content: `
# 10 Ways to Earn Money as a Kid

## 1. Lemonade Stand
Set up a lemonade stand in your neighborhood on hot days!

## 2. Pet Sitting
Help neighbors take care of their pets while they're away.

## 3. Yard Work
Offer to rake leaves, water plants, or help with gardening.

## 4. Car Washing
Wash cars for family and neighbors.

## 5. Tutoring
Help younger kids with subjects you're good at.

## 6. Craft Sales
Make crafts and sell them at school or local markets.

## 7. Baking
Bake cookies or treats to sell (with adult help!).

## 8. Recycling
Collect recyclable cans and bottles.

## 9. Technology Help
Help adults learn to use phones or computers.

## 10. Chores
Do extra chores at home for an allowance.

**Remember:** Always ask your parents before starting any business!
        `,
        durationMinutes: 5,
        coinReward: 12,
        xpReward: 18,
        ageRange: { min: 6, max: 14 },
        isActive: true,
        createdAt: now,
      },
      {
        title: "Smart Shopping Tips",
        titleEs: "Consejos para Comprar Inteligentemente",
        description: "How to get the best value when you spend!",
        descriptionEs: "Cómo obtener el mejor valor cuando gastas!",
        type: "article" as const,
        category: "spending_wisely" as const,
        content: `
# Smart Shopping Tips

## Compare Prices
Before buying something, check if it's cheaper somewhere else!

## Wait Before You Buy
If you want something, wait a day. Do you still want it tomorrow?

## Look for Sales
Save money by buying things when they're on sale.

## Make a List
Write down what you need BEFORE you go shopping.

## Avoid Impulse Buys
Those things near the checkout are designed to tempt you!

## Quality vs Price
Sometimes a more expensive item lasts longer and is a better deal.

**Pro Tip:** Always ask yourself - "Do I NEED this or do I just WANT this?"
        `,
        durationMinutes: 4,
        coinReward: 10,
        xpReward: 15,
        ageRange: { min: 6, max: 14 },
        isActive: true,
        createdAt: now,
      },
      // Quizzes
      {
        title: "Needs vs Wants Quiz",
        titleEs: "Quiz: Necesidades vs Deseos",
        description: "Test your knowledge about needs and wants!",
        descriptionEs: "Prueba tu conocimiento sobre necesidades y deseos!",
        type: "quiz" as const,
        category: "needs_vs_wants" as const,
        content: JSON.stringify({
          questions: [
            {
              question: "Which of these is a NEED?",
              questionEs: "¿Cuál de estos es una NECESIDAD?",
              options: ["Video game", "Food", "Toy", "Candy"],
              optionsEs: ["Videojuego", "Comida", "Juguete", "Dulces"],
              correctAnswer: 1,
            },
            {
              question: "Which of these is a WANT?",
              questionEs: "¿Cuál de estos es un DESEO?",
              options: ["Water", "Shelter", "Latest smartphone", "Medicine"],
              optionsEs: ["Agua", "Vivienda", "Último smartphone", "Medicina"],
              correctAnswer: 2,
            },
            {
              question: "You have $20. You need school supplies ($15) but want a toy ($20). What should you do?",
              questionEs: "Tienes $20. Necesitas útiles escolares ($15) pero quieres un juguete ($20). ¿Qué deberías hacer?",
              options: ["Buy the toy", "Buy school supplies and save $5", "Buy nothing", "Ask for more money"],
              optionsEs: ["Comprar el juguete", "Comprar útiles y ahorrar $5", "No comprar nada", "Pedir más dinero"],
              correctAnswer: 1,
            },
            {
              question: "True or False: Wants are bad and you should never spend money on them.",
              questionEs: "¿Verdadero o Falso?: Los deseos son malos y nunca deberías gastar dinero en ellos.",
              options: ["True", "False"],
              optionsEs: ["Verdadero", "Falso"],
              correctAnswer: 1,
            },
            {
              question: "What's the BEST reason to save money?",
              questionEs: "¿Cuál es la MEJOR razón para ahorrar dinero?",
              options: ["To never spend it", "To buy things you need and want later", "To show off to friends", "Because adults say so"],
              optionsEs: ["Para nunca gastarlo", "Para comprar cosas que necesitas y quieres después", "Para presumir a los amigos", "Porque los adultos lo dicen"],
              correctAnswer: 1,
            },
          ],
        }),
        durationMinutes: 5,
        coinReward: 25,
        xpReward: 30,
        ageRange: { min: 6, max: 14 },
        isActive: true,
        createdAt: now,
      },
      {
        title: "Saving Basics Quiz",
        titleEs: "Quiz: Básicos del Ahorro",
        description: "How much do you know about saving?",
        descriptionEs: "¿Cuánto sabes sobre el ahorro?",
        type: "quiz" as const,
        category: "saving" as const,
        content: JSON.stringify({
          questions: [
            {
              question: "What is a savings goal?",
              questionEs: "¿Qué es una meta de ahorro?",
              options: ["Money you spend today", "Something you save money for", "A type of game", "A bank"],
              optionsEs: ["Dinero que gastas hoy", "Algo para lo que ahorras", "Un tipo de juego", "Un banco"],
              correctAnswer: 1,
            },
            {
              question: "If you save $5 every week, how much will you have in 4 weeks?",
              questionEs: "Si ahorras $5 cada semana, ¿cuánto tendrás en 4 semanas?",
              options: ["$5", "$10", "$15", "$20"],
              optionsEs: ["$5", "$10", "$15", "$20"],
              correctAnswer: 3,
            },
            {
              question: "What's a good first step when you want to buy something expensive?",
              questionEs: "¿Cuál es un buen primer paso cuando quieres comprar algo caro?",
              options: ["Buy it immediately", "Set a savings goal", "Forget about it", "Borrow money"],
              optionsEs: ["Comprarlo inmediatamente", "Establecer una meta de ahorro", "Olvidarlo", "Pedir prestado"],
              correctAnswer: 1,
            },
            {
              question: "Where is the safest place to keep your savings?",
              questionEs: "¿Dónde es el lugar más seguro para guardar tus ahorros?",
              options: ["Under your bed", "In your pocket", "In a bank or savings account", "In your backpack"],
              optionsEs: ["Debajo de tu cama", "En tu bolsillo", "En un banco o cuenta de ahorro", "En tu mochila"],
              correctAnswer: 2,
            },
          ],
        }),
        durationMinutes: 4,
        coinReward: 20,
        xpReward: 25,
        ageRange: { min: 6, max: 12 },
        isActive: true,
        createdAt: now,
      },
      // Stories
      {
        title: "The Three Little Savers",
        titleEs: "Los Tres Pequeños Ahorradores",
        description: "A fun story about three friends learning to save!",
        descriptionEs: "Una historia divertida sobre tres amigos aprendiendo a ahorrar!",
        type: "story" as const,
        category: "saving" as const,
        content: `
# The Three Little Savers

Once upon a time, there were three friends: **Penny**, **Buck**, and **Cash**.

## Penny's Plan
Penny got $10 for her birthday. She immediately ran to the store and bought candy, toys, and stickers. By the end of the day, all her money was gone.

"That was fun!" said Penny. "But now I can't buy anything else..."

## Buck's Balance
Buck also got $10. He decided to spend $5 on a small toy and save $5 in his piggy bank.

"This way I have fun today AND money for later!" said Buck.

## Cash's Choice
Cash got $10 too. She put ALL of it in her savings account.

"I'm saving for a bicycle!" said Cash. "It costs $50, so I need to save more."

## One Month Later...

Penny had no money left and felt sad when she saw a cool game she wanted.

Buck had saved $20 and bought a book he really wanted. He still had some money left!

Cash had saved $40 and was SO close to her bicycle goal!

## The Lesson

There's no single "right" way to handle money, but **balance** is important!

- It's okay to spend some money on things you enjoy
- It's smart to save some money for bigger goals
- Planning ahead helps you get what you REALLY want!

**The End** 🌟
        `,
        durationMinutes: 6,
        coinReward: 15,
        xpReward: 20,
        ageRange: { min: 5, max: 10 },
        isActive: true,
        createdAt: now,
      },
    ];

    for (const item of content) {
      await ctx.db.insert("educationalContent", item);
    }

    return { message: `Seeded ${content.length} educational content items` };
  },
});
