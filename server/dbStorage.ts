/**
 * DrizzleStorage — production database-backed storage using Neon + Drizzle ORM.
 * Implements the same IStorage interface as MemStorage so swapping is seamless.
 */
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, practices, campaigns, contentItems, beforeAfterItems, tokenPurchases,
  type User, type InsertUser,
  type Practice, type InsertPractice,
  type Campaign, type InsertCampaign,
  type ContentItem, type InsertContentItem,
  type BeforeAfterItem, type InsertBeforeAfter,
  type TokenPurchase, type InsertTokenPurchase,
  type UserTier, TIER_TOKENS,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DrizzleStorage implements IStorage {

  // ─── Users ─────────────────────────────────────────────────────────────────

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({
      ...user,
      tier: (user as any).tier ?? "starter",
    }).returning();
    return created;
  }

  async updateUserTier(id: number, tier: UserTier): Promise<User> {
    const [updated] = await db.update(users).set({ tier }).where(eq(users.id, id)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // ─── Stripe helpers ────────────────────────────────────────────────────────

  async updateUserStripe(id: number, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripeSubscriptionStatus?: string;
    tier?: string;
  }): Promise<User> {
    const [updated] = await db.update(users).set(data as any).where(eq(users.id, id)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  // ─── Password reset ────────────────────────────────────────────────────────

  async setResetToken(userId: number, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async clearResetToken(userId: number): Promise<void> {
    await db.update(users).set({ resetToken: null, resetTokenExpiry: null }).where(eq(users.id, userId));
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }

  // ─── Practices ─────────────────────────────────────────────────────────────

  async getPracticeByUserId(userId: number): Promise<Practice | undefined> {
    const [practice] = await db.select().from(practices).where(eq(practices.userId, userId));
    return practice;
  }

  async createPractice(practice: InsertPractice): Promise<Practice> {
    const [created] = await db.insert(practices).values(practice).returning();
    return created;
  }

  async updatePractice(id: number, updates: Partial<InsertPractice>): Promise<Practice> {
    const [updated] = await db.update(practices).set(updates).where(eq(practices.id, id)).returning();
    if (!updated) throw new Error("Practice not found");
    return updated;
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  async getCampaignsByUserId(userId: number): Promise<Campaign[]> {
    return db.select().from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(campaign).returning();
    return created;
  }

  async updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign> {
    const [updated] = await db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning();
    if (!updated) throw new Error("Campaign not found");
    return updated;
  }

  async deleteCampaign(id: number): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // ─── Content Items ─────────────────────────────────────────────────────────

  async getContentItemsByUserId(userId: number): Promise<ContentItem[]> {
    return db.select().from(contentItems)
      .where(eq(contentItems.userId, userId))
      .orderBy(desc(contentItems.createdAt));
  }

  async getContentItemsByCampaignId(campaignId: number): Promise<ContentItem[]> {
    return db.select().from(contentItems)
      .where(eq(contentItems.campaignId, campaignId))
      .orderBy(desc(contentItems.createdAt));
  }

  async getContentItem(id: number): Promise<ContentItem | undefined> {
    const [item] = await db.select().from(contentItems).where(eq(contentItems.id, id));
    return item;
  }

  async createContentItem(item: InsertContentItem): Promise<ContentItem> {
    const [created] = await db.insert(contentItems).values(item).returning();
    return created;
  }

  async updateContentItem(id: number, updates: Partial<InsertContentItem>): Promise<ContentItem> {
    const [updated] = await db.update(contentItems).set(updates).where(eq(contentItems.id, id)).returning();
    if (!updated) throw new Error("Content item not found");
    return updated;
  }

  async deleteContentItem(id: number): Promise<void> {
    await db.delete(contentItems).where(eq(contentItems.id, id));
  }

  // ─── Before & After ────────────────────────────────────────────────────────

  async getBeforeAfterByUserId(userId: number): Promise<BeforeAfterItem[]> {
    return db.select().from(beforeAfterItems)
      .where(eq(beforeAfterItems.userId, userId))
      .orderBy(desc(beforeAfterItems.createdAt));
  }

  async getBeforeAfterItem(id: number): Promise<BeforeAfterItem | undefined> {
    const [item] = await db.select().from(beforeAfterItems).where(eq(beforeAfterItems.id, id));
    return item;
  }

  async createBeforeAfter(item: InsertBeforeAfter): Promise<BeforeAfterItem> {
    const [created] = await db.insert(beforeAfterItems).values(item).returning();
    return created;
  }

  async updateBeforeAfter(id: number, updates: Partial<InsertBeforeAfter>): Promise<BeforeAfterItem> {
    const [updated] = await db.update(beforeAfterItems).set(updates).where(eq(beforeAfterItems.id, id)).returning();
    if (!updated) throw new Error("Before/After item not found");
    return updated;
  }

  async deleteBeforeAfter(id: number): Promise<void> {
    await db.delete(beforeAfterItems).where(eq(beforeAfterItems.id, id));
  }

  // ─── Admin stats ───────────────────────────────────────────────────────────

  async getContentCountByUserId(userId: number): Promise<number> {
    const items = await db.select().from(contentItems).where(eq(contentItems.userId, userId));
    return items.length;
  }

  // ─── Tokens ────────────────────────────────────────────────────────────────

  async getTokenBalance(userId: number): Promise<{ balance: number; resetAt: Date; tier: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    return {
      balance: user.tokensBalance ?? 0,
      resetAt: user.tokensResetAt ?? new Date(),
      tier: user.tier,
    };
  }

  async deductToken(userId: number): Promise<{ balance: number }> {
    // First check if a monthly reset is due
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    // Check if it's been 30+ days since last reset
    const now = new Date();
    const resetAt = user.tokensResetAt ?? now;
    const daysSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceReset >= 30) {
      // Reset balance to tier allowance
      const newBalance = TIER_TOKENS[user.tier as UserTier] ?? 15;
      const [updated] = await db.update(users)
        .set({ tokensBalance: newBalance - 1, tokensResetAt: now })
        .where(eq(users.id, userId))
        .returning();
      return { balance: updated.tokensBalance };
    }

    if ((user.tokensBalance ?? 0) <= 0) {
      throw new Error("No tokens remaining");
    }

    const newBal = (user.tokensBalance ?? 0) - 1;
    const [updated] = await db.update(users)
      .set({ tokensBalance: newBal })
      .where(eq(users.id, userId))
      .returning();
    return { balance: updated.tokensBalance };
  }

  async addTokens(userId: number, amount: number): Promise<{ balance: number }> {
    const [existing] = await db.select().from(users).where(eq(users.id, userId));
    if (!existing) throw new Error("User not found");
    const newBal = (existing.tokensBalance ?? 0) + amount;
    const [updated] = await db.update(users)
      .set({ tokensBalance: newBal })
      .where(eq(users.id, userId))
      .returning();
    return { balance: updated.tokensBalance };
  }

  async resetTokens(userId: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    const newBalance = TIER_TOKENS[user.tier as UserTier] ?? 15;
    await db.update(users)
      .set({ tokensBalance: newBalance, tokensResetAt: new Date() })
      .where(eq(users.id, userId));
  }

  async logTokenPurchase(data: InsertTokenPurchase): Promise<TokenPurchase> {
    const [created] = await db.insert(tokenPurchases).values(data).returning();
    return created;
  }

  async getTokenPurchaseHistory(userId: number): Promise<TokenPurchase[]> {
    return db.select().from(tokenPurchases)
      .where(eq(tokenPurchases.userId, userId))
      .orderBy(desc(tokenPurchases.createdAt));
  }

  // ─── Generated Graphics ───────────────────────────────────────────────────

  async getGraphicsByUserId(userId: number) {
    const { generatedGraphics } = await import("@shared/schema");
    return db.select().from(generatedGraphics)
      .where(eq(generatedGraphics.userId, userId))
      .orderBy(desc(generatedGraphics.createdAt))
      .limit(50);
  }

  async saveGraphic(data: any) {
    const { generatedGraphics } = await import("@shared/schema");
    const [created] = await db.insert(generatedGraphics).values(data).returning();
    return created;
  }

  async deleteGraphic(id: number) {
    const { generatedGraphics } = await import("@shared/schema");
    await db.delete(generatedGraphics).where(eq(generatedGraphics.id, id));
  }
}
