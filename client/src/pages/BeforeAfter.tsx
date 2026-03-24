import { useState, useRef, useCallback, useEffect } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Upload, Sparkles, Download, Save, ArrowLeft, Layers,
  X, RefreshCw, Copy, Check, ArrowLeftRight, ChevronDown, Trash2,
  ImagePlus, Eye
} from "lucide-react";
import { CONTENT_TONES } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Layout = "side-by-side" | "stacked" | "split-diagonal";
type Step = "upload" | "compose" | "caption" | "save";

const LAYOUTS: { id: Layout; label: string; icon: string }[] = [
  { id: "side-by-side", label: "Side by Side", icon: "⬛⬛" },
  { id: "stacked", label: "Stacked", icon: "⬛\n⬛" },
  { id: "split-diagonal", label: "Diagonal Split", icon: "◧" },
];

const TREATMENTS = [
  "Teeth Whitening", "Invisalign / Clear Aligners", "Veneers", "Smile Makeover",
  "Botox / Neurotoxin", "Dermal Fillers", "Lip Augmentation", "Skin Resurfacing",
  "Laser Hair Removal", "Chemical Peel", "Microneedling", "Body Contouring",
  "Rhinoplasty", "Blepharoplasty", "Facelift",
];

// ─── Canvas compositor ────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderComposite(
  canvas: HTMLCanvasElement,
  beforeSrc: string,
  afterSrc: string,
  layout: Layout,
  practice: any,
): Promise<string> {
  const W = 1080;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const color1 = practice?.brandColor1 || "#7B2FBE";
  const color2 = practice?.brandColor2 || "#C77DFF";
  const logoSrc = practice?.logoDataUrl || null;

  const [beforeImg, afterImg] = await Promise.all([loadImage(beforeSrc), loadImage(afterSrc)]);
  const logoImg = logoSrc ? await loadImage(logoSrc).catch(() => null) : null;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = "#0d0d0f";
  ctx.fillRect(0, 0, W, H);

  // Subtle gradient overlay
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, color1 + "18");
  bgGrad.addColorStop(1, color2 + "10");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Header band ─────────────────────────────────────────────────────────────
  const HEADER_H = 90;
  const headerGrad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  headerGrad.addColorStop(0, color1);
  headerGrad.addColorStop(1, color2);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, W, HEADER_H);

  // Logo in header
  if (logoImg) {
    const logoH = 52;
    const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
    const logoW = Math.min(logoH * logoAspect, 260);
    const logoX = W / 2 - logoW / 2;
    const logoY = (HEADER_H - logoH) / 2;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
  } else if (practice?.name) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(practice.name, W / 2, HEADER_H / 2);
  }

  // ── Footer band ─────────────────────────────────────────────────────────────
  const FOOTER_H = 72;
  const footerGrad = ctx.createLinearGradient(0, H - FOOTER_H, W, H);
  footerGrad.addColorStop(0, color1 + "CC");
  footerGrad.addColorStop(1, color2 + "CC");
  ctx.fillStyle = footerGrad;
  ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);

  // Footer text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "3px";
  ctx.fillText("TRANSFORMATION RESULTS", W / 2, H - FOOTER_H / 2);
  ctx.letterSpacing = "0px";

  // ── Image area ──────────────────────────────────────────────────────────────
  const IMG_TOP = HEADER_H + 12;
  const IMG_BOT = H - FOOTER_H - 12;
  const IMG_H = IMG_BOT - IMG_TOP;
  const LABEL_H = 44;
  const GAP = 10;

  function drawImageCover(
    img: HTMLImageElement,
    dx: number, dy: number, dw: number, dh: number,
    radius = 12,
  ) {
    // Clip to rounded rect
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dx + radius, dy);
    ctx.lineTo(dx + dw - radius, dy);
    ctx.quadraticCurveTo(dx + dw, dy, dx + dw, dy + radius);
    ctx.lineTo(dx + dw, dy + dh - radius);
    ctx.quadraticCurveTo(dx + dw, dy + dh, dx + dw - radius, dy + dh);
    ctx.lineTo(dx + radius, dy + dh);
    ctx.quadraticCurveTo(dx, dy + dh, dx, dy + dh - radius);
    ctx.lineTo(dx, dy + radius);
    ctx.quadraticCurveTo(dx, dy, dx + radius, dy);
    ctx.closePath();
    ctx.clip();

    // Cover fit
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const boxAspect = dw / dh;
    let sx, sy, sw, sh;
    if (imgAspect > boxAspect) {
      sh = img.naturalHeight;
      sw = sh * boxAspect;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      sw = img.naturalWidth;
      sh = sw / boxAspect;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawLabel(text: string, x: number, y: number, w: number, h: number, isAfter: boolean) {
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    if (isAfter) {
      grad.addColorStop(0, color1 + "EE");
      grad.addColorStop(1, color2 + "EE");
    } else {
      grad.addColorStop(0, "#1a1a2e" + "DD");
      grad.addColorStop(1, "#2d2d44" + "DD");
    }
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "4px";
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.letterSpacing = "0px";
  }

  if (layout === "side-by-side") {
    const halfW = (W - GAP * 3) / 2;
    const imgH = IMG_H - LABEL_H - 8;

    // Before
    drawImageCover(beforeImg, GAP, IMG_TOP, halfW, imgH);
    drawLabel("BEFORE", GAP, IMG_TOP + imgH + 8, halfW, LABEL_H, false);

    // After
    drawImageCover(afterImg, GAP * 2 + halfW, IMG_TOP, halfW, imgH);
    drawLabel("AFTER", GAP * 2 + halfW, IMG_TOP + imgH + 8, halfW, LABEL_H, true);

  } else if (layout === "stacked") {
    const stackH = (IMG_H - GAP - LABEL_H * 2 - 16) / 2;

    // Before (top)
    drawImageCover(beforeImg, GAP, IMG_TOP, W - GAP * 2, stackH);
    drawLabel("BEFORE", GAP, IMG_TOP + stackH + 4, W - GAP * 2, LABEL_H, false);

    // After (bottom)
    const afterY = IMG_TOP + stackH + LABEL_H + 8 + GAP;
    drawImageCover(afterImg, GAP, afterY, W - GAP * 2, stackH);
    drawLabel("AFTER", GAP, afterY + stackH + 4, W - GAP * 2, LABEL_H, true);

  } else if (layout === "split-diagonal") {
    // Left triangle = before, right triangle = after with diagonal split
    const midX = W / 2;
    const slantW = 40; // diagonal overlap zone

    // Before — clip left side with diagonal
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, IMG_TOP);
    ctx.lineTo(midX + slantW / 2, IMG_TOP);
    ctx.lineTo(midX - slantW / 2, IMG_BOT);
    ctx.lineTo(0, IMG_BOT);
    ctx.closePath();
    ctx.clip();
    drawImageCover(beforeImg, 0, IMG_TOP, W, IMG_H);
    ctx.restore();

    // After — clip right side with diagonal
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(midX + slantW / 2, IMG_TOP);
    ctx.lineTo(W, IMG_TOP);
    ctx.lineTo(W, IMG_BOT);
    ctx.lineTo(midX - slantW / 2, IMG_BOT);
    ctx.closePath();
    ctx.clip();
    drawImageCover(afterImg, 0, IMG_TOP, W, IMG_H);
    ctx.restore();

    // Diagonal divider line
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(midX + slantW / 2, IMG_TOP);
    ctx.lineTo(midX - slantW / 2, IMG_BOT);
    ctx.stroke();
    ctx.restore();

    // Labels
    drawLabel("BEFORE", 20, IMG_BOT - LABEL_H - 12, 220, LABEL_H, false);
    drawLabel("AFTER", W - 240, IMG_BOT - LABEL_H - 12, 220, LABEL_H, true);
  }

  // ── Accent stripe ───────────────────────────────────────────────────────────
  ctx.fillStyle = color1;
  ctx.fillRect(0, HEADER_H, 5, H - HEADER_H - FOOTER_H);

  return canvas.toDataURL("image/jpeg", 0.92);
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  label, sublabel, value, onChange, testId,
}: {
  label: "BEFORE" | "AFTER";
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isAfter = label === "AFTER";

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed overflow-hidden transition-all cursor-pointer group",
        value
          ? isAfter ? "border-primary/60 bg-primary/5" : "border-white/20 bg-white/5"
          : "border-border/50 bg-white/[0.02] hover:border-primary/40"
      )}
      style={{ aspectRatio: "1/1" }}
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onDragOver={(e) => e.preventDefault()}
      data-testid={testId}
    >
      {value ? (
        <>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          {/* Label badge */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 py-2.5 text-center",
            isAfter
              ? "bg-gradient-to-r from-primary to-violet-400"
              : "bg-black/70 backdrop-blur-sm"
          )}>
            <span className="text-white text-sm font-bold tracking-[3px]">{label}</span>
          </div>
          {/* Replace button */}
          <button
            type="button"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
          >
            <X size={12} className="text-white" />
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl border border-dashed flex items-center justify-center transition-colors",
            isAfter ? "border-primary/40 bg-primary/5 group-hover:border-primary" : "border-border/50 bg-white/5 group-hover:border-white/30"
          )}>
            <ImagePlus size={22} className={cn(isAfter ? "text-primary/70" : "text-muted-foreground")} />
          </div>
          <div className="text-center">
            <p className={cn("text-sm font-bold tracking-[2px]", isAfter ? "text-primary" : "text-white/70")}>{label}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ─── Chip helper ──────────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
        selected
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
      )}
    >
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BeforeAfter() {
  const [, navigate] = useHashLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [beforeImg, setBeforeImg] = useState("");
  const [afterImg, setAfterImg] = useState("");
  const [layout, setLayout] = useState<Layout>("side-by-side");
  const [treatment, setTreatment] = useState("");
  const [customTreatment, setCustomTreatment] = useState("");
  const [tone, setTone] = useState("Professional");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [compositeDataUrl, setCompositeDataUrl] = useState("");
  const [compositing, setCompositing] = useState(false);
  const [copied, setCopied] = useState<"caption" | "hashtags" | null>(null);
  const [activeStep, setActiveStep] = useState<Step>("upload");

  // Queries
  const { data: practice } = useQuery({ queryKey: ["/api/practice"] });
  const { data: baItems } = useQuery({ queryKey: ["/api/before-after"] });

  const effectiveTreatment = customTreatment || treatment;

  // Recomposite whenever inputs change
  useEffect(() => {
    if (!beforeImg || !afterImg || !canvasRef.current) return;
    let active = true;
    setCompositing(true);
    renderComposite(canvasRef.current, beforeImg, afterImg, layout, practice)
      .then((url) => { if (active) { setCompositeDataUrl(url); setCompositing(false); } })
      .catch(() => { if (active) setCompositing(false); });
    return () => { active = false; };
  }, [beforeImg, afterImg, layout, practice]);

  // AI caption mutation
  const captionMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/ai/before-after", {
        treatment: effectiveTreatment,
        tone,
        specialty: (practice as any)?.specialty,
      }),
    onSuccess: (data: any) => {
      setCaption(data.caption);
      setHashtags(data.hashtags);
      setActiveStep("caption");
      toast({ title: "Caption generated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/before-after", {
        title: `${effectiveTreatment} Before & After`,
        treatment: effectiveTreatment,
        tone,
        layout,
        beforeImageDataUrl: beforeImg,
        afterImageDataUrl: afterImg,
        compositeDataUrl,
        caption,
        hashtags,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/before-after"] });
      toast({ title: "Saved to library" });
      setActiveStep("save");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function downloadComposite() {
    if (!compositeDataUrl) return;
    const a = document.createElement("a");
    a.href = compositeDataUrl;
    a.download = `${effectiveTreatment.replace(/\s+/g, "-")}-before-after.jpg`;
    a.click();
  }

  async function copyText(type: "caption" | "hashtags") {
    const text = type === "caption" ? caption : hashtags;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  const canCompose = !!beforeImg && !!afterImg;
  const canGenerate = canCompose && !!effectiveTreatment;
  const canSave = canGenerate && !!caption && !!compositeDataUrl;

  const STEPS = [
    { id: "upload", label: "Upload Photos", done: canCompose },
    { id: "compose", label: "Layout & Treatment", done: canGenerate },
    { id: "caption", label: "Generate Caption", done: !!caption },
    { id: "save", label: "Download & Save", done: false },
  ] as const;

  return (
    <AppShell>
      {/* Hidden canvas for compositing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Visual Creator</p>
            <h1 className="text-xl font-semibold">Before & After</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your photos — we'll compose a branded layout and write the post.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {(baItems as any[])?.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/app/library")}>
                <Eye size={13} /> View saved ({(baItems as any[]).length})
              </Button>
            )}
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                activeStep === s.id ? "text-foreground" : s.done ? "text-primary" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  activeStep === s.id ? "border-primary bg-primary/10 text-primary" :
                  s.done ? "border-primary bg-primary text-primary-foreground" :
                  "border-border/50 text-muted-foreground"
                )}>
                  {s.done ? <Check size={10} /> : i + 1}
                </div>
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-px", s.done ? "bg-primary/40" : "bg-border/40")} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">

          {/* LEFT — Canvas preview */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 overflow-hidden bg-[#0d0d0f]">
              {compositeDataUrl ? (
                <div className="relative group">
                  <img
                    src={compositeDataUrl}
                    alt="Composite preview"
                    className="w-full block"
                    style={{ aspectRatio: "1/1", objectFit: "cover" }}
                  />
                  {compositing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" className="gap-1.5 text-xs h-8" onClick={downloadComposite}>
                      <Download size={12} /> Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="w-full flex flex-col items-center justify-center gap-4 bg-white/[0.02]"
                  style={{ aspectRatio: "1/1" }}
                >
                  {compositing ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Compositing...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl border border-dashed border-border/40 flex items-center justify-center">
                        <Layers size={24} className="text-muted-foreground/40" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Preview will appear here</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Upload both photos to see the composite</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Layout picker — only show when we have images */}
            {canCompose && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Layout</p>
                <div className="flex gap-2">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLayout(l.id)}
                      className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all",
                        layout === l.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-white/[0.02] text-muted-foreground hover:text-foreground hover:border-primary/30"
                      )}
                      data-testid={`layout-${l.id}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Controls panel */}
          <div className="space-y-5">

            {/* Step 1 — Upload photos */}
            <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">1</div>
                <p className="text-sm font-semibold">Upload Photos</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <UploadZone
                  label="BEFORE"
                  sublabel="Drop or click to upload"
                  value={beforeImg}
                  onChange={setBeforeImg}
                  testId="upload-before"
                />
                <UploadZone
                  label="AFTER"
                  sublabel="Drop or click to upload"
                  value={afterImg}
                  onChange={setAfterImg}
                  testId="upload-after"
                />
              </div>
              {canCompose && (
                <p className="text-[11px] text-primary flex items-center gap-1.5 mt-3">
                  <Check size={11} /> Both photos uploaded — preview updated
                </p>
              )}
            </div>

            {/* Step 2 — Treatment & Tone */}
            <div className={cn(
              "rounded-2xl border bg-card/30 p-5 transition-opacity",
              !canCompose && "opacity-50 pointer-events-none"
            )} style={{ borderColor: canCompose ? "hsl(var(--border) / 0.5)" : "hsl(var(--border) / 0.3)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold",
                  canCompose ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-border/30 text-muted-foreground"
                )}>2</div>
                <p className="text-sm font-semibold">Treatment & Tone</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
                    Treatment
                  </Label>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {TREATMENTS.map((t) => (
                      <Chip
                        key={t}
                        label={t}
                        selected={treatment === t && !customTreatment}
                        onClick={() => { setTreatment(t); setCustomTreatment(""); }}
                      />
                    ))}
                  </div>
                  <Input
                    placeholder="Or type a custom treatment..."
                    value={customTreatment}
                    onChange={(e) => { setCustomTreatment(e.target.value); setTreatment(""); }}
                    className="text-sm"
                    data-testid="input-custom-treatment"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
                    Caption Tone
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTENT_TONES.map((t) => (
                      <Chip key={t} label={t} selected={tone === t} onClick={() => setTone(t)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 — Generate caption */}
            <div className={cn(
              "rounded-2xl border bg-card/30 p-5 transition-opacity",
              !canGenerate && "opacity-50 pointer-events-none"
            )} style={{ borderColor: canGenerate ? "hsl(var(--border) / 0.5)" : "hsl(var(--border) / 0.3)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold",
                  canGenerate ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-border/30 text-muted-foreground"
                )}>3</div>
                <p className="text-sm font-semibold">Caption & Hashtags</p>
              </div>

              {caption ? (
                <div className="space-y-3">
                  {/* Caption */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Caption</Label>
                      <button
                        type="button"
                        onClick={() => copyText("caption")}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied === "caption" ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                        {copied === "caption" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={5}
                      className="text-xs resize-none"
                      data-testid="textarea-caption"
                    />
                  </div>

                  {/* Hashtags */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Hashtags</Label>
                      <button
                        type="button"
                        onClick={() => copyText("hashtags")}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied === "hashtags" ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                        {copied === "hashtags" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-white/[0.03] border border-border/30 min-h-[56px]">
                      {hashtags.split(",").map((h) => h.trim()).filter(Boolean).map((tag, i) => (
                        <span key={i} className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Regenerate */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5 text-xs border border-border/40 hover:border-primary/30"
                    onClick={() => captionMutation.mutate()}
                    disabled={captionMutation.isPending}
                    data-testid="btn-regenerate"
                  >
                    {captionMutation.isPending ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : <RefreshCw size={11} />}
                    Regenerate Caption
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full gap-2 h-11"
                  disabled={!canGenerate || captionMutation.isPending}
                  onClick={() => captionMutation.mutate()}
                  data-testid="btn-generate-caption"
                >
                  {captionMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Writing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Generate Caption with AI
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Step 4 — Save / Download */}
            <div className={cn(
              "rounded-2xl border bg-card/30 p-5 transition-opacity",
              !canSave && "opacity-50 pointer-events-none"
            )} style={{ borderColor: canSave ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.3)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold",
                  canSave ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-border/30 text-muted-foreground"
                )}>4</div>
                <p className="text-sm font-semibold">Download & Save</p>
              </div>

              <div className="space-y-2.5">
                <Button
                  className="w-full gap-2 h-11 glow-primary"
                  disabled={!canSave}
                  onClick={downloadComposite}
                  data-testid="btn-download"
                >
                  <Download size={15} />
                  Download Composite Image
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 h-10"
                  disabled={!canSave || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                  data-testid="btn-save"
                >
                  {saveMutation.isPending ? (
                    <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : <Save size={13} />}
                  {saveMutation.isPending ? "Saving..." : "Save to Library"}
                </Button>
              </div>

              {activeStep === "save" && (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                    <Check size={12} /> Saved! Find it in your Content Library.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </AppShell>
  );
}
