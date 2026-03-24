import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───────────────────────────────────────────────────────────────────

export const USER_TIERS = ["starter", "growth", "pro"] as const;
export type UserTier = typeof USER_TIERS[number];

// Monthly token allowances per tier
export const TIER_TOKENS: Record<UserTier, number> = {
  starter: 15,
  growth: 50,
  pro: 150,
};

// Token top-up packs (price in cents)
export const TOKEN_PACKS = [
  { id: "pack_25",  tokens: 25,  priceCents: 900,  label: "Starter Boost",  popular: false },
  { id: "pack_75",  tokens: 75,  priceCents: 1900, label: "Popular Pack",   popular: true  },
  { id: "pack_200", tokens: 200, priceCents: 3900, label: "Power Pack",     popular: false },
] as const;

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  tier: text("tier").notNull().default("starter"), // starter | growth | pro
  // Tokens
  tokensBalance: integer("tokens_balance").notNull().default(15),   // current balance (monthly + purchased)
  tokensResetAt: timestamp("tokens_reset_at").defaultNow().notNull(), // when the monthly allowance last reset
  // Stripe
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"), // active | canceled | past_due etc.
  // Password reset
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Token purchase log — one row per top-up purchase
export const tokenPurchases = pgTable("token_purchases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  packId: text("pack_id").notNull(),          // e.g. "pack_25"
  tokensAdded: integer("tokens_added").notNull(),
  priceCents: integer("price_cents").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTokenPurchaseSchema = createInsertSchema(tokenPurchases).omit({ id: true, createdAt: true });
export type InsertTokenPurchase = z.infer<typeof insertTokenPurchaseSchema>;
export type TokenPurchase = typeof tokenPurchases.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, stripeCustomerId: true, stripeSubscriptionId: true, stripeSubscriptionStatus: true, resetToken: true, resetTokenExpiry: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Practices ───────────────────────────────────────────────────────────────

export const SPECIALTIES = [
  "Orthodontist",
  "Dentist",
  "Dermatologist",
  "Med Spa",
  "Plastic Surgeon",
  "Cosmetic Clinic",
  "Aesthetic Practice",
] as const;

export type Specialty = typeof SPECIALTIES[number];

export const BRAND_FEELS = [
  "Luxury & Sophisticated",
  "Warm & Approachable",
  "Clinical & Trustworthy",
  "Fun & Energetic",
  "Minimalist & Modern",
  "Bold & Confident",
] as const;

export type BrandFeel = typeof BRAND_FEELS[number];

export const practices = pgTable("practices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  city: text("city"),
  website: text("website"),
  // Brand identity fields
  logoDataUrl: text("logo_data_url"),        // base64 data URL of uploaded logo
  iconDataUrl: text("icon_data_url"),        // base64 data URL of uploaded icon (optional)
  brandColor1: text("brand_color_1"),        // required hex color #rrggbb
  brandColor2: text("brand_color_2"),        // required hex color #rrggbb
  brandColor3: text("brand_color_3"),        // optional hex color #rrggbb
  brandFeel: text("brand_feel"),             // from BRAND_FEELS enum
  brandVoice: text("brand_voice"),           // free text — how they want to sound
  targetAudience: text("target_audience"),   // free text — who their patients are
  uniqueSellingPoint: text("unique_selling_point"), // what sets them apart
  additionalNotes: text("additional_notes"), // anything else for the AI
  onboardingComplete: boolean("onboarding_complete").default(false),
});

export const insertPracticeSchema = createInsertSchema(practices).omit({ id: true });
export type InsertPractice = z.infer<typeof insertPracticeSchema>;
export type Practice = typeof practices.$inferSelect;

// ─── Campaigns ───────────────────────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// ─── Content Items ────────────────────────────────────────────────────────────

export const CONTENT_TYPES = [
  "Instagram Post",
  "Facebook Post",
  "TikTok/Reel Script",
] as const;

export const CONTENT_GOALS = [
  "Promote Whitening",
  "Promote Invisalign",
  "Promote Botox",
  "Promote Dermal Fillers",
  "Promote Laser Treatment",
  "Educate Patients",
  "Increase Reviews",
  "Seasonal Promotion",
  "Before & After Showcase",
  "Patient Testimonial",
] as const;

export const CONTENT_TONES = [
  "Professional",
  "Friendly",
  "Luxury",
  "Fun",
] as const;

export type ContentType = typeof CONTENT_TYPES[number];
export type ContentGoal = typeof CONTENT_GOALS[number];
export type ContentTone = typeof CONTENT_TONES[number];

export const contentItems = pgTable("content_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  title: text("title").notNull(),
  specialty: text("specialty").notNull(),
  contentType: text("content_type").notNull(),
  goal: text("goal").notNull(),
  tone: text("tone").notNull(),
  caption: text("caption").notNull(),
  hashtags: text("hashtags").notNull(), // stored as comma-separated
  imagePrompt: text("image_prompt").notNull(),
  scheduledDate: text("scheduled_date"), // ISO date string YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, createdAt: true });
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
export type ContentItem = typeof contentItems.$inferSelect;

// ─── Generated Graphics ──────────────────────────────────────────────────────

export const generatedGraphics = pgTable("generated_graphics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),         // DALL-E URL or data URL
  thumbnailUrl: text("thumbnail_url"),           // smaller version for history
  prompt: text("prompt"),                        // AI prompt used
  style: text("style"),                          // style preset
  template: text("template"),                    // template id
  headline: text("headline"),
  subtext: text("subtext"),
  usedBranding: integer("used_branding").default(1), // 1 = yes, 0 = no
  source: text("source").notNull().default("ai"), // 'ai' | 'template' | 'upload'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGeneratedGraphicSchema = createInsertSchema(generatedGraphics).omit({ id: true, createdAt: true });
export type InsertGeneratedGraphic = z.infer<typeof insertGeneratedGraphicSchema>;
export type GeneratedGraphic = typeof generatedGraphics.$inferSelect;

// ─── Before & After Items ─────────────────────────────────────────────────────

export const BA_LAYOUTS = ["side-by-side", "stacked", "split-diagonal"] as const;
export type BALayout = typeof BA_LAYOUTS[number];

export const beforeAfterItems = pgTable("before_after_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  title: text("title").notNull(),
  treatment: text("treatment").notNull(),          // e.g. "Teeth Whitening", "Botox"
  tone: text("tone").notNull(),
  layout: text("layout").notNull().default("side-by-side"), // BA_LAYOUTS
  beforeImageDataUrl: text("before_image_data_url").notNull(),
  afterImageDataUrl: text("after_image_data_url").notNull(),
  compositeDataUrl: text("composite_data_url"),    // canvas-rendered composite image
  caption: text("caption").notNull(),
  hashtags: text("hashtags").notNull(),
  scheduledDate: text("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBeforeAfterSchema = createInsertSchema(beforeAfterItems).omit({ id: true, createdAt: true });
export type InsertBeforeAfter = z.infer<typeof insertBeforeAfterSchema>;
export type BeforeAfterItem = typeof beforeAfterItems.$inferSelect;
