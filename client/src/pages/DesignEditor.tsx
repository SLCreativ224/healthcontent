import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Palette, Type, Layout, Sliders, Save, RotateCcw,
  Eye, Sparkles, Heart, Zap
} from "lucide-react";
import type { Practice } from "@shared/schema";
import { BRAND_FEELS } from "@shared/schema";

// ─── Font options ────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { label: "Satoshi (Modern Sans)", value: "Satoshi, sans-serif" },
  { label: "Inter (Clean & Precise)", value: "Inter, sans-serif" },
  { label: "Instrument Serif (Elegant)", value: "'Instrument Serif', serif" },
  { label: "Playfair Display (Luxury)", value: "'Playfair Display', serif" },
  { label: "DM Sans (Friendly)", value: "'DM Sans', sans-serif" },
] as const;

const BUTTON_STYLES = [
  { label: "Rounded (Pill)", value: "rounded-full" },
  { label: "Soft (Medium radius)", value: "rounded-lg" },
  { label: "Sharp (Square)", value: "rounded-none" },
  { label: "Subtle (Small radius)", value: "rounded-sm" },
] as const;

const CARD_STYLES = [
  { label: "Elevated (Shadow)", value: "shadow" },
  { label: "Bordered (Outlined)", value: "border" },
  { label: "Flat (No border)", value: "flat" },
  { label: "Glass (Frosted)", value: "glass" },
] as const;

// ─── Live Preview Card ────────────────────────────────────────────────────────

