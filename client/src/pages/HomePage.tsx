import { useHashLocation } from "wouter/use-hash-location";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import {
  Sparkles, ArrowRight, Check, Instagram, Zap,
  Calendar, FolderOpen, Image, Sun, Moon, Menu, X,
  Star, ChevronRight, Play, Upload, Palette, Type, Globe
} from "lucide-react";
import { useState } from "react";
import PerplexityAttribution from "@/components/PerplexityAttribution";
import straightsetLogo from "@assets/straightset-logo.png";
import straightsetIcon from "@assets/straightset-icon.png";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Content Generation",
    desc: "Describe your goal and tone — AI writes the caption, selects the hashtags, and crafts the perfect image prompt. Done in under 10 seconds.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Image,
    title: "Image Prompt Studio",
    desc: "Every post comes with a detailed, AI-written image prompt ready to paste into DALL·E, Midjourney, or any image generator.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: FolderOpen,
    title: "Campaign Organizer",
    desc: "Group posts into named campaigns — Teeth Whitening March, Summer Glow Promo — and manage all assets in one place.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Calendar,
    title: "Content Calendar",
    desc: "Assign dates to each piece of content and visualize your posting schedule on a clean monthly calendar view.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: Zap,
    title: "Improve with AI",
    desc: "Not happy with the first draft? Hit 'Improve with AI' and get an instantly refined version — no prompt engineering needed.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    icon: Instagram,
    title: "Multi-Platform Ready",
    desc: "Generate Instagram posts, Facebook posts, and TikTok/Reel scripts — each format optimized for the platform.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
];

const SPECIALTIES = [
  "Orthodontists", "Dentists", "Dermatologists",
  "Med Spas", "Plastic Surgeons", "Cosmetic Clinics", "Aesthetic Practices",
];

