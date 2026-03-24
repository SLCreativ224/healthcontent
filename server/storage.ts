import {
  users, practices, campaigns, contentItems, beforeAfterItems,
  type User, type InsertUser,
  type Practice, type InsertPractice,
  type Campaign, type InsertCampaign,
  type ContentItem, type InsertContentItem,
  type BeforeAfterItem, type InsertBeforeAfter,
  type UserTier,
} from "@shared/schema";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Users — tier management
  updateUserTier(id: number, tier: UserTier): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Practices
  getPracticeByUserId(userId: number): Promise<Practice | undefined>;
  createPractice(practice: InsertPractice): Promise<Practice>;
  updatePractice(id: number, updates: Partial<InsertPractice>): Promise<Practice>;

  // Campaigns
  getCampaignsByUserId(userId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(id: number): Promise<void>;

  // Content Items
  getContentItemsByUserId(userId: number): Promise<ContentItem[]>;
  getContentItemsByCampaignId(campaignId: number): Promise<ContentItem[]>;
  getContentItem(id: number): Promise<ContentItem | undefined>;
  createContentItem(item: InsertContentItem): Promise<ContentItem>;
  updateContentItem(id: number, updates: Partial<InsertContentItem>): Promise<ContentItem>;
  deleteContentItem(id: number): Promise<void>;

  // Before & After Items
  getBeforeAfterByUserId(userId: number): Promise<BeforeAfterItem[]>;
  getBeforeAfterItem(id: number): Promise<BeforeAfterItem | undefined>;
  createBeforeAfter(item: InsertBeforeAfter): Promise<BeforeAfterItem>;
  updateBeforeAfter(id: number, updates: Partial<InsertBeforeAfter>): Promise<BeforeAfterItem>;
  deleteBeforeAfter(id: number): Promise<void>;
}

// ─── In-Memory Implementation ─────────────────────────────────────────────────

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private practices: Map<number, Practice> = new Map();
  private campaigns: Map<number, Campaign> = new Map();
  private contentItems: Map<number, ContentItem> = new Map();
  private beforeAfterItems: Map<number, BeforeAfterItem> = new Map();
  private nextId = { users: 1, practices: 1, campaigns: 1, contentItems: 1, beforeAfter: 1 };

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.nextId.users++;
    const newUser: User = { ...user, id, tier: (user as any).tier ?? "starter", createdAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserTier(id: number, tier: UserTier): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error("User not found");
    const updated = { ...existing, tier };
    this.users.set(id, updated);
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => a.id - b.id);
  }

  // Practices
  async getPracticeByUserId(userId: number): Promise<Practice | undefined> {
    return Array.from(this.practices.values()).find((p) => p.userId === userId);
  }

  async createPractice(practice: InsertPractice): Promise<Practice> {
    const id = this.nextId.practices++;
    const newPractice: Practice = {
      ...practice,
      id,
      city: practice.city ?? null,
      website: practice.website ?? null,
      logoDataUrl: practice.logoDataUrl ?? null,
      iconDataUrl: practice.iconDataUrl ?? null,
      brandColor1: practice.brandColor1 ?? null,
      brandColor2: practice.brandColor2 ?? null,
      brandColor3: practice.brandColor3 ?? null,
      brandFeel: practice.brandFeel ?? null,
      brandVoice: practice.brandVoice ?? null,
      targetAudience: practice.targetAudience ?? null,
      uniqueSellingPoint: practice.uniqueSellingPoint ?? null,
      additionalNotes: practice.additionalNotes ?? null,
      onboardingComplete: practice.onboardingComplete ?? false,
    };
    this.practices.set(id, newPractice);
    return newPractice;
  }

  async updatePractice(id: number, updates: Partial<InsertPractice>): Promise<Practice> {
    const existing = this.practices.get(id);
    if (!existing) throw new Error("Practice not found");
    const updated = { ...existing, ...updates };
    this.practices.set(id, updated);
    return updated;
  }

  // Campaigns
  async getCampaignsByUserId(userId: number): Promise<Campaign[]> {
    return Array.from(this.campaigns.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const id = this.nextId.campaigns++;
    const newCampaign: Campaign = { ...campaign, id, description: campaign.description ?? null, createdAt: new Date() };
    this.campaigns.set(id, newCampaign);
    return newCampaign;
  }

  async updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign> {
    const existing = this.campaigns.get(id);
    if (!existing) throw new Error("Campaign not found");
    const updated = { ...existing, ...updates };
    this.campaigns.set(id, updated);
    return updated;
  }

  async deleteCampaign(id: number): Promise<void> {
    this.campaigns.delete(id);
  }

  // Content Items
  async getContentItemsByUserId(userId: number): Promise<ContentItem[]> {
    return Array.from(this.contentItems.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getContentItemsByCampaignId(campaignId: number): Promise<ContentItem[]> {
    return Array.from(this.contentItems.values())
      .filter((c) => c.campaignId === campaignId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getContentItem(id: number): Promise<ContentItem | undefined> {
    return this.contentItems.get(id);
  }

  async createContentItem(item: InsertContentItem): Promise<ContentItem> {
    const id = this.nextId.contentItems++;
    const newItem: ContentItem = {
      ...item,
      id,
      campaignId: item.campaignId ?? null,
      scheduledDate: item.scheduledDate ?? null,
      createdAt: new Date(),
    };
    this.contentItems.set(id, newItem);
    return newItem;
  }

  async updateContentItem(id: number, updates: Partial<InsertContentItem>): Promise<ContentItem> {
    const existing = this.contentItems.get(id);
    if (!existing) throw new Error("Content item not found");
    const updated = { ...existing, ...updates };
    this.contentItems.set(id, updated);
    return updated;
  }

  async deleteContentItem(id: number): Promise<void> {
    this.contentItems.delete(id);
  }

  // Before & After Items
  async getBeforeAfterByUserId(userId: number): Promise<BeforeAfterItem[]> {
    return Array.from(this.beforeAfterItems.values())
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBeforeAfterItem(id: number): Promise<BeforeAfterItem | undefined> {
    return this.beforeAfterItems.get(id);
  }

  async createBeforeAfter(item: InsertBeforeAfter): Promise<BeforeAfterItem> {
    const id = this.nextId.beforeAfter++;
    const newItem: BeforeAfterItem = {
      ...item,
      id,
      campaignId: item.campaignId ?? null,
      compositeDataUrl: item.compositeDataUrl ?? null,
      scheduledDate: item.scheduledDate ?? null,
      createdAt: new Date(),
    };
    this.beforeAfterItems.set(id, newItem);
    return newItem;
  }

  async updateBeforeAfter(id: number, updates: Partial<InsertBeforeAfter>): Promise<BeforeAfterItem> {
    const existing = this.beforeAfterItems.get(id);
    if (!existing) throw new Error("Before/After item not found");
    const updated = { ...existing, ...updates };
    this.beforeAfterItems.set(id, updated);
    return updated;
  }

  async deleteBeforeAfter(id: number): Promise<void> {
    this.beforeAfterItems.delete(id);
  }
}

export const storage = new MemStorage();