function LivePreview({
  practiceName,
  brandColor1,
  brandColor2,
  brandColor3,
  font,
  buttonRadius,
  cardStyle,
  brandFeel,
}: {
  practiceName: string;
  brandColor1: string;
  brandColor2: string;
  brandColor3: string;
  font: string;
  buttonRadius: string;
  cardStyle: string;
  brandFeel: string;
}) {
  const cardClass = {
    shadow: "border border-white/10 shadow-lg shadow-black/30",
    border: "border border-white/20",
    flat: "",
    glass: "border border-white/10 backdrop-blur-md bg-white/5",
  }[cardStyle] || "border border-white/10";

  return (
    <div className="space-y-4" style={{ fontFamily: font }}>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Live Preview</p>

      {/* Sample Post Card */}
      <div
        className={`rounded-xl p-5 ${cardClass}`}
        style={{ background: `${brandColor1}12` }}
      >
        {/* Card header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: brandColor1 }}
          >
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: brandColor1 }}>
              {practiceName || "Your Practice"}
            </p>
            <p className="text-xs text-muted-foreground">AI-Generated Content</p>
          </div>
        </div>

        {/* Sample caption */}
        <p className="text-sm text-foreground/90 leading-relaxed mb-4">
          Transform your confidence with our cutting-edge treatments. ✨ Our expert team is
          dedicated to delivering results that speak for themselves.
        </p>

        {/* Color swatches */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="w-5 h-5 rounded-full border border-white/20"
            style={{ background: brandColor1 }}
            title="Primary"
          />
          <span
            className="w-5 h-5 rounded-full border border-white/20"
            style={{ background: brandColor2 }}
            title="Secondary"
          />
          {brandColor3 && (
            <span
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ background: brandColor3 }}
              title="Accent"
            />
          )}
          <span className="text-xs text-muted-foreground ml-1">Brand palette</span>
        </div>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {["#SmileGoals", "#Confidence", "#Transform"].map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${brandColor2}25`, color: brandColor2 }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA button */}
        <button
          className={`px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${buttonRadius}`}
          style={{ background: brandColor1 }}
        >
          Book Consultation
        </button>
      </div>

      {/* Brand feel indicator */}
      {brandFeel && (
        <div
          className="rounded-lg px-4 py-3 flex items-center gap-3"
          style={{ background: `${brandColor2}15`, border: `1px solid ${brandColor2}30` }}
        >
          <Heart size={14} style={{ color: brandColor2 }} />
          <div>
            <p className="text-xs font-medium" style={{ color: brandColor2 }}>Brand Feel</p>
            <p className="text-xs text-muted-foreground">{brandFeel}</p>
          </div>
        </div>
      )}

      {/* Font sample */}
      <div className="rounded-lg border border-border/50 p-4" style={{ fontFamily: font }}>
        <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest" style={{ fontFamily: "inherit" }}>
          Typography
        </p>
        <p className="text-lg font-bold mb-0.5" style={{ color: brandColor1 }}>
          Heading Style
        </p>
        <p className="text-sm text-muted-foreground">
          Body text appears in this typeface, making your content feel consistent and professional.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DesignEditor() {
  const { toast } = useToast();

  const { data: practice, isLoading } = useQuery<Practice | null>({
    queryKey: ["/api/practice"],
  });

  // Local state mirrors practice fields + extra design settings
  const [color1, setColor1] = useState("#6B5CE7");
  const [color2, setColor2] = useState("#9B8AF0");
  const [color3, setColor3] = useState("");
  const [brandFeel, setBrandFeel] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [font, setFont] = useState("Satoshi, sans-serif");
  const [buttonRadius, setButtonRadius] = useState("rounded-lg");
  const [cardStyle, setCardStyle] = useState("border");
  const [isDirty, setIsDirty] = useState(false);

  // Hydrate from practice
  useEffect(() => {
    if (practice) {
      setColor1(practice.brandColor1 ?? "#6B5CE7");
      setColor2(practice.brandColor2 ?? "#9B8AF0");
      setColor3(practice.brandColor3 ?? "");
      setBrandFeel(practice.brandFeel ?? "");
      setBrandVoice(practice.brandVoice ?? "");
      setIsDirty(false);
    }
  }, [practice]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!practice?.id) throw new Error("No practice found");
      return apiRequest("PATCH", "/api/practice", {
        brandColor1: color1,
        brandColor2: color2,
        brandColor3: color3 || null,
        brandFeel,
        brandVoice,
        // font, buttonRadius, cardStyle are UI-only in Stage 1 (no schema field)
        // they reset on page reload — a future DB migration can persist them
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice"] });
      setIsDirty(false);
      toast({ title: "Design saved", description: "Your brand settings have been updated." });
    },
    onError: () => {
      toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" });
    },
  });

  function markDirty() { setIsDirty(true); }

  function handleReset() {
    if (practice) {
      setColor1(practice.brandColor1 ?? "#6B5CE7");
      setColor2(practice.brandColor2 ?? "#9B8AF0");
      setColor3(practice.brandColor3 ?? "");
      setBrandFeel(practice.brandFeel ?? "");
      setBrandVoice(practice.brandVoice ?? "");
    }
    setFont("Satoshi, sans-serif");
    setButtonRadius("rounded-lg");
    setCardStyle("border");
    setIsDirty(false);
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <Palette size={18} className="text-primary" />
              Design Editor
            </h1>
            <p className="text-sm text-muted-foreground">
              Customize your practice's brand appearance — changes apply to all AI-generated content.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                data-testid="btn-reset-design"
                className="gap-1.5"
              >
                <RotateCcw size={13} /> Reset
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !isDirty}
              data-testid="btn-save-design"
              className="gap-1.5"
            >
              <Save size={13} />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {isDirty && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-400">
            <Zap size={14} />
            You have unsaved changes — click Save Changes to apply.
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left — Controls */}
          <div className="space-y-6">
            {/* Colors */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Palette size={14} className="text-primary" /> Brand Colors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Color 1 */}
                <div className="space-y-1.5">
                  <Label>
                    Primary Color <span className="text-red-400 text-xs">*required</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden shrink-0 relative"
                      style={{ background: color1 }}
                    >
                      <input
                        type="color"
                        value={color1}
                        onChange={(e) => { setColor1(e.target.value); markDirty(); }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        data-testid="input-color1"
                      />
                    </div>
                    <Input
                      value={color1}
                      onChange={(e) => { setColor1(e.target.value); markDirty(); }}
                      className="font-mono text-sm max-w-32"
                      maxLength={7}
                      data-testid="input-color1-hex"
                    />
                    <p className="text-xs text-muted-foreground">Used for CTAs, active states, and key highlights</p>
                  </div>
                </div>

                {/* Color 2 */}
                <div className="space-y-1.5">
                  <Label>
                    Secondary Color <span className="text-red-400 text-xs">*required</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden shrink-0 relative"
                      style={{ background: color2 }}
                    >
                      <input
                        type="color"
                        value={color2}
                        onChange={(e) => { setColor2(e.target.value); markDirty(); }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        data-testid="input-color2"
                      />
                    </div>
                    <Input
                      value={color2}
                      onChange={(e) => { setColor2(e.target.value); markDirty(); }}
                      className="font-mono text-sm max-w-32"
                      maxLength={7}
                      data-testid="input-color2-hex"
                    />
                    <p className="text-xs text-muted-foreground">Used for tags, accents, and secondary elements</p>
                  </div>
                </div>

                {/* Color 3 */}
                <div className="space-y-1.5">
                  <Label>
                    Accent Color <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg border border-dashed border-border cursor-pointer overflow-hidden shrink-0 relative"
                      style={{ background: color3 || "#3a3a4a" }}
                    >
                      <input
                        type="color"
                        value={color3 || "#ffffff"}
                        onChange={(e) => { setColor3(e.target.value); markDirty(); }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        data-testid="input-color3"
                      />
                    </div>
                    <Input
                      value={color3}
                      placeholder="#ffffff"
                      onChange={(e) => { setColor3(e.target.value); markDirty(); }}
                      className="font-mono text-sm max-w-32"
                      maxLength={7}
                      data-testid="input-color3-hex"
                    />
                    {color3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setColor3(""); markDirty(); }}
                        className="text-xs text-muted-foreground h-7"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Type size={14} className="text-primary" /> Typography
                  <Badge variant="outline" className="text-[10px] text-muted-foreground ml-1">UI Preview Only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label>Font Family</Label>
                  <Select value={font} onValueChange={(v) => { setFont(v); markDirty(); }}>
                    <SelectTrigger data-testid="select-font">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <span style={{ fontFamily: f.value }}>{f.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Font preference is shown in the live preview and passed to AI for content generation.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Component Styles */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layout size={14} className="text-primary" /> Component Style
                  <Badge variant="outline" className="text-[10px] text-muted-foreground ml-1">UI Preview Only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Button Shape</Label>
                  <Select value={buttonRadius} onValueChange={(v) => { setButtonRadius(v); markDirty(); }}>
                    <SelectTrigger data-testid="select-button-radius">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUTTON_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Card Style</Label>
                  <Select value={cardStyle} onValueChange={(v) => { setCardStyle(v); markDirty(); }}>
                    <SelectTrigger data-testid="select-card-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Brand Voice */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sliders size={14} className="text-primary" /> Brand Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Brand Feel</Label>
                  <Select value={brandFeel} onValueChange={(v) => { setBrandFeel(v); markDirty(); }}>
                    <SelectTrigger data-testid="select-brand-feel">
                      <SelectValue placeholder="Choose a feel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAND_FEELS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Brand Voice</Label>
                  <Input
                    placeholder="e.g. Warm and empowering, results-focused, never salesy"
                    value={brandVoice}
                    onChange={(e) => { setBrandVoice(e.target.value); markDirty(); }}
                    data-testid="input-brand-voice"
                  />
                  <p className="text-xs text-muted-foreground">
                    This description is injected into every AI generation prompt.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right — Live Preview */}
          <div className="lg:sticky lg:top-6 h-fit">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye size={14} className="text-primary" /> Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LivePreview
                  practiceName={practice?.name ?? "Your Practice"}
                  brandColor1={color1}
                  brandColor2={color2}
                  brandColor3={color3}
                  font={font}
                  buttonRadius={buttonRadius}
                  cardStyle={cardStyle}
                  brandFeel={brandFeel}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
