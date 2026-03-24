import type { Express, Request, Response } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { generateContent, improveContent, generateBeforeAfterCaption } from "./ai";
import { stripe, ensureStripePrices, getOrCreateCustomer, createCheckoutSession, createBillingPortalSession, priceIdToTier, PLANS } from "./stripe";
import { sendWelcomeEmail, sendPasswordResetEmail, sendSubscriptionEmail } from "./email";
import { DrizzleStorage } from "./dbStorage";
import {
  insertUserSchema,
  insertPracticeSchema,
  insertCampaignSchema,
  insertContentItemSchema,
  SPECIALTIES,
  CONTENT_TYPES,
  CONTENT_GOALS,
  CONTENT_TONES,
  BRAND_FEELS,
  BA_LAYOUTS,
  USER_TIERS,
  TOKEN_PACKS,
  TIER_TOKENS,
} from "@shared/schema";
import { z } from "zod";
import * as crypto from "crypto";
// session/cookie imports removed — using token-based auth

// Simple password hashing
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "hc_salt_2024").digest("hex");
}

// ─── Token-based auth (works in cross-origin iframes; no cookies needed) ───────
// In-memory token store: token -> userId. Tokens are random 32-byte hex strings.
const tokenStore = new Map<string, { userId: number; expiresAt: number }>();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function createToken(userId: number): string {
  const token = generateToken();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  tokenStore.set(token, { userId, expiresAt });
  return token;
}

function getUserIdFromToken(token: string): number | null {
  const entry = tokenStore.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  return entry.userId;
}

function revokeToken(token: string) {
  tokenStore.delete(token);
}

// Helper: extract token from Authorization header or x-auth-token header
function extractToken(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  const header = req.headers["x-auth-token"];
  if (header && typeof header === "string") return header;
  return null;
}

function requireAuth(req: Request, res: Response, next: Function) {
  const token = extractToken(req);
  const userId = token ? getUserIdFromToken(token) : null;
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  (req as any).userId = userId;
  next();
}

// ─── Seed demo account on startup ────────────────────────────────────────────
export async function seedDemoAccount() {
  const demoEmail = "demo@healthcontent.ai";
  const existing = await storage.getUserByEmail(demoEmail);
  if (!existing) {
    const demoUser = await storage.createUser({
      email: demoEmail,
      password: hashPassword("Demo1234!"),
      tier: "pro",
    } as any);
    // Create a complete demo practice for the demo account
    await storage.createPractice({
      userId: demoUser.id,
      name: "Bright Smiles Orthodontics",
      specialty: "Orthodontist",
      city: "Austin, TX",
      website: "https://brightsmiles.com",
      brandColor1: "#6B5CE7",
      brandColor2: "#9B8AF0",
      brandColor3: "#ffffff",
      brandFeel: "Warm & Approachable",
      brandVoice: "Friendly, encouraging, and focused on patient confidence. Never overly clinical.",
      targetAudience: "Teens and adults seeking orthodontic treatment in a welcoming environment",
      uniqueSellingPoint: "We combine cutting-edge technology with a spa-like experience",
      additionalNotes: "",
      onboardingComplete: true,
    });
    console.log("[seed] Demo account created: demo@healthcontent.ai / Demo1234!");
  }
}

// Use real DB storage in production, in-memory as fallback
const useDatabase = !!process.env.DATABASE_URL;
if (useDatabase) {
  // Replace the in-memory storage singleton with the DB-backed one.
  // IMPORTANT: Object.assign only copies own enumerable properties — class methods
  // live on the prototype and won't be copied. We must bind them explicitly.
  const dbStorage = new DrizzleStorage();
  Object.getOwnPropertyNames(DrizzleStorage.prototype).forEach((name) => {
    if (name !== "constructor") {
      (storage as any)[name] = (DrizzleStorage.prototype as any)[name].bind(dbStorage);
    }
  });
  // Also copy any own instance properties (if any are set in the constructor)
  Object.assign(storage, dbStorage);
  console.log("[storage] Using PostgreSQL (Neon)");
} else {
  console.log("[storage] Using in-memory storage (no DATABASE_URL)");
}

