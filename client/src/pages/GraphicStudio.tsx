import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Download, RefreshCw, Check, Sparkles, Layout,
  Wand2, Image as ImageIcon, Loader2, History, Trash2, X,
  Palette, Crown, ChevronRight
} from "lucide-react";
import type { Practice } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

// ─── Canvas Helpers ────────────────────────────────────────────────────────────

const SIZE = 1080;

function drawPhoto(ctx: CanvasRenderingContext2D, photo: HTMLImageElement | null, x: number, y: number, w: number, h: number, placeholder = "Upload your photo") {
  if (!photo) {
    ctx.fillStyle = "#1e1e2e";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = `bold ${Math.round(w * 0.025)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(placeholder, x + w / 2, y + h / 2);
    ctx.textBaseline = "alphabetic";
    return;
  }
  const pa = photo.naturalWidth / photo.naturalHeight;
  const ba = w / h;
  let sx = 0, sy = 0, sw = photo.naturalWidth, sh = photo.naturalHeight;
  if (pa > ba) { sw = sh * ba; sx = (photo.naturalWidth - sw) / 2; }
  else { sh = sw / ba; sy = (photo.naturalHeight - sh) / 2; }
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(photo, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 99, align: CanvasTextAlign = "left"): number {
  ctx.textAlign = align;
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y + lineCount * lineHeight);
      line = words[n] + " ";
      lineCount++;
      if (lineCount >= maxLines - 1) {
        ctx.fillText(line.trim() + (words[n + 1] ? "…" : ""), x, y + lineCount * lineHeight);
        return lineCount + 1;
      }
    } else { line = test; }
  }
  if (line.trim()) { ctx.fillText(line.trim(), x, y + lineCount * lineHeight); lineCount++; }
  return lineCount;
}

function hexToRgb(hex: string) {
  const clean = (hex || "#000000").replace("#", "");
  return { r: parseInt(clean.slice(0, 2), 16) || 0, g: parseInt(clean.slice(2, 4), 16) || 0, b: parseInt(clean.slice(4, 6), 16) || 0 };
}

function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// ─── Templates ────────────────────────────────────────────────────────────────

interface TemplateInput {
  ctx: CanvasRenderingContext2D;
  photo: HTMLImageElement | null;
  aiImage: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  colors: string[];
  practiceName: string;
  headline: string;
  subtext: string;
  useBranding: boolean;
  useLogo: boolean;
}

const NEUTRAL_COLORS = ["#1a1a2e", "#2d2d3d", "#ffffff"];

const TEMPLATES = [
  {
    id: "big-type", name: "Big Type", description: "Huge bold headline with photo — birthday/event style",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext, useBranding, useLogo }: TemplateInput) {
      const c1 = useBranding ? (colors[0] || "#F5C518") : "#F5C518";
      const c2 = useBranding ? (colors[1] || "#1a1a1a") : "#1a1a1a";
      ctx.fillStyle = c2; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = c1;
      ctx.font = `900 ${Math.round(SIZE * 0.2)}px 'Arial Black', Impact, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const words = headline.split(" ");
      words.slice(0, 3).forEach((word, i) => ctx.fillText(word.toUpperCase(), SIZE / 2, 40 + i * Math.round(SIZE * 0.19)));
      ctx.textBaseline = "alphabetic";
      if (photo) drawPhoto(ctx, photo, SIZE * 0.05, SIZE * 0.2, SIZE * 0.65, SIZE - SIZE * 0.2 - 20);
      else drawPhoto(ctx, null, SIZE * 0.05, SIZE * 0.2, SIZE * 0.65, SIZE * 0.75);
      ctx.fillStyle = c1; ctx.font = `bold ${Math.round(SIZE * 0.03)}px 'Arial', sans-serif`;
      ctx.textAlign = "right"; ctx.fillText(subtext || practiceName, SIZE - 40, SIZE - 80);
      ctx.fillStyle = c1; ctx.fillRect(0, SIZE - 8, SIZE, 8);
      if (useLogo && logo) ctx.drawImage(logo, SIZE - 110, SIZE - 200, 80, 80);
    },
  },
  {
    id: "dark-pro", name: "Dark Pro", description: "Dark bg, photo right, bold text left — Braces example style",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext, useBranding, useLogo }: TemplateInput) {
      const c1 = useBranding ? (colors[0] || "#F5C518") : "#F5C518";
      ctx.fillStyle = "#1c1c24"; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.arc(SIZE * 0.15, SIZE * 0.35, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c1; ctx.lineWidth = 5; ctx.lineCap = "round";
      [[SIZE * 0.72, SIZE * 0.12]].forEach(([px, py]) => {
        ctx.beginPath(); ctx.moveTo(px - 14, py); ctx.lineTo(px + 14, py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px, py + 14); ctx.stroke();
      });
      ctx.fillStyle = c1; ctx.fillRect(SIZE * 0.5, SIZE * 0.28, SIZE * 0.5, SIZE * 0.18);
      drawPhoto(ctx, photo, SIZE * 0.44, SIZE * 0.1, SIZE * 0.56, SIZE * 0.9);
      ctx.fillStyle = "#ffffff"; ctx.font = `900 ${Math.round(SIZE * 0.1)}px 'Arial Black', Impact, sans-serif`;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      const hWords = headline.split(" "); let hY = SIZE * 0.22;
      hWords.slice(0, 2).forEach(w => { ctx.fillText(w.toUpperCase(), 52, hY); hY += SIZE * 0.105; });
      if (hWords[2]) { ctx.fillStyle = c1; ctx.fillText(hWords[2].toUpperCase(), 52, hY); hY += SIZE * 0.105; }
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = `${Math.round(SIZE * 0.028)}px 'Arial', sans-serif`;
      wrapText(ctx, subtext || practiceName, 52, hY + 20, SIZE * 0.42, 36, 3);
      ctx.fillStyle = c1; ctx.fillRect(0, SIZE - 80, SIZE, 80);
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff"; ctx.font = `bold ${Math.round(SIZE * 0.03)}px 'Arial', sans-serif`;
      ctx.textAlign = "center"; ctx.fillText(practiceName.toUpperCase(), SIZE / 2, SIZE - 30);
      if (useLogo && logo) ctx.drawImage(logo, SIZE - 100, SIZE - 72, 56, 56);
    },
  },
  {
    id: "split-modern", name: "Split Modern", description: "Half color, half photo with diagonal cut",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext, useBranding, useLogo }: TemplateInput) {
      const c1 = useBranding ? (colors[0] || "#6B5CE7") : "#6B5CE7";
      const c2 = useBranding ? (colors[1] || "#9B8AF0") : "#9B8AF0";
      drawPhoto(ctx, photo, SIZE * 0.42, 0, SIZE * 0.58, SIZE);
      ctx.fillStyle = c1; ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(SIZE * 0.52, 0); ctx.lineTo(SIZE * 0.38, SIZE); ctx.lineTo(0, SIZE);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath();
      ctx.moveTo(SIZE * 0.52, 0); ctx.lineTo(SIZE * 0.57, 0); ctx.lineTo(SIZE * 0.43, SIZE); ctx.lineTo(SIZE * 0.38, SIZE);
      ctx.closePath(); ctx.fill();
      if (useLogo && logo) {
        ctx.save(); ctx.beginPath(); ctx.arc(64, 64, 40, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(logo, 24, 24, 80, 80); ctx.restore();
      }
      const textColor = isLight(c1) ? "#000" : "#fff";
      ctx.fillStyle = textColor; ctx.font = `900 ${Math.round(SIZE * 0.09)}px 'Arial Black', sans-serif`;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      wrapText(ctx, headline.toUpperCase(), 48, SIZE * 0.28, SIZE * 0.42, SIZE * 0.1, 4);
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = isLight(c1) ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)";
      ctx.fillRect(48, SIZE * 0.72, SIZE * 0.32, 3);
      ctx.fillStyle = isLight(c1) ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)";
      ctx.font = `${Math.round(SIZE * 0.026)}px 'Arial', sans-serif`;
      wrapText(ctx, subtext || practiceName, 48, SIZE * 0.77, SIZE * 0.36, 34, 3);
    },
  },
  {
    id: "gradient-hero", name: "Gradient Hero", description: "Full photo with branded gradient — premium feel",
    render({ ctx, photo, aiImage, logo, colors, practiceName, headline, subtext, useBranding, useLogo }: TemplateInput) {
      const c1 = useBranding ? (colors[0] || "#6B5CE7") : "#6B5CE7";
      const c2 = useBranding ? (colors[1] || "#9B8AF0") : "#9B8AF0";
      const { r: r1, g: g1, b: b1 } = hexToRgb(c1);
      const { r: r2, g: g2, b: b2 } = hexToRgb(c2);
      drawPhoto(ctx, aiImage || photo, 0, 0, SIZE, SIZE);
      const grad = ctx.createLinearGradient(0, SIZE * 0.2, 0, SIZE);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.45, `rgba(${r1},${g1},${b1},0.55)`);
      grad.addColorStop(1, `rgba(${r2},${g2},${b2},0.95)`);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, SIZE, SIZE);
      if (useBranding) {
        const topGrad = ctx.createLinearGradient(0, 0, SIZE, 0);
        topGrad.addColorStop(0, c1); topGrad.addColorStop(1, c2);
        ctx.fillStyle = topGrad; ctx.fillRect(0, 0, SIZE, 10);
      }
      if (useLogo && logo) ctx.drawImage(logo, 40, 28, 64, 64);
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = `bold ${Math.round(SIZE * 0.025)}px 'Arial', sans-serif`;
      ctx.textAlign = "left"; ctx.fillText(practiceName, (useLogo && logo) ? 120 : 40, 72);
      ctx.fillStyle = "#ffffff"; ctx.font = `900 ${Math.round(SIZE * 0.1)}px 'Arial Black', Impact, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 20;
      wrapText(ctx, headline, 52, SIZE * 0.68, SIZE - 104, SIZE * 0.1, 3);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = `${Math.round(SIZE * 0.028)}px 'Arial', sans-serif`;
      wrapText(ctx, subtext, 52, SIZE * 0.83, SIZE - 104, 36, 3);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(52, SIZE - 70, 280, 50);
      ctx.fillStyle = c1; ctx.font = `bold ${Math.round(SIZE * 0.025)}px 'Arial', sans-serif`;
      ctx.textAlign = "center"; ctx.fillText("Book Consultation →", 192, SIZE - 38);
    },
  },
  {
    id: "minimal-white", name: "Minimal Frame", description: "Clean white with brand color accents",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext, useBranding, useLogo }: TemplateInput) {
      const c1 = useBranding ? (colors[0] || "#6ECFE0") : "#6ECFE0";
      const c2 = useBranding ? (colors[1] || "#8B5CF6") : "#8B5CF6";
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = c1; ctx.fillRect(SIZE - 80, 0, 80, SIZE);
      ctx.fillStyle = c1; ctx.fillRect(0, 0, SIZE - 80, 10);
      ctx.save(); ctx.translate(SIZE - 40, SIZE / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff";
      ctx.font = `bold ${Math.round(SIZE * 0.028)}px 'Arial', sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(practiceName.toUpperCase(), 0, 0); ctx.restore();
      if (useLogo && logo) {
        ctx.drawImage(logo, 40, 30, 80, 80);
        ctx.fillStyle = "#1a1a2e"; ctx.font = `bold ${Math.round(SIZE * 0.032)}px 'Arial', sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(practiceName, 136, 46);
      } else {
        ctx.fillStyle = "#1a1a2e"; ctx.font = `bold ${Math.round(SIZE * 0.04)}px 'Arial', sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(practiceName, 40, 36);
      }
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = c2; ctx.font = `900 ${Math.round(SIZE * 0.12)}px 'Arial Black', Impact, sans-serif`;
      ctx.textAlign = "left"; wrapText(ctx, headline, 40, SIZE * 0.26, SIZE * 0.82, SIZE * 0.115, 3);
      drawPhoto(ctx, photo, SIZE * 0.45, SIZE * 0.16, SIZE * 0.48, SIZE * 0.56);
      ctx.fillStyle = c1; const pillW = SIZE * 0.42, pillH = 60, pillX = 40, pillY = SIZE * 0.74;
      ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, 30); ctx.fill();
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff"; ctx.font = `bold ${Math.round(SIZE * 0.026)}px 'Arial', sans-serif`;
      ctx.textAlign = "center"; ctx.fillText(subtext || "Book Now", pillX + pillW / 2, pillY + 38);
    },
  },
  {
    id: "holiday-card", name: "Holiday / Event", description: "Celebration style — Thanksgiving example",
    render({ ctx, aiImage, logo, colors, practiceName, headline, subtext, useBranding, useLogo }: TemplateInput) {
      const c1 = useBranding ? (colors[0] || "#F5C518") : "#F5C518";
      if (aiImage) { drawPhoto(ctx, aiImage, 0, 0, SIZE, SIZE); ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, SIZE, SIZE); }
      else { ctx.fillStyle = "#2a2a2a"; ctx.fillRect(0, 0, SIZE, SIZE); }
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = `bold ${Math.round(SIZE * 0.04)}px 'Arial', sans-serif`;
      ctx.fillText(subtext || "WISHING YOU A", SIZE / 2, SIZE * 0.32);
      ctx.fillStyle = c1; ctx.font = `900 ${Math.round(SIZE * 0.15)}px 'Arial Black', Impact, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 20;
      headline.split(" ").slice(0, 2).forEach((w, i) => ctx.fillText(w.toUpperCase(), SIZE / 2, SIZE * 0.42 + i * SIZE * 0.16));
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(SIZE * 0.3, SIZE * 0.72, SIZE * 0.4, 2);
      ctx.fillStyle = "#ffffff"; ctx.font = `bold ${Math.round(SIZE * 0.035)}px 'Arial', sans-serif`;
      ctx.fillText("FROM OUR FAMILY, TO YOURS", SIZE / 2, SIZE * 0.8);
      if (useLogo && logo) ctx.drawImage(logo, SIZE / 2 - 40, SIZE * 0.86, 80, 80);
      else { ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(SIZE * 0.03)}px 'Arial', sans-serif`; ctx.fillText(practiceName.toUpperCase(), SIZE / 2, SIZE * 0.93); }
    },
  },
  {
    id: "before-after", name: "Before & After", description: "Split comparison layout",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext, useBranding, useLogo }: TemplateInput) {
      const c1 = useBranding ? (colors[0] || "#6B5CE7") : "#6B5CE7";
      ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, SIZE, SIZE);
      const panelW = SIZE / 2 - 4;
      drawPhoto(ctx, photo, 0, SIZE * 0.12, panelW, SIZE * 0.7, "Before photo");
      drawPhoto(ctx, null, SIZE / 2 + 4, SIZE * 0.12, panelW, SIZE * 0.7, "After photo");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(SIZE / 2 - 2, SIZE * 0.12, 4, SIZE * 0.7);
      [["BEFORE", 0], ["AFTER", SIZE / 2 + 4]].forEach(([label, x]) => {
        ctx.fillStyle = c1; ctx.fillRect(Number(x), SIZE * 0.12, panelW, 48);
        ctx.fillStyle = isLight(c1) ? "#000" : "#fff"; ctx.font = `bold ${Math.round(SIZE * 0.036)}px 'Arial Black', sans-serif`;
        ctx.textAlign = "center"; ctx.fillText(String(label), Number(x) + panelW / 2, SIZE * 0.12 + 34);
      });
      ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.round(SIZE * 0.065)}px 'Arial Black', sans-serif`;
      ctx.textAlign = "center"; ctx.fillText(headline.toUpperCase(), SIZE / 2, SIZE * 0.09);
      ctx.fillStyle = c1; ctx.fillRect(0, SIZE * 0.84, SIZE, SIZE * 0.16);
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff"; ctx.font = `bold ${Math.round(SIZE * 0.03)}px 'Arial', sans-serif`;
      ctx.textAlign = "center"; ctx.fillText(subtext || "Book your consultation today", SIZE / 2, SIZE * 0.9);
      ctx.font = `${Math.round(SIZE * 0.025)}px 'Arial', sans-serif`; ctx.fillText(practiceName, SIZE / 2, SIZE * 0.95);
      if (useLogo && logo) ctx.drawImage(logo, SIZE - 90, SIZE * 0.86, 60, 60);
    },
  },
  {
    id: "info-graphic", name: "Info Card", description: "Clean infographic with stats or bullet points",
    render({ ctx, logo, colors, practiceName, headline, subtext, useBranding, useLogo }: TemplateInput) {
      const c1 = useBranding ? (colors[0] || "#6B5CE7") : "#6B5CE7";
      const c2 = useBranding ? (colors[1] || "#9B8AF0") : "#9B8AF0";
      const isDark = !isLight(c1);
      const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
      bgGrad.addColorStop(0, isDark ? "#0f0f1a" : "#f8f8ff"); bgGrad.addColorStop(1, isDark ? "#1a1a2e" : "#efe8ff");
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, SIZE, SIZE);
      const topGrad = ctx.createLinearGradient(0, 0, SIZE, 0);
      topGrad.addColorStop(0, c1); topGrad.addColorStop(1, c2);
      ctx.fillStyle = topGrad; ctx.fillRect(0, 0, SIZE, 12);
      ctx.strokeStyle = c1; ctx.lineWidth = 2; ctx.globalAlpha = 0.15;
      [[SIZE * 0.88, SIZE * 0.15, 120], [SIZE * 0.05, SIZE * 0.85, 80]].forEach(([x, y, r]) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      if (useLogo && logo) ctx.drawImage(logo, 48, 40, 72, 72);
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
      ctx.font = `bold ${Math.round(SIZE * 0.025)}px 'Arial', sans-serif`; ctx.textAlign = "left";
      ctx.fillText(practiceName.toUpperCase(), (useLogo && logo) ? 136 : 48, 84);
      ctx.fillStyle = c1; ctx.font = `900 ${Math.round(SIZE * 0.085)}px 'Arial Black', sans-serif`;
      wrapText(ctx, headline, 48, SIZE * 0.22, SIZE - 96, SIZE * 0.09, 3);
      const divGrad = ctx.createLinearGradient(48, 0, SIZE - 48, 0);
      divGrad.addColorStop(0, c1); divGrad.addColorStop(1, "transparent");
      ctx.fillStyle = divGrad; ctx.fillRect(48, SIZE * 0.46, SIZE - 96, 4);
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)";
      ctx.font = `${Math.round(SIZE * 0.032)}px 'Arial', sans-serif`;
      wrapText(ctx, subtext || "Contact us to learn more", 48, SIZE * 0.54, SIZE - 96, 44, 5);
      const btnGrad = ctx.createLinearGradient(48, 0, 400, 0);
      btnGrad.addColorStop(0, c1); btnGrad.addColorStop(1, c2);
      ctx.fillStyle = btnGrad; ctx.beginPath(); ctx.roundRect(48, SIZE - 120, 380, 72, 36); ctx.fill();
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff"; ctx.font = `bold ${Math.round(SIZE * 0.028)}px 'Arial', sans-serif`;
      ctx.textAlign = "center"; ctx.fillText("Book Now →", 238, SIZE - 72);
    },
  },
];

// ─── AI Styles ────────────────────────────────────────────────────────────────

const AI_STYLES = [
  { id: "photorealistic", label: "📷 Photorealistic", desc: "DSLR photo quality, real people" },
  { id: "editorial", label: "🎨 Editorial", desc: "Magazine-quality, high-end" },
  { id: "warm-lifestyle", label: "☀️ Warm Lifestyle", desc: "Natural light, candid" },
  { id: "clean-studio", label: "🤍 Clean Studio", desc: "White background, portrait style" },
  { id: "bold-graphic", label: "⚡ Bold Graphic", desc: "Graphic design, vibrant shapes" },
  { id: "flat-icon", label: "✏️ Flat Illustration", desc: "Clean vector-style, icons" },
  { id: "3d-render", label: "🔮 3D Render", desc: "Glass, neon, premium 3D" },
  { id: "cinematic", label: "🎬 Cinematic", desc: "Dramatic lighting, moody" },
];

const AI_SUBJECT_PRESETS = [
  "Happy smiling patient in a bright modern dental office",
  "Beautiful healthy smile close-up, teeth transformation",
  "Confident young person showing perfect smile with braces",
  "Modern orthodontic clinic interior, clean white and bright",
  "Professional dentist in white coat, friendly and welcoming",
  "Diverse team of healthcare professionals smiling together",
  "Abstract dental/health icons on brand color background",
  "Celebration confetti and balloons on brand color background",
  "Minimal geometric shapes and lines on clean background",
  "Holiday seasonal background with festive decorations",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GraphicStudio() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: practice } = useQuery<Practice | null>({ queryKey: ["/api/practice"] });
  const { data: history = [] } = useQuery<any[]>({ queryKey: ["/api/graphics"] });

  const colors = [practice?.brandColor1 || "#6B5CE7", practice?.brandColor2 || "#9B8AF0", practice?.brandColor3 || "#ffffff"];
  const practiceName = practice?.name || "Your Practice";

  const [tab, setTab] = useState<"templates" | "ai" | "upload">("templates");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("big-type");
  const [photoImg, setPhotoImg] = useState<HTMLImageElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [aiImageImg, setAiImageImg] = useState<HTMLImageElement | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [headline, setHeadline] = useState("YOUR HEADLINE");
  const [subtext, setSubtext] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("photorealistic");
  const [useBranding, setUseBranding] = useState(true);
  const [useLogo, setUseLogo] = useState(true);

  // Load logo from practice
  useEffect(() => {
    if (practice?.logoDataUrl) {
      const img = new Image();
      img.onload = () => setLogoImg(img);
      img.src = practice.logoDataUrl as string;
    }
  }, [practice?.logoDataUrl]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tmpl = TEMPLATES.find(t => t.id === selectedTemplate) ?? TEMPLATES[0];
    tmpl.render({ ctx, photo: photoImg, aiImage: aiImageImg, logo: logoImg, colors, practiceName, headline, subtext, useBranding, useLogo });
  }, [selectedTemplate, photoImg, aiImageImg, logoImg, colors, practiceName, headline, subtext, useBranding, useLogo]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // Save graphic to history
  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/graphics", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/graphics"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/graphics/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/graphics"] }),
  });

  // AI image generation
  const aiMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/image", {
      prompt: aiPrompt,
      style: aiStyle,
      brandColors: useBranding ? colors : [],
      practiceName: useBranding ? practiceName : undefined,
    }),
    onSuccess: (data: any) => {
      setAiImageUrl(data.url);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { setAiImageImg(img); setSelectedTemplate("gradient-hero"); };
      img.onerror = () => setSelectedTemplate("gradient-hero");
      img.src = data.url;
      // Save to history
      saveMutation.mutate({ imageUrl: data.url, prompt: aiPrompt, style: aiStyle, template: "gradient-hero", usedBranding: useBranding ? 1 : 0, source: "ai" });
      toast({ title: "Image generated!", description: "Applied to Gradient Hero template." });
    },
    onError: (err: any) => toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
  });

  // Brand-style uploaded photo
  const brandStyleMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/brand-style", {
      imageBase64: photoBase64,
      brandColors: colors,
      practiceName,
      brandFeel: (practice as any)?.brandFeel,
    }),
    onSuccess: (data: any) => {
      if (data.url) {
        setAiImageUrl(data.url);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { setAiImageImg(img); renderCanvas(); };
        img.src = data.url;
        toast({ title: "Photo styled!", description: "Your photo has been color-graded to your brand." });
      } else {
        toast({ title: "Styling unavailable", description: "Using original photo instead." });
      }
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    const img = new Image();
    img.onload = () => setPhotoImg(img);
    img.src = url;
    // Also convert to base64 for brand-styling
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${practiceName.replace(/\s+/g, "-").toLowerCase()}-graphic.png`;
    link.href = dataUrl;
    link.click();
    // Save thumbnail to history
    const thumb = document.createElement("canvas");
    thumb.width = 200; thumb.height = 200;
    const tctx = thumb.getContext("2d")!;
    tctx.drawImage(canvas, 0, 0, 200, 200);
    saveMutation.mutate({
      imageUrl: dataUrl.slice(0, 500), // truncated for storage
      thumbnailUrl: thumb.toDataURL("image/jpeg", 0.7),
      template: selectedTemplate,
      headline,
      subtext,
      usedBranding: useBranding ? 1 : 0,
      source: "template",
    });
    toast({ title: "Downloaded!", description: "Saved to your graphics history." });
  }

  function loadFromHistory(item: any) {
    setHeadline(item.headline || "YOUR HEADLINE");
    setSubtext(item.subtext || "");
    if (item.template) setSelectedTemplate(item.template);
    setHistoryOpen(false);
    toast({ title: "Loaded", description: "Graphic settings restored." });
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles size={18} className="text-primary" /> Graphic Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create branded social media graphics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setHistoryOpen(!historyOpen)} className="gap-2">
              <History size={14} /> History {history.length > 0 && <Badge variant="secondary" className="text-xs">{history.length}</Badge>}
            </Button>
            <Button onClick={handleDownload} className="gap-2">
              <Download size={14} /> Download PNG
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          {/* Left — Canvas + templates */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border overflow-hidden bg-black" style={{ aspectRatio: "1/1" }}>
              <canvas ref={canvasRef} width={SIZE} height={SIZE} className="w-full h-full" />
            </div>

            {/* Branding toggles */}
            <div className="flex items-center gap-6 px-1">
              <div className="flex items-center gap-2.5">
                <Switch id="use-branding" checked={useBranding} onCheckedChange={setUseBranding} />
                <Label htmlFor="use-branding" className="text-sm flex items-center gap-1.5 cursor-pointer">
                  <Palette size={13} className="text-primary" /> Use brand colors
                </Label>
              </div>
              <div className="flex items-center gap-2.5">
                <Switch id="use-logo" checked={useLogo} onCheckedChange={setUseLogo} disabled={!practice?.logoDataUrl} />
                <Label htmlFor="use-logo" className={`text-sm flex items-center gap-1.5 cursor-pointer ${!practice?.logoDataUrl ? "opacity-40" : ""}`}>
                  <Crown size={13} className="text-primary" /> Include logo
                  {!practice?.logoDataUrl && <span className="text-xs text-muted-foreground">(upload in Practice setup)</span>}
                </Label>
              </div>
            </div>

            {/* Template picker */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <Layout size={11} /> Templates
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${selectedTemplate === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                    <p className={`text-xs font-semibold leading-tight ${selectedTemplate === t.id ? "text-primary" : "text-foreground"}`}>{t.name}</p>
                    <p className="text-[10px] mt-0.5 text-muted-foreground leading-tight">{t.description}</p>
                    {selectedTemplate === t.id && <Check size={10} className="mt-1 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Controls */}
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="templates" className="text-xs gap-1"><Layout size={11} />Template</TabsTrigger>
                <TabsTrigger value="ai" className="text-xs gap-1"><Wand2 size={11} />AI Generate</TabsTrigger>
                <TabsTrigger value="upload" className="text-xs gap-1"><Upload size={11} />Upload & Style</TabsTrigger>
              </TabsList>

              {/* Template Controls */}
              <TabsContent value="templates" className="space-y-4 mt-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Brand Colors</p>
                  <div className="flex gap-2 flex-wrap">
                    {colors.filter(Boolean).map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md border border-border/50" style={{ background: c }} />
                        <span className="text-xs font-mono text-muted-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                  {!useBranding && <p className="text-xs text-amber-400 mt-2">⚠ Branding is off — using default colors</p>}
                </div>

                <div className="rounded-xl border border-border p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Text Content</p>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Main Headline</label>
                    <input value={headline} onChange={e => setHeadline(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="HAPPY BIRTHDAY" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Subtext / Caption</label>
                    <textarea value={subtext} onChange={e => setSubtext(e.target.value)} rows={3}
                      className="w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Paste your AI caption here..." />
                    <p className="text-[10px] text-muted-foreground">Tip: Generate in Create → copy → paste here</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><ImageIcon size={11} /> Photo</p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  {photoUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={photoUrl} alt="Uploaded" className="w-16 h-16 rounded-lg object-cover border border-border" />
                      <div className="flex-1">
                        <p className="text-xs font-medium flex items-center gap-1"><Check size={11} className="text-green-500" /> Photo loaded</p>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                          <RefreshCw size={10} /> Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 p-5 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Upload size={18} className="text-primary" />
                      <p className="text-sm font-medium">Upload photo</p>
                      <p className="text-xs">Patient, staff, or office photo</p>
                    </button>
                  )}
                </div>
              </TabsContent>

              {/* AI Generation */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5"><Sparkles size={11} /> Flux Pro Image Generation</p>
                  <p className="text-xs text-muted-foreground">Photorealistic AI images. ~20-30 seconds per image.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Quick Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_SUBJECT_PRESETS.map(preset => (
                      <button key={preset} onClick={() => setAiPrompt(preset)}
                        className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${aiPrompt === preset ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
                        {preset.length > 38 ? preset.slice(0, 38) + "…" : preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Custom Prompt</p>
                  <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3}
                    className="w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Describe what you want..." />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {AI_STYLES.map(s => (
                    <button key={s.id} onClick={() => setAiStyle(s.id)}
                      className={`rounded-lg border p-2.5 text-left transition-all ${aiStyle === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                      <p className={`text-xs font-semibold ${aiStyle === s.id ? "text-primary" : "text-foreground"}`}>{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                    </button>
                  ))}
                </div>

                <Button onClick={() => aiMutation.mutate()} disabled={!aiPrompt || aiMutation.isPending} className="w-full gap-2" size="lg">
                  {aiMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Generating (~25s)...</> : <><Wand2 size={15} /> Generate with Flux Pro</>}
                </Button>

                {aiImageUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-green-500 flex items-center gap-1"><Check size={11} /> Generated — switch to Gradient Hero template</p>
                    <img src={aiImageUrl} alt="AI" className="w-full rounded-lg border border-border" />
                  </div>
                )}
              </TabsContent>

              {/* Upload & Brand Style */}
              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-primary mb-1">Upload Your Own Photo</p>
                  <p className="text-xs text-muted-foreground">Use your own patient or practice photos. Optionally let AI color-grade them to match your brand colors.</p>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

                {photoUrl ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img src={photoUrl} alt="Uploaded" className="w-full rounded-xl" />
                      <button onClick={() => { setPhotoImg(null); setPhotoUrl(null); setPhotoBase64(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                        <X size={13} className="text-white" />
                      </button>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="w-full gap-2">
                      <RefreshCw size={13} /> Change Photo
                    </Button>

                    {/* Brand styling */}
                    <div className="rounded-xl border border-border p-4 space-y-3">
                      <p className="text-sm font-semibold">AI Brand Styling</p>
                      <p className="text-xs text-muted-foreground">Color-grade this photo to match your brand palette — makes any photo look on-brand.</p>
                      <div className="flex gap-2 mb-2">
                        {colors.filter(Boolean).map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-md border border-border/50" style={{ background: c }} />
                        ))}
                        <span className="text-xs text-muted-foreground self-center">→ will tint to these colors</span>
                      </div>
                      <Button onClick={() => brandStyleMutation.mutate()} disabled={!photoBase64 || brandStyleMutation.isPending} className="w-full gap-2">
                        {brandStyleMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Styling (~25s)...</> : <><Sparkles size={14} /> Apply Brand Style</>}
                      </Button>
                      {aiImageUrl && <p className="text-xs text-green-500 flex items-center gap-1"><Check size={11} /> Styled version applied to template</p>}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">Or use the photo as-is — it's already applied to your templates.</p>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-10 flex flex-col items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload size={22} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">Upload a photo</p>
                      <p className="text-xs text-muted-foreground mt-1">Patient photos, staff, office shots</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP</p>
                  </button>
                )}
              </TabsContent>
            </Tabs>

            <Button onClick={handleDownload} size="lg" className="w-full gap-2">
              <Download size={15} /> Download 1080×1080 PNG
            </Button>
          </div>
        </div>

        {/* History Drawer */}
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
            <div className="w-80 bg-card border-l border-border flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-sm flex items-center gap-2"><History size={15} className="text-primary" /> Graphics History</h3>
                <button onClick={() => setHistoryOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {history.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No graphics yet</p>
                    <p className="text-xs mt-1">Download a graphic to save it here</p>
                  </div>
                )}
                {history.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-border bg-background/50 overflow-hidden group">
                    {item.thumbnailUrl && (
                      <div className="aspect-square bg-muted">
                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{item.headline || item.prompt || item.template || "Graphic"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {item.source === "ai" ? "AI Generated" : "Template"} · {item.usedBranding ? "With branding" : "No branding"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => loadFromHistory(item)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary" title="Re-open">
                            <ChevronRight size={14} />
                          </button>
                          <button onClick={() => deleteMutation.mutate(item.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