const EXAMPLE_POSTS = [
  {
    type: "Instagram Post",
    specialty: "Orthodontist",
    goal: "Promote Invisalign",
    tone: "Friendly",
    caption: "Your smile journey starts here. Invisalign clear aligners are virtually invisible, removable, and more comfortable than traditional braces — so you can keep living life while transforming your smile. Book a free consultation today and see what's possible.",
    hashtags: ["#Invisalign", "#ClearAligners", "#SmileTransformation", "#OrthodonticCare", "#NewSmile"],
    imagePrompt: "Bright, modern orthodontic office. Young professional smiling confidently, holding clear aligners. Soft natural light, clean white background. Editorial photography style.",
    dot: "bg-pink-400",
  },
  {
    type: "Facebook Post",
    specialty: "Med Spa",
    goal: "Promote Botox",
    tone: "Luxury",
    caption: "Reclaim your radiance. Our expert injectors deliver natural-looking Botox results that refresh — never freeze. In just 15 minutes, turn back the clock and walk out looking like the best version of yourself. Limited appointments available this month.",
    hashtags: ["#Botox", "#MedSpa", "#AntiAging", "#LuxurySkincare", "#NaturalResults"],
    imagePrompt: "Elegant med spa treatment room. Close-up of a woman with flawless, glowing skin. Warm, golden lighting. High-end beauty editorial photography. Soft bokeh background.",
    dot: "bg-blue-400",
  },
  {
    type: "TikTok Script",
    specialty: "Dermatologist",
    goal: "Educate Patients",
    tone: "Fun",
    caption: "POV: You finally figured out your skincare routine [HOOK]\n\nScene 1: Show a cluttered bathroom counter with 12 products\nScene 2: Dermatologist holds up 3 essentials — cleanser, SPF, retinol\nScene 3: Cut to glowing skin 6 weeks later\n\nCaption: 3 products. That's it. Your board-certified derm approved.",
    hashtags: ["#DermTok", "#SkincareRoutine", "#DermatologistApproved", "#SkinTips", "#Glow"],
    imagePrompt: "Clean, bright dermatology office. Friendly doctor in white coat holding three skincare products. Fun, colorful composition. Shot for TikTok vertical format.",
    dot: "bg-violet-400",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    desc: "Perfect for a single practice getting started with AI content.",
    features: [
      "50 AI-generated posts/month",
      "Instagram, Facebook, TikTok",
      "Content Library",
      "Basic Calendar",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$79",
    period: "/month",
    desc: "For practices that post consistently and want more power.",
    features: [
      "Unlimited AI-generated posts",
      "All content types + formats",
      "Campaign Organizer",
      "Content Calendar",
      "Improve with AI (unlimited)",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Pro",
    price: "$149",
    period: "/month",
    desc: "For multi-provider practices and marketing teams.",
    features: [
      "Everything in Growth",
      "3 practice profiles",
      "Real image generation (coming soon)",
      "Social media scheduling (coming soon)",
      "Analytics dashboard (coming soon)",
      "Dedicated support",
    ],
    cta: "Contact us",
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "We used to spend hours writing Instagram captions. Now our front desk generates a month of content in an afternoon. Honestly game-changing.",
    name: "Dr. Sarah Kim",
    role: "Orthodontist, Los Angeles",
    initials: "SK",
  },
  {
    quote: "The image prompts are what sold me. I paste them straight into Midjourney and the visuals are exactly on-brand for our med spa. Nothing else does this.",
    name: "Marcus Chen",
    role: "Marketing Director, Glow Med Spa",
    initials: "MC",
  },
  {
    quote: "As a solo dermatologist, I have zero time for marketing. HealthContent lets me create a week of content on Sunday night in 20 minutes.",
    name: "Dr. Priya Patel",
    role: "Dermatologist, Chicago",
    initials: "PP",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [, navigate] = useHashLocation();
  const { theme, toggle } = useTheme();
  const { login } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeExample, setActiveExample] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);

  const enterDemo = async () => {
    setDemoLoading(true);
    try {
      await login("demo@healthcontent.ai", "Demo1234!");
      navigate("/app");
    } catch (e) {
      alert("Demo login failed — please try again");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L13 5V11L8 14L3 11V5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="8" cy="8" r="2" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-sm">HealthContent</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {["Features", "Brand", "Examples", "Pricing"].map((item) => (
              <a
                key={item}
                href={item === "Brand" ? "#brand-setup" : `#${item.toLowerCase()}`}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-white/[0.04]"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm h-8"
              onClick={() => navigate("/app")}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              className="text-sm h-8 gap-1.5"
              onClick={() => navigate("/app")}
            >
              Get started free
              <ArrowRight size={13} />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 space-y-1">
            {["Features", "Brand", "Examples", "Pricing"].map((item) => (
              <a
                key={item}
                href={item === "Brand" ? "#brand-setup" : `#${item.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md"
              >
                {item}
              </a>
            ))}
            <div className="pt-3 space-y-2">
              <Button variant="outline" className="w-full" onClick={() => navigate("/app")}>Sign in</Button>
              <Button className="w-full" onClick={() => navigate("/app")}>Get started free</Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid opacity-[0.25]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-[10%] w-[300px] h-[300px] bg-blue-500/6 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-20 right-[10%] w-[300px] h-[300px] bg-violet-500/6 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Stage 1 MVP — Now Live</span>
          </div>

          <h1 className="font-serif text-[clamp(2.2rem,5vw,4rem)] leading-[1.1] tracking-tight mb-6">
            AI social media content<br />
            <span className="gradient-text">for healthcare practices.</span>
          </h1>

          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate on-brand Instagram posts, Facebook posts, and TikTok scripts — complete with captions, hashtags, and image prompts — in seconds. Built specifically for orthodontists, dentists, dermatologists, med spas, and more.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Button
              size="lg"
              className="h-11 px-6 gap-2 text-sm font-medium w-full sm:w-auto"
              onClick={() => navigate("/app")}
            >
              <Sparkles size={15} />
              Start for free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-6 gap-2 text-sm w-full sm:w-auto border-border/60 hover:bg-white/[0.04]"
              onClick={() => document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play size={13} />
              See examples
            </Button>
          </div>

          {/* Demo shortcut — one click straight into the dashboard */}
          <div className="mb-10">
            <button
              onClick={enterDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-60"
            >
              {demoLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play size={12} fill="currentColor" />
              )}
              {demoLoading ? "Signing in..." : "Try the live demo — no sign up needed"}
            </button>
          </div>

          {/* Specialty pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {SPECIALTIES.map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full text-xs font-medium bg-card border border-border text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Features</p>
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-tight mb-4">
              Everything your practice needs
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              One platform to create, organize, and plan all your social media content — powered by AI trained on healthcare marketing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="p-5 rounded-xl border border-border bg-card hover:border-border/60 hover:bg-white/[0.02] transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-4`}>
                  <Icon size={16} className={color} />
                </div>
                <h3 className="text-sm font-semibold mb-2">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brand Setup Demo ── */}
      <section id="brand-setup" className="py-24 px-6 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Your Practice Identity</p>
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-tight mb-4">
              The AI learns your brand.
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Upload your logo, set your colors, and describe your voice. Every piece of content generated will look and sound exactly like your practice.
            </p>
          </div>

          {/* Split layout: input steps left, live preview right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-5xl mx-auto">

            {/* Left — Setup Steps */}
            <div className="space-y-3">
              {/* Step 1 – Logo & Icon */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Upload size={13} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Logo &amp; Icon</p>
                    <p className="text-xs text-muted-foreground">Upload your practice wordmark and app icon</p>
                  </div>
                  <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Check size={10} className="text-emerald-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Logo upload area */}
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 flex flex-col items-center justify-center gap-2 min-h-[80px]">
                    <img src={straightsetLogo} alt="Straight Set Orthodontics logo" className="max-h-10 w-auto object-contain" />
                    <p className="text-[10px] text-muted-foreground">Practice Logo</p>
                  </div>
                  {/* Icon upload area */}
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 flex flex-col items-center justify-center gap-2 min-h-[80px]">
                    <img src={straightsetIcon} alt="Straight Set icon" className="max-h-10 w-auto object-contain" />
                    <p className="text-[10px] text-muted-foreground">Practice Icon</p>
                  </div>
                </div>
              </div>

              {/* Step 2 – Brand Colors */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Palette size={13} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Brand Colors</p>
                    <p className="text-xs text-muted-foreground">Primary, secondary, and accent</p>
                  </div>
                  <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Check size={10} className="text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Primary */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-lg border-2 border-white/10 shadow-md" style={{ backgroundColor: "#FDD900" }} />
                    <p className="text-[10px] text-muted-foreground font-mono">#FDD900</p>
                    <p className="text-[10px] text-muted-foreground">Primary</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-lg border-2 border-white/10 shadow-md" style={{ backgroundColor: "#727272" }} />
                    <p className="text-[10px] text-muted-foreground font-mono">#727272</p>
                    <p className="text-[10px] text-muted-foreground">Secondary</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-lg border-2 border-white/10 shadow-md bg-white" />
                    <p className="text-[10px] text-muted-foreground font-mono">#FFFFFF</p>
                    <p className="text-[10px] text-muted-foreground">Accent</p>
                  </div>
                  <div className="ml-auto">
                    {/* Color swatch bar */}
                    <div className="flex h-8 w-24 rounded-lg overflow-hidden shadow-md border border-white/10">
                      <div className="flex-1" style={{ backgroundColor: "#FDD900" }} />
                      <div className="flex-1" style={{ backgroundColor: "#727272" }} />
                      <div className="flex-1 bg-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 – Practice Details */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe size={13} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Practice Details</p>
                    <p className="text-xs text-muted-foreground">Name, specialty, website, and voice</p>
                  </div>
                  <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Check size={10} className="text-emerald-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/50">
                    <Type size={11} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-foreground">Straight Set Orthodontics</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">Practice Name</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/50">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Orthodontist</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">Specialty</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/50">
                    <Globe size={11} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">straightsetortho.com</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">Website</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Live Brand Preview */}
            <div className="rounded-xl border border-border overflow-hidden shadow-xl">
              {/* Mock app header with practice branding */}
              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2" style={{ backgroundColor: "#111113" }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                    healthcontent.app/dashboard
                  </div>
                </div>
              </div>

              {/* Mock sidebar + content */}
              <div className="flex" style={{ backgroundColor: "#0d0d0f", minHeight: "420px" }}>
                {/* Sidebar */}
                <div className="w-[140px] flex-shrink-0 border-r border-white/5 flex flex-col p-3" style={{ backgroundColor: "#0a0a0c" }}>
                  {/* Practice branding in sidebar */}
                  <div className="flex items-center gap-2 mb-5 px-1">
                    <img src={straightsetIcon} alt="icon" className="w-6 h-6 object-contain" />
                    <span className="text-[10px] font-semibold text-white leading-tight">Straight Set</span>
                  </div>
                  {/* Nav items */}
                  {["Dashboard", "Create", "Before & After", "Library", "Campaigns", "Calendar"].map((item, i) => (
                    <div
                      key={item}
                      className={`px-2 py-1.5 rounded-md text-[10px] mb-0.5 ${
                        i === 1
                          ? "font-semibold"
                          : "text-white/40"
                      }`}
                      style={i === 1 ? { backgroundColor: "#FDD90020", color: "#FDD900" } : {}}
                    >
                      {item}
                    </div>
                  ))}
                  {/* Practice name at bottom */}
                  <div className="mt-auto pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: "#FDD900", color: "#111" }}>SS</div>
                      <span className="text-[9px] text-white/50 leading-tight">Straight Set<br />Orthodontics</span>
                    </div>
                  </div>
                </div>

                {/* Main content area */}
                <div className="flex-1 p-4 overflow-hidden">
                  {/* Page header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Orthodontist · Austin, TX</p>
                      <p className="text-xs font-semibold text-white">Straight Set Orthodontics</p>
                    </div>
                    <img src={straightsetLogo} alt="logo" className="h-5 object-contain" />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[["12", "Posts"], ["3", "Campaigns"], ["8", "Scheduled"], ["5", "B&As"]].map(([val, label]) => (
                      <div key={label} className="rounded-lg p-2 border border-white/5" style={{ backgroundColor: "#151518" }}>
                        <p className="text-sm font-bold text-white">{val}</p>
                        <p className="text-[9px] text-white/40">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Generated post preview */}
                  <div className="rounded-lg border border-white/8 p-3 mb-3" style={{ backgroundColor: "#151518" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FDD900" }} />
                      <p className="text-[9px] text-white/50">Instagram Post · Promote Invisalign · Friendly</p>
                    </div>
                    <p className="text-[10px] text-white/80 leading-relaxed line-clamp-3">
                      Your perfect smile is closer than you think. ✨ Straight Set clear aligners fit your life — removable, invisible, comfortable. Book your free consult today!
                    </p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {["#Invisalign", "#StraightSet", "#SmileGoals"].map(t => (
                        <span key={t} className="text-[9px] font-medium" style={{ color: "#FDD900" }}>{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Generate button styled with brand color */}
                  <div
                    className="w-full rounded-lg py-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold"
                    style={{ backgroundColor: "#FDD900", color: "#111" }}
                  >
                    <Sparkles size={10} />
                    Generate with AI
                  </div>
                </div>
              </div>

              {/* Preview label */}
              <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between" style={{ backgroundColor: "#0a0a0c" }}>
                <span className="text-[10px] text-white/30">Live brand preview</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400/70">Brand applied</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom callout */}
          <p className="text-center text-xs text-muted-foreground mt-10">
            The above shows how <span className="text-foreground font-medium">Straight Set Orthodontics</span> would look inside the app — your logo, your colors, your brand on every piece of content.
          </p>
        </div>
      </section>

      {/* ── Examples ── */}
      <section id="examples" className="py-24 px-6 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Examples</p>
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-tight mb-4">
              Real content, generated instantly
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Here's what HealthContent produces. Each example was generated in under 10 seconds.
            </p>
          </div>

          {/* Tab selector */}
          <div className="flex justify-center gap-2 mb-8">
            {EXAMPLE_POSTS.map((post, i) => (
              <button
                key={i}
                onClick={() => setActiveExample(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                  activeExample === i
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/60"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${post.dot}`} />
                {post.type}
              </button>
            ))}
          </div>

          {/* Example card */}
          {(() => {
            const post = EXAMPLE_POSTS[activeExample];
            return (
              <div className="max-w-3xl mx-auto rounded-xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${post.dot}`} />
                  <span className="text-xs font-medium text-muted-foreground">{post.type}</span>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground">{post.specialty}</span>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground">{post.goal}</span>
                  <div className="ml-auto px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary border border-primary/20">
                    {post.tone}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Caption */}
                  <div className="p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Caption</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{post.caption}</p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {post.hashtags.map((h) => (
                        <span key={h} className="text-xs text-primary/80 font-medium">{h}</span>
                      ))}
                    </div>
                  </div>

                  {/* Image prompt */}
                  <div className="p-5 bg-muted/20">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Image Prompt</p>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">"{post.imagePrompt}"</p>
                    <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-background border border-border text-xs text-muted-foreground">
                      <Image size={11} />
                      Paste into DALL·E or Midjourney
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Pricing</p>
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-tight mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Start free. Upgrade when you're ready. No contracts, cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-sm font-semibold mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? "bg-primary/20" : "bg-muted"
                      }`}>
                        <Check size={10} className={plan.highlighted ? "text-primary" : "text-muted-foreground"} />
                      </div>
                      <span className="text-xs text-muted-foreground leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full h-9 text-sm"
                  onClick={() => navigate("/app")}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Testimonials</p>
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-tight">
              Loved by healthcare practices
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map(({ quote, name, role, initials }) => (
              <div key={name} className="p-5 rounded-xl border border-border bg-card">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-5">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-primary">{initials}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{name}</p>
                    <p className="text-[10px] text-muted-foreground">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-primary/8 rounded-2xl blur-3xl pointer-events-none" />
          <div className="relative rounded-2xl border border-primary/20 bg-card p-12">
            <div className="absolute inset-0 bg-grid opacity-20 rounded-2xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Get started today</p>
              <h2 className="font-serif text-[clamp(1.6rem,3vw,2.6rem)] leading-tight mb-4">
                Your practice deserves<br />better social media.
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                Join healthcare practices using HealthContent to save hours every week and grow their patient base with consistent, professional content.
              </p>
              <Button
                size="lg"
                className="h-11 px-8 gap-2 text-sm font-medium"
                onClick={() => navigate("/app")}
              >
                <Sparkles size={15} />
                Start for free — no credit card
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/80 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L13 5V11L8 14L3 11V5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="8" cy="8" r="2" fill="white"/>
              </svg>
            </div>
            <span className="text-sm font-semibold">HealthContent</span>
            <span className="text-xs text-muted-foreground ml-2">AI Social Media for Healthcare</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <PerplexityAttribution />
          </div>
        </div>
      </footer>
    </div>
  );
}