export async function registerRoutes(httpServer: Server, app: Express) {
  // Health check for Railway / uptime monitoring
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Increase body size limit for logo uploads (base64 images can be large)
  app.use(require("express").json({ limit: "10mb" }));

  // ─── Auth ──────────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email("Please enter a valid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }).parse(req.body);

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "An account with this email already exists" });

      const user = await storage.createUser({
        email,
        password: hashPassword(password),
        tier: "starter",
      } as any);

      const token = createToken(user.id);

      // Send welcome email (non-blocking)
      sendWelcomeEmail(email).catch((e) => console.warn("[email] welcome email failed:", e.message));

      res.json({ token, user: { id: user.id, email: user.email, tier: user.tier ?? "starter" } });
    } catch (err: any) {
      if (err.errors) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Invalid input" });
      }
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({ email: z.string(), password: z.string() }).parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const token = createToken(user.id);
      res.json({ token, user: { id: user.id, email: user.email, tier: user.tier ?? "starter" } });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = extractToken(req);
    if (token) revokeToken(token);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const userId = (req as any).userId as number;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ id: user.id, email: user.email, tier: user.tier ?? "starter" });
  });

  // ─── Practice ─────────────────────────────────────────────────────────────

  app.get("/api/practice", requireAuth, async (req, res) => {
    const userId = (req as any).userId as number;
    const practice = await storage.getPracticeByUserId(userId);
    // Return null (200) instead of 404 — frontend treats null as "needs onboarding"
    res.json(practice ?? null);
  });

  app.post("/api/practice", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      // Accept all practice fields except userId (comes from session)
      const practiceSchema = z.object({
        name: z.string().min(1),
        specialty: z.string(),
        city: z.string().optional(),
        website: z.string().optional(),
        logoDataUrl: z.string().optional(),
        iconDataUrl: z.string().optional(),
        brandColor1: z.string().optional(),
        brandColor2: z.string().optional(),
        brandColor3: z.string().optional(),
        brandFeel: z.string().optional(),
        brandVoice: z.string().optional(),
        targetAudience: z.string().optional(),
        uniqueSellingPoint: z.string().optional(),
        additionalNotes: z.string().optional(),
        onboardingComplete: z.boolean().optional(),
      });
      const body = practiceSchema.parse(req.body);
      const existing = await storage.getPracticeByUserId(userId);
      if (existing) {
        const updated = await storage.updatePractice(existing.id, { ...body, userId });
        return res.json(updated);
      }
      const practice = await storage.createPractice({ ...body, userId });
      res.json(practice);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/practice", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const existing = await storage.getPracticeByUserId(userId);
      if (!existing) return res.status(404).json({ message: "No practice found" });
      const updated = await storage.updatePractice(existing.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ─── Campaigns ────────────────────────────────────────────────────────────

  app.get("/api/campaigns", requireAuth, async (req, res) => {
    const userId = (req as any).userId as number;
    res.json(await storage.getCampaignsByUserId(userId));
  });

  app.get("/api/campaigns/:id", requireAuth, async (req, res) => {
    const campaign = await storage.getCampaign(Number(req.params.id));
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    res.json(campaign);
  });

  app.post("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const body = insertCampaignSchema.omit({ userId: true }).parse(req.body);
      const campaign = await storage.createCampaign({ ...body, userId });
      res.json(campaign);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateCampaign(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/campaigns/:id", requireAuth, async (req, res) => {
    await storage.deleteCampaign(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Content Items ────────────────────────────────────────────────────────

  app.get("/api/content", requireAuth, async (req, res) => {
    const userId = (req as any).userId as number;
    res.json(await storage.getContentItemsByUserId(userId));
  });

  app.get("/api/content/campaign/:campaignId", requireAuth, async (req, res) => {
    res.json(await storage.getContentItemsByCampaignId(Number(req.params.campaignId)));
  });

  app.get("/api/content/:id", requireAuth, async (req, res) => {
    const item = await storage.getContentItem(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Content item not found" });
    res.json(item);
  });

  app.patch("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateContentItem(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/content/:id", requireAuth, async (req, res) => {
    await storage.deleteContentItem(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Tokens ────────────────────────────────────────────────────────────────

  app.get("/api/tokens", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const data = await (storage as any).getTokenBalance(userId);
      const tier = data.tier as keyof typeof TIER_TOKENS;
      res.json({
        balance: data.balance,
        resetAt: data.resetAt,
        monthlyAllowance: TIER_TOKENS[tier] ?? 15,
        packs: TOKEN_PACKS,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tokens/checkout", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const { packId } = z.object({ packId: z.string() }).parse(req.body);
      const pack = TOKEN_PACKS.find(p => p.id === packId);
      if (!pack) return res.status(400).json({ message: "Invalid pack" });
      if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ message: "Billing not configured" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const customerId = await getOrCreateCustomer(userId, user.email, user.stripeCustomerId ?? null);
      if (customerId !== user.stripeCustomerId) {
        await (storage as any).updateUserStripe(userId, { stripeCustomerId: customerId });
      }

      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: pack.priceCents,
            product_data: {
              name: `${pack.label} — ${pack.tokens} Tokens`,
              description: `Add ${pack.tokens} content generation tokens to your account`,
            },
          },
          quantity: 1,
        }],
        metadata: { userId: String(userId), packId: pack.id, tokensAdded: String(pack.tokens), priceCents: String(pack.priceCents) },
        success_url: `${appUrl}/#/app/billing?topup=success`,
        cancel_url: `${appUrl}/#/app/billing`,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Token checkout error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ─── AI: Generate Content ─────────────────────────────────────────────────

  app.post("/api/ai/generate", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const schema = z.object({
        specialty: z.enum(SPECIALTIES),
        contentType: z.enum(CONTENT_TYPES),
        goal: z.enum(CONTENT_GOALS),
        tone: z.enum(CONTENT_TONES),
        customIdea: z.string().optional(),
      });
      const body = schema.parse(req.body);

      // Deduct 1 token — returns 402 if balance is 0
      try {
        await (storage as any).deductToken(userId);
      } catch (e: any) {
        if (e.message === "No tokens remaining") {
          return res.status(402).json({ message: "No tokens remaining. Purchase more to keep generating content." });
        }
        throw e;
      }

      // Get practice details for better context — including brand identity
      const practice = await storage.getPracticeByUserId(userId);

      const generated = await generateContent({
        ...body,
        customIdea: body.customIdea,
        practiceName: practice?.name,
        city: practice?.city ?? undefined,
        brandFeel: practice?.brandFeel ?? undefined,
        brandVoice: practice?.brandVoice ?? undefined,
        targetAudience: practice?.targetAudience ?? undefined,
        uniqueSellingPoint: practice?.uniqueSellingPoint ?? undefined,
        brandColors: [
          practice?.brandColor1,
          practice?.brandColor2,
          practice?.brandColor3,
        ].filter(Boolean).join(", ") || undefined,
      });

      // Auto-generate a title
      const title = `${body.goal} — ${body.contentType}`;

      // Save as a new content item
      const item = await storage.createContentItem({
        userId,
        title,
        specialty: body.specialty,
        contentType: body.contentType,
        goal: body.goal,
        tone: body.tone,
        caption: generated.caption,
        hashtags: generated.hashtags,
        imagePrompt: generated.imagePrompt,
        campaignId: null,
        scheduledDate: null,
      });

      res.json(item);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── AI: Improve Caption ──────────────────────────────────────────────────

  app.post("/api/ai/improve/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.getContentItem(Number(req.params.id));
      if (!item) return res.status(404).json({ message: "Content item not found" });

      const { instructions } = z.object({ instructions: z.string().optional() }).parse(req.body);

      const improvedCaption = await improveContent({
        caption: item.caption,
        contentType: item.contentType,
        goal: item.goal,
        tone: item.tone,
        instructions,
      });

      const updated = await storage.updateContentItem(item.id, { caption: improvedCaption });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Before & After ──────────────────────────────────────────────────────

  app.get("/api/before-after", requireAuth, async (req, res) => {
    const userId = (req as any).userId as number;
    const items = await storage.getBeforeAfterByUserId(userId);
    // Strip large data URLs from list view to keep response small
    res.json(items.map(({ beforeImageDataUrl, afterImageDataUrl, compositeDataUrl, ...rest }) => ({
      ...rest,
      hasBeforeImage: !!beforeImageDataUrl,
      hasAfterImage: !!afterImageDataUrl,
      compositeDataUrl: compositeDataUrl ?? null,
    })));
  });

  app.get("/api/before-after/:id", requireAuth, async (req, res) => {
    const item = await storage.getBeforeAfterItem(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.post("/api/before-after", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const body = z.object({
        title: z.string().min(1),
        treatment: z.string().min(1),
        tone: z.string().min(1),
        layout: z.string().default("side-by-side"),
        beforeImageDataUrl: z.string().min(1),
        afterImageDataUrl: z.string().min(1),
        compositeDataUrl: z.string().optional(),
        caption: z.string(),
        hashtags: z.string(),
        campaignId: z.number().nullable().optional(),
        scheduledDate: z.string().nullable().optional(),
      }).parse(req.body);

      const item = await storage.createBeforeAfter({ ...body, userId });
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/before-after/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateBeforeAfter(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/before-after/:id", requireAuth, async (req, res) => {
    await storage.deleteBeforeAfter(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── AI: Before & After Caption ───────────────────────────────────────────

  app.post("/api/ai/before-after", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const body = z.object({
        treatment: z.string().min(1),
        tone: z.string().min(1),
        specialty: z.string().optional(),
      }).parse(req.body);

      const practice = await storage.getPracticeByUserId(userId);

      const result = await generateBeforeAfterCaption({
        treatment: body.treatment,
        tone: body.tone,
        specialty: body.specialty || practice?.specialty || "Aesthetic Practice",
        practiceName: practice?.name,
        brandFeel: practice?.brandFeel ?? undefined,
        brandVoice: practice?.brandVoice ?? undefined,
        targetAudience: practice?.targetAudience ?? undefined,
        uniqueSellingPoint: practice?.uniqueSellingPoint ?? undefined,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Graphics History ───────────────────────────────────────────────────────

  app.get("/api/graphics", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const graphics = await (storage as any).getGraphicsByUserId(userId);
      res.json(graphics);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/graphics", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const body = z.object({
        imageUrl: z.string(),
        thumbnailUrl: z.string().optional(),
        prompt: z.string().optional(),
        style: z.string().optional(),
        template: z.string().optional(),
        headline: z.string().optional(),
        subtext: z.string().optional(),
        usedBranding: z.number().optional(),
        source: z.string().optional(),
      }).parse(req.body);
      const graphic = await (storage as any).saveGraphic({ userId, ...body });
      res.json(graphic);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/graphics/:id", requireAuth, async (req, res) => {
    try {
      await (storage as any).deleteGraphic(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ─── AI: Image Generation (DALL-E 3) ─────────────────────────────────────

  app.post("/api/ai/image", requireAuth, async (req, res) => {
    try {
      const { prompt, style, brandColors, practiceName } = z.object({
        prompt: z.string().min(1),
        style: z.string().optional(),
        brandColors: z.array(z.string()).optional(),
        practiceName: z.string().optional(),
      }).parse(req.body);

      const replicateKey = process.env.REPLICATE_API_TOKEN;
      const openaiKey = process.env.OPENAI_API_KEY;

      if (!replicateKey && !openaiKey) {
        return res.json({
          url: `https://placehold.co/1024x1024/6B5CE7/ffffff?text=AI+Image+%28Add+API+Key%29`,
          revised_prompt: prompt,
        });
      }

      // Build a highly specific prompt per style
      const colorContext = brandColors?.length
        ? `Incorporate these brand colors subtly: ${brandColors.filter(c => c && c !== '#ffffff').join(", ")}.`
        : "";

      const styleDirectives: Record<string, string> = {
        "photorealistic": "Ultra-photorealistic DSLR photography, 85mm portrait lens, natural lighting, shallow depth of field, shot on Canon EOS R5, professional healthcare photography. Real people, real setting. NOT illustrated, NOT cartoon, NOT AI-looking.",
        "editorial": "High-end editorial photography, Vogue/Harper's Bazaar aesthetic, perfect studio lighting, magazine cover quality, professional retouching, luxury healthcare brand feel.",
        "warm-lifestyle": "Warm natural lifestyle photography, golden hour light, candid authentic moment, shot on film, soft bokeh background, approachable and human. Real people, natural colors.",
        "clean-studio": "Clean white studio photography, professional lighting setup, minimal background, crisp shadows, product/portrait photography style, premium healthcare branding.",
        "bold-graphic": "Modern bold graphic design, geometric shapes, strong typography layout (no actual words), vibrant brand colors, flat design with depth, inspired by Nike/Apple campaigns.",
        "flat-icon": "Clean flat vector illustration, minimal line art, simple geometric icons, healthcare iconography, modern app icon aesthetic, white background with brand color accents. SVG-style clarity.",
        "3d-render": "Premium 3D render, glass morphism, subtle neon glow, floating objects, dark background, Blender/Cinema4D quality, futuristic healthcare aesthetic, caustic light effects.",
        "cinematic": "Cinematic photography, dramatic directional lighting, 2.39:1 aspect ratio feel, color graded, teal and orange tones mixed with brand colors, story-driven composition.",
      };

      const styleGuide = styleDirectives[style || "photorealistic"] || styleDirectives["photorealistic"];

      // Variation seeds so each generation feels unique
      const diversityHints = [
        "diverse ethnicities, varied ages",
        "authentic candid moment, not posed",
        "unique and original, not stock photo",
        "genuine emotion, natural expressions",
        "documentary photography feel",
        "fresh perspective, unexpected angle",
        "real life authenticity, not generic",
        "cinematic composition, rule of thirds",
      ];
      const variationSeed = diversityHints[Math.floor(Math.random() * diversityHints.length)];
      const lightingVariants = ["soft natural window light", "warm golden hour light", "bright clinic lighting", "soft diffused light", "dramatic side lighting"];
      const lightingHint = lightingVariants[Math.floor(Math.random() * lightingVariants.length)];

      const fullPrompt = `${styleGuide} Subject: ${prompt}. ${colorContext} ${variationSeed}. ${lightingHint}. Professional healthcare social media post. No text, no words, no logos. Square 1:1 format. Extremely high quality. Unique and fresh, not stock photo.`;

      // Use Flux Pro (Replicate) if available — far better photorealism than DALL-E
      if (replicateKey) {
        // Step 1: Start the prediction
        const startRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-pro/predictions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${replicateKey}`,
            "Prefer": "wait=60",
          },
          body: JSON.stringify({
            input: {
              prompt: fullPrompt,
              width: 1024,
              height: 1024,
              steps: 25,
              guidance: 3,
              output_format: "webp",
              output_quality: 90,
              safety_tolerance: 2,
            },
          }),
        });

        if (!startRes.ok) {
          const errText = await startRes.text();
          throw new Error(`Flux Pro error: ${errText}`);
        }

        const prediction = await startRes.json() as any;

        // If completed immediately
        if (prediction.output) {
          const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
          return res.json({ url, revised_prompt: fullPrompt });
        }

        // Step 2: Poll until done (max 60s)
        const predId = prediction.id;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
            headers: { Authorization: `Bearer ${replicateKey}` },
          });
          const poll = await pollRes.json() as any;
          if (poll.status === "succeeded") {
            const url = Array.isArray(poll.output) ? poll.output[0] : poll.output;
            return res.json({ url, revised_prompt: fullPrompt });
          }
          if (poll.status === "failed" || poll.status === "canceled") {
            throw new Error(`Flux Pro generation ${poll.status}: ${poll.error || "unknown error"}`);
          }
        }
        throw new Error("Flux Pro timed out after 60s");
      }

      // Fallback: DALL-E 3
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          response_format: "url",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`DALL-E error: ${err}`);
      }

      const data = await response.json() as any;
      res.json({
        url: data.data[0].url,
        revised_prompt: data.data[0].revised_prompt,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── AI: Brand-style an uploaded photo ────────────────────────────────

  app.post("/api/ai/brand-style", requireAuth, async (req, res) => {
    try {
      const { imageBase64, brandColors, practiceName, brandFeel } = z.object({
        imageBase64: z.string(),
        brandColors: z.array(z.string()).optional(),
        practiceName: z.string().optional(),
        brandFeel: z.string().optional(),
      }).parse(req.body);

      const replicateKey = process.env.REPLICATE_API_TOKEN;
      if (!replicateKey) {
        return res.status(400).json({ message: "Replicate API key not configured" });
      }

      const colorDesc = brandColors?.filter(c => c && c !== '#ffffff').join(", ") || "professional healthcare colors";
      const prompt = `Professional healthcare social media photo, color graded to use ${colorDesc} as the dominant color palette, ${brandFeel || "modern and clean"} aesthetic, high-end photography, perfect for ${practiceName || "a healthcare practice"} social media. Enhance lighting, make it look premium and polished.`;

      // Use Flux Pro img2img via Replicate
      const startRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-pro/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${replicateKey}`,
          "Prefer": "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt,
            image: imageBase64,
            prompt_strength: 0.4, // 0 = keep original, 1 = full restyle
            width: 1024,
            height: 1024,
            steps: 25,
            guidance: 3.5,
            output_format: "webp",
            output_quality: 90,
          },
        }),
      });

      if (!startRes.ok) {
        const errText = await startRes.text();
        // Fallback: just return the original if img2img not supported
        return res.json({ url: null, message: "Brand styling not available, use the image as-is" });
      }

      const prediction = await startRes.json() as any;
      if (prediction.output) {
        const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        return res.json({ url });
      }

      // Poll
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: { Authorization: `Bearer ${replicateKey}` },
        }).then(r => r.json()) as any;
        if (poll.status === "succeeded") {
          const url = Array.isArray(poll.output) ? poll.output[0] : poll.output;
          return res.json({ url });
        }
        if (poll.status === "failed" || poll.status === "canceled") break;
      }
      res.json({ url: null, message: "Could not process image" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Meta ─────────────────────────────────────────────────────────────────

  app.get("/api/meta", (_req, res) => {
    res.json({
      specialties: SPECIALTIES,
      contentTypes: CONTENT_TYPES,
      goals: CONTENT_GOALS,
      tones: CONTENT_TONES,
      brandFeels: BRAND_FEELS,
    });
  });

  // ─── Password Reset ───────────────────────────────────────────────────────

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const user = await storage.getUserByEmail(email);
      // Always return 200 to avoid email enumeration
      if (user && (storage as any).setResetToken) {
        const token = require("crypto").randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await (storage as any).setResetToken(user.id, token, expiry);
        await sendPasswordResetEmail(email, token);
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = z.object({
        token: z.string().min(1),
        password: z.string().min(8),
      }).parse(req.body);

      if (!(storage as any).getUserByResetToken) {
        return res.status(400).json({ message: "Password reset not available" });
      }

      const user = await (storage as any).getUserByResetToken(token);
      if (!user) return res.status(400).json({ message: "Invalid or expired reset link" });
      if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ message: "Reset link has expired — please request a new one" });
      }

      await (storage as any).updatePassword(user.id, hashPassword(password));
      await (storage as any).clearResetToken(user.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ─── Billing (Stripe) ─────────────────────────────────────────────────────

  // Ensure Stripe products exist and get price IDs
  let stripePrices: { starter: string; growth: string; pro: string } | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    ensureStripePrices().then(prices => { stripePrices = prices; }).catch(console.error);
  }

  app.post("/api/billing/checkout", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const { plan } = z.object({ plan: z.enum(["starter", "growth", "pro"]) }).parse(req.body);

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(400).json({ message: "Billing not configured" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Get or create Stripe customer
      const customerId = await getOrCreateCustomer(userId, user.email, user.stripeCustomerId ?? null);
      if (customerId !== user.stripeCustomerId) {
        await (storage as any).updateUserStripe(userId, { stripeCustomerId: customerId });
      }

      if (!stripePrices) {
        return res.status(503).json({ message: "Billing prices not ready — please try again" });
      }

      const priceId = stripePrices[plan];
      const appUrl = process.env.APP_URL || "http://localhost:5000";

      const checkoutUrl = await createCheckoutSession({
        customerId,
        priceId,
        userId,
        successUrl: `${appUrl}/#/app/billing?success=1`,
        cancelUrl: `${appUrl}/#/app/billing`,
      });

      res.json({ url: checkoutUrl });
    } catch (err: any) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/billing/portal", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId as number;
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found" });
      }
      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const url = await createBillingPortalSession(user.stripeCustomerId, `${appUrl}/#/app/billing`);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Stripe Webhook ───────────────────────────────────────────────────────
  // Raw body needed for signature verification — must come BEFORE express.json()

  app.post("/api/webhooks/stripe",
    require("express").raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: any;
      try {
        if (webhookSecret && webhookSecret !== "whsec_placeholder") {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
          // Dev mode — parse without verification
          event = JSON.parse(req.body.toString());
        }
      } catch (err: any) {
        console.error("Webhook signature failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object;
            const userId = Number(session.metadata?.userId);
            if (!userId) break;

            if (session.mode === "subscription") {
              // Subscription purchase
              const subscription = await stripe.subscriptions.retrieve(session.subscription);
              const priceId = subscription.items.data[0]?.price.id;
              const tier = priceIdToTier(priceId) || "starter";
              await (storage as any).updateUserStripe(userId, {
                stripeSubscriptionId: session.subscription,
                stripeSubscriptionStatus: subscription.status,
                tier,
              });
              const user = await storage.getUser(userId);
              if (user) await sendSubscriptionEmail(user.email, tier.charAt(0).toUpperCase() + tier.slice(1), true);
            } else if (session.mode === "payment") {
              // One-time token pack purchase
              const tokensAdded = Number(session.metadata?.tokensAdded);
              const packId = session.metadata?.packId;
              const priceCents = Number(session.metadata?.priceCents);
              if (tokensAdded > 0) {
                await (storage as any).addTokens(userId, tokensAdded);
                await (storage as any).logTokenPurchase({
                  userId,
                  packId: packId || "unknown",
                  tokensAdded,
                  priceCents,
                  stripePaymentIntentId: session.payment_intent ?? null,
                });
                console.log(`[tokens] +${tokensAdded} tokens added to user ${userId}`);
              }
            }
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object;
            const customerId = sub.customer;
            const user = await (storage as any).getUserByStripeCustomerId(customerId);
            if (!user) break;

            const priceId = sub.items.data[0]?.price.id;
            const tier = priceIdToTier(priceId) || user.tier;

            await (storage as any).updateUserStripe(user.id, {
              stripeSubscriptionStatus: sub.status,
              tier: sub.status === "active" ? tier : "starter",
            });
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object;
            const user = await (storage as any).getUserByStripeCustomerId(sub.customer);
            if (!user) break;
            await (storage as any).updateUserStripe(user.id, {
              stripeSubscriptionStatus: "canceled",
              tier: "starter",
            });
            break;
          }

        }
        res.json({ received: true });
      } catch (err: any) {
        console.error("Webhook handler error:", err);
        res.status(500).json({ message: err.message });
      }
    }
  );

  // ─── Admin ────────────────────────────────────────────────────────────────

  function requireAdmin(req: Request, res: Response, next: Function) {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    // For Stage 2, admin = any logged-in user with email matching admin list
    // In production, add an isAdmin field to users table
    const adminEmails = (process.env.ADMIN_EMAILS || "demo@healthcontent.ai,spencer@slcreativ.com").split(",");
    storage.getUser(userId).then(user => {
      if (!user || !adminEmails.includes(user.email)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    });
  }

  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();

      // Enrich with content counts and practice names
      const enriched = await Promise.all(allUsers.map(async (u) => {
        const practice = await storage.getPracticeByUserId(u.id);
        const contentCount = (storage as any).getContentCountByUserId
          ? await (storage as any).getContentCountByUserId(u.id)
          : 0;
        const tokenData = (storage as any).getTokenBalance
          ? await (storage as any).getTokenBalance(u.id).catch(() => ({ balance: 0 }))
          : { balance: 0 };
        return {
          id: u.id,
          email: u.email,
          tier: u.tier,
          stripeSubscriptionStatus: u.stripeSubscriptionStatus ?? null,
          createdAt: u.createdAt,
          contentCount,
          practiceName: practice?.name ?? null,
          tokensBalance: tokenData.balance,
          tokensResetAt: tokenData.resetAt ?? null,
        };
      }));

      // Stats
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const stats = {
        totalUsers: allUsers.length,
        starterCount: allUsers.filter(u => u.tier === "starter").length,
        growthCount: allUsers.filter(u => u.tier === "growth").length,
        proCount: allUsers.filter(u => u.tier === "pro").length,
        totalContent: enriched.reduce((sum, u) => sum + u.contentCount, 0),
        newUsersThisWeek: allUsers.filter(u => new Date(u.createdAt) > oneWeekAgo).length,
      };

      res.json({ users: enriched, stats });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/users/:id/tier", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { tier } = z.object({ tier: z.enum(["starter", "growth", "pro"]) }).parse(req.body);
      const updated = await storage.updateUserTier(Number(req.params.id), tier);
      res.json({ id: updated.id, email: updated.email, tier: updated.tier });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Admin: grant tokens to a user
  app.post("/api/admin/users/:id/tokens", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { amount } = z.object({ amount: z.number().int().min(1).max(10000) }).parse(req.body);
      const result = await (storage as any).addTokens(Number(req.params.id), amount);
      res.json({ newBalance: result.balance });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Admin: reset a user's monthly tokens
  app.post("/api/admin/users/:id/tokens/reset", requireAuth, requireAdmin, async (req, res) => {
    try {
      await (storage as any).resetTokens(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Admin: get enriched user list including token balances
  app.get("/api/admin/users/:id/tokens", requireAuth, requireAdmin, async (req, res) => {
    try {
      const data = await (storage as any).getTokenBalance(Number(req.params.id));
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });
}
