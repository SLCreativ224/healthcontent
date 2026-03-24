import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Download, RefreshCw, Check, Sparkles, Layout,
  Wand2, Image as ImageIcon, Loader2, Copy
} from "lucide-react";
import type { Practice } from "@shared/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(photo, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 99, align: CanvasTextAlign = "left"): number {
  ctx.textAlign = align;
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;
  const startX = align === "center" ? x : x;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), startX, y + lineCount * lineHeight);
      line = words[n] + " ";
      lineCount++;
      if (lineCount >= maxLines - 1) {
        const remaining = words.slice(n + 1).join(" ");
        ctx.fillText(line.trim() + (remaining ? "…" : ""), startX, y + lineCount * lineHeight);
        return lineCount + 1;
      }
    } else { line = test; }
  }
  if (line.trim()) { ctx.fillText(line.trim(), startX, y + lineCount * lineHeight); lineCount++; }
  return lineCount;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
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
}

const TEMPLATES = [
  {
    id: "big-type",
    name: "Big Type",
    description: "Huge bold headline with photo cutout — like your birthday example",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext }: TemplateInput) {
      const c1 = colors[0] || "#F5C518";
      const c2 = colors[1] || "#1a1a1a";
      const textOnC1 = isLight(c1) ? "#000000" : "#ffffff";
      // Dark background
      ctx.fillStyle = c2;
      ctx.fillRect(0, 0, SIZE, SIZE);
      // HUGE headline text behind photo
      ctx.fillStyle = c1;
      ctx.font = `900 ${Math.round(SIZE * 0.2)}px 'Arial Black', Impact, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const words = headline.split(" ");
      const lineH = Math.round(SIZE * 0.19);
      words.slice(0, 3).forEach((word, i) => {
        ctx.fillText(word.toUpperCase(), SIZE / 2, 40 + i * lineH);
      });
      ctx.textBaseline = "alphabetic";
      // Photo on top (bottom 60%)
      if (photo) {
        const photoY = SIZE * 0.2;
        drawPhoto(ctx, photo, SIZE * 0.05, photoY, SIZE * 0.65, SIZE - photoY - 20);
      } else {
        drawPhoto(ctx, null, SIZE * 0.05, SIZE * 0.2, SIZE * 0.65, SIZE * 0.75);
      }
      // Right side subtext
      ctx.fillStyle = c1;
      ctx.font = `bold ${Math.round(SIZE * 0.03)}px 'Arial', sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(subtext || practiceName, SIZE - 40, SIZE - 80);
      // Logo bottom right
      if (logo) {
        ctx.drawImage(logo, SIZE - 110, SIZE - 200, 80, 80);
      }
      // Bottom color bar
      ctx.fillStyle = c1;
      ctx.fillRect(0, SIZE - 8, SIZE, 8);
    },
  },
  {
    id: "dark-pro",
    name: "Dark Pro",
    description: "Dark background, photo right, bold text left — like the Braces example",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext }: TemplateInput) {
      const c1 = colors[0] || "#F5C518";
      const c2 = "#1c1c24";
      // Dark bg
      ctx.fillStyle = c2;
      ctx.fillRect(0, 0, SIZE, SIZE);
      // Decorative shapes
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.arc(SIZE * 0.15, SIZE * 0.35, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.arc(SIZE * 0.78, SIZE * 0.22, 16, 0, Math.PI * 2); ctx.fill();
      // + and x decorators
      ctx.strokeStyle = c1; ctx.lineWidth = 5; ctx.lineCap = "round";
      [[SIZE * 0.72, SIZE * 0.12], [SIZE * 0.08, SIZE * 0.65]].forEach(([px, py]) => {
        ctx.beginPath(); ctx.moveTo(px - 14, py); ctx.lineTo(px + 14, py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px, py + 14); ctx.stroke();
      });
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(SIZE * 0.82, SIZE * 0.72, 20, 0, Math.PI * 2); ctx.stroke();
      // Photo (right side, with color halo)
      ctx.fillStyle = c1;
      ctx.fillRect(SIZE * 0.5, SIZE * 0.28, SIZE * 0.5, SIZE * 0.18);
      drawPhoto(ctx, photo, SIZE * 0.44, SIZE * 0.1, SIZE * 0.56, SIZE * 0.9);
      // Left side text
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.round(SIZE * 0.1)}px 'Arial Black', Impact, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const hWords = headline.split(" ");
      let hY = SIZE * 0.22;
      hWords.slice(0, 2).forEach((word) => {
        ctx.fillText(word.toUpperCase(), 52, hY);
        hY += SIZE * 0.105;
      });
      if (hWords[2]) {
        ctx.fillStyle = c1;
        ctx.fillText(hWords[2].toUpperCase(), 52, hY);
        hY += SIZE * 0.105;
      }
      ctx.textBaseline = "alphabetic";
      // Subtext
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `${Math.round(SIZE * 0.028)}px 'Arial', sans-serif`;
      wrapText(ctx, subtext || practiceName, 52, hY + 20, SIZE * 0.42, 36, 3);
      // Bottom bar
      ctx.fillStyle = c1;
      ctx.fillRect(0, SIZE - 80, SIZE, 80);
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff";
      ctx.font = `bold ${Math.round(SIZE * 0.03)}px 'Arial', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(practiceName.toUpperCase(), SIZE / 2, SIZE - 30);
      // Logo
      if (logo) { ctx.drawImage(logo, SIZE - 100, SIZE - 72, 56, 56); }
    },
  },
  {
    id: "split-modern",
    name: "Split Modern",
    description: "Half color, half photo with diagonal cut",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext }: TemplateInput) {
      const c1 = colors[0] || "#6B5CE7";
      const c2 = colors[1] || "#9B8AF0";
      // Photo full bleed
      drawPhoto(ctx, photo, SIZE * 0.42, 0, SIZE * 0.58, SIZE);
      // Color panel with diagonal cut
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(SIZE * 0.52, 0); ctx.lineTo(SIZE * 0.38, SIZE); ctx.lineTo(0, SIZE);
      ctx.closePath(); ctx.fill();
      // Accent stripe
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(SIZE * 0.52, 0); ctx.lineTo(SIZE * 0.57, 0); ctx.lineTo(SIZE * 0.43, SIZE); ctx.lineTo(SIZE * 0.38, SIZE);
      ctx.closePath(); ctx.fill();
      // Logo top left
      if (logo) {
        ctx.save();
        ctx.beginPath(); ctx.arc(64, 64, 40, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(logo, 24, 24, 80, 80);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath(); ctx.arc(64, 64, 40, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `bold 20px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(practiceName.slice(0, 2).toUpperCase(), 64, 64);
        ctx.textBaseline = "alphabetic";
      }
      // Headline
      const textColor = isLight(c1) ? "#000" : "#fff";
      ctx.fillStyle = textColor;
      ctx.font = `900 ${Math.round(SIZE * 0.09)}px 'Arial Black', sans-serif`;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      wrapText(ctx, headline.toUpperCase(), 48, SIZE * 0.28, SIZE * 0.42, SIZE * 0.1, 4);
      ctx.textBaseline = "alphabetic";
      // Divider
      ctx.fillStyle = isLight(c1) ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)";
      ctx.fillRect(48, SIZE * 0.72, SIZE * 0.32, 3);
      // Subtext
      ctx.fillStyle = isLight(c1) ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)";
      ctx.font = `${Math.round(SIZE * 0.026)}px 'Arial', sans-serif`;
      ctx.textAlign = "left";
      wrapText(ctx, subtext || practiceName, 48, SIZE * 0.77, SIZE * 0.36, 34, 3);
      // Practice name bottom
      ctx.fillStyle = isLight(c1) ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
      ctx.font = `bold ${Math.round(SIZE * 0.022)}px 'Arial', sans-serif`;
      ctx.fillText(practiceName.toUpperCase(), 48, SIZE - 40);
    },
  },
  {
    id: "gradient-hero",
    name: "Gradient Hero",
    description: "Full photo with branded gradient — premium feel",
    render({ ctx, photo, aiImage, logo, colors, practiceName, headline, subtext }: TemplateInput) {
      const c1 = colors[0] || "#6B5CE7";
      const c2 = colors[1] || "#9B8AF0";
      const { r: r1, g: g1, b: b1 } = hexToRgb(c1);
      const { r: r2, g: g2, b: b2 } = hexToRgb(c2);
      // Photo or AI image
      drawPhoto(ctx, aiImage || photo, 0, 0, SIZE, SIZE);
      // Gradient overlay — brand color from bottom
      const grad = ctx.createLinearGradient(0, SIZE * 0.2, 0, SIZE);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.45, `rgba(${r1},${g1},${b1},0.55)`);
      grad.addColorStop(1, `rgba(${r2},${g2},${b2},0.95)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SIZE, SIZE);
      // Top color bar
      const topGrad = ctx.createLinearGradient(0, 0, SIZE, 0);
      topGrad.addColorStop(0, c1);
      topGrad.addColorStop(1, c2);
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, SIZE, 10);
      // Logo
      if (logo) { ctx.drawImage(logo, 40, 28, 64, 64); }
      // Practice name top
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = `bold ${Math.round(SIZE * 0.025)}px 'Arial', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(practiceName, logo ? 120 : 40, 72);
      // Headline
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.round(SIZE * 0.1)}px 'Arial Black', Impact, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 20;
      wrapText(ctx, headline, 52, SIZE * 0.68, SIZE - 104, SIZE * 0.1, 3);
      ctx.shadowBlur = 0;
      // Subtext
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `${Math.round(SIZE * 0.028)}px 'Arial', sans-serif`;
      wrapText(ctx, subtext, 52, SIZE * 0.83, SIZE - 104, 36, 3);
      // CTA strip
      ctx.fillStyle = "#ffffff";
      const ctaY = SIZE - 70;
      ctx.fillRect(52, ctaY, 280, 50);
      ctx.fillStyle = c1;
      ctx.font = `bold ${Math.round(SIZE * 0.025)}px 'Arial', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Book Consultation →", 192, ctaY + 32);
    },
  },
  {
    id: "minimal-white",
    name: "Minimal Frame",
    description: "Clean white with brand color accents — like Tiny Smiles example",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext }: TemplateInput) {
      const c1 = colors[0] || "#6ECFE0";
      const c2 = colors[1] || "#8B5CF6";
      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);
      // Right color accent bar
      ctx.fillStyle = c1;
      ctx.fillRect(SIZE - 80, 0, 80, SIZE);
      // Top bar
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, SIZE - 80, 10);
      // Vertical text on right bar
      ctx.save();
      ctx.translate(SIZE - 40, SIZE / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff";
      ctx.font = `bold ${Math.round(SIZE * 0.028)}px 'Arial', sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(practiceName.toUpperCase(), 0, 0);
      ctx.restore();
      // Logo + practice name top left
      if (logo) {
        ctx.drawImage(logo, 40, 30, 80, 80);
        ctx.fillStyle = "#1a1a2e";
        ctx.font = `bold ${Math.round(SIZE * 0.032)}px 'Arial', sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(practiceName, 136, 46);
      } else {
        ctx.fillStyle = "#1a1a2e";
        ctx.font = `bold ${Math.round(SIZE * 0.04)}px 'Arial', sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(practiceName, 40, 36);
      }
      ctx.textBaseline = "alphabetic";
      // Headline (big, c2 color)
      ctx.fillStyle = c2;
      ctx.font = `900 ${Math.round(SIZE * 0.12)}px 'Arial Black', Impact, sans-serif`;
      ctx.textAlign = "left";
      wrapText(ctx, headline, 40, SIZE * 0.26, SIZE * 0.82, SIZE * 0.115, 3);
      // Photo right side
      const photoX = SIZE * 0.45;
      const photoW = SIZE * 0.48;
      drawPhoto(ctx, photo, photoX, SIZE * 0.16, photoW, SIZE * 0.56);
      // Rounded pill accent
      ctx.fillStyle = c1;
      const pillW = SIZE * 0.42, pillH = 60, pillX = 40, pillY = SIZE * 0.74;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 30);
      ctx.fill();
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff";
      ctx.font = `bold ${Math.round(SIZE * 0.026)}px 'Arial', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(subtext || "Learn More", pillX + pillW / 2, pillY + 38);
      // Bottom info
      ctx.fillStyle = "#555";
      ctx.font = `${Math.round(SIZE * 0.022)}px 'Arial', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(practiceName, 40, SIZE - 40);
    },
  },
  {
    id: "holiday-card",
    name: "Holiday / Event",
    description: "Celebration style with big centered text — like the Thanksgiving example",
    render({ ctx, aiImage, logo, colors, practiceName, headline, subtext }: TemplateInput) {
      const c1 = colors[0] || "#F5C518";
      const c2 = colors[1] || "#2a2a2a";
      // Background (use ai image if available)
      if (aiImage) {
        drawPhoto(ctx, aiImage, 0, 0, SIZE, SIZE);
        // Dark overlay
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, SIZE, SIZE);
      } else {
        ctx.fillStyle = c2;
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
      // Center text block
      ctx.textAlign = "center";
      // Small intro
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `bold ${Math.round(SIZE * 0.04)}px 'Arial', sans-serif`;
      ctx.fillText(subtext || "WISHING YOU A", SIZE / 2, SIZE * 0.32);
      // BIG headline
      ctx.fillStyle = c1;
      ctx.font = `900 ${Math.round(SIZE * 0.15)}px 'Arial Black', Impact, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 20;
      const words = headline.split(" ");
      words.slice(0, 2).forEach((word, i) => {
        ctx.fillText(word.toUpperCase(), SIZE / 2, SIZE * 0.42 + i * SIZE * 0.16);
      });
      ctx.shadowBlur = 0;
      // Divider
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(SIZE * 0.3, SIZE * 0.72, SIZE * 0.4, 2);
      // From line
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(SIZE * 0.035)}px 'Arial', sans-serif`;
      ctx.fillText("FROM OUR FAMILY, TO YOURS", SIZE / 2, SIZE * 0.8);
      // Logo + practice name
      if (logo) {
        ctx.drawImage(logo, SIZE / 2 - 40, SIZE * 0.86, 80, 80);
      } else {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(SIZE * 0.03)}px 'Arial', sans-serif`;
        ctx.fillText(practiceName.toUpperCase(), SIZE / 2, SIZE * 0.93);
      }
    },
  },
  {
    id: "before-after",
    name: "Before & After",
    description: "Split comparison layout with brand colors",
    render({ ctx, photo, logo, colors, practiceName, headline, subtext }: TemplateInput) {
      const c1 = colors[0] || "#6B5CE7";
      const c2 = "#1a1a2e";
      // Background
      ctx.fillStyle = c2;
      ctx.fillRect(0, 0, SIZE, SIZE);
      // Two photo panels
      const panelW = SIZE / 2 - 4;
      drawPhoto(ctx, photo, 0, SIZE * 0.12, panelW, SIZE * 0.7, "Before photo");
      drawPhoto(ctx, null, SIZE / 2 + 4, SIZE * 0.12, panelW, SIZE * 0.7, "After photo");
      // Center divider
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(SIZE / 2 - 2, SIZE * 0.12, 4, SIZE * 0.7);
      // BEFORE / AFTER labels
      [["BEFORE", 0], ["AFTER", SIZE / 2 + 4]].forEach(([label, x]) => {
        ctx.fillStyle = c1;
        ctx.fillRect(Number(x), SIZE * 0.12, panelW, 48);
        ctx.fillStyle = isLight(c1) ? "#000" : "#fff";
        ctx.font = `bold ${Math.round(SIZE * 0.036)}px 'Arial Black', sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(String(label), Number(x) + panelW / 2, SIZE * 0.12 + 34);
      });
      // Top header
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${Math.round(SIZE * 0.065)}px 'Arial Black', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(headline.toUpperCase(), SIZE / 2, SIZE * 0.09);
      // Bottom
      ctx.fillStyle = c1;
      ctx.fillRect(0, SIZE * 0.84, SIZE, SIZE * 0.16);
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff";
      ctx.font = `bold ${Math.round(SIZE * 0.03)}px 'Arial', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(subtext || "Book your consultation today", SIZE / 2, SIZE * 0.9);
      ctx.font = `${Math.round(SIZE * 0.025)}px 'Arial', sans-serif`;
      ctx.fillText(practiceName, SIZE / 2, SIZE * 0.95);
      if (logo) { ctx.drawImage(logo, SIZE - 90, SIZE * 0.86, 60, 60); }
    },
  },
  {
    id: "info-graphic",
    name: "Info Card",
    description: "Clean infographic style with stats or bullet points",
    render({ ctx, logo, colors, practiceName, headline, subtext }: TemplateInput) {
      const c1 = colors[0] || "#6B5CE7";
      const c2 = colors[1] || "#9B8AF0";
      const isDark = !isLight(c1);
      // Gradient bg
      const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
      bgGrad.addColorStop(0, isDark ? "#0f0f1a" : "#f8f8ff");
      bgGrad.addColorStop(1, isDark ? "#1a1a2e" : "#efe8ff");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, SIZE, SIZE);
      // Top accent
      const topGrad = ctx.createLinearGradient(0, 0, SIZE, 0);
      topGrad.addColorStop(0, c1); topGrad.addColorStop(1, c2);
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, SIZE, 12);
      // Circle decoration
      ctx.strokeStyle = c1; ctx.lineWidth = 2; ctx.globalAlpha = 0.15;
      [[SIZE * 0.88, SIZE * 0.15, 120], [SIZE * 0.05, SIZE * 0.85, 80]].forEach(([x, y, r]) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      // Logo
      if (logo) { ctx.drawImage(logo, 48, 40, 72, 72); }
      // Practice name
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
      ctx.font = `bold ${Math.round(SIZE * 0.025)}px 'Arial', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(practiceName.toUpperCase(), logo ? 136 : 48, 84);
      // Headline
      ctx.fillStyle = c1;
      ctx.font = `900 ${Math.round(SIZE * 0.085)}px 'Arial Black', sans-serif`;
      wrapText(ctx, headline, 48, SIZE * 0.22, SIZE - 96, SIZE * 0.09, 3);
      // Divider
      const divGrad = ctx.createLinearGradient(48, 0, SIZE - 48, 0);
      divGrad.addColorStop(0, c1); divGrad.addColorStop(1, "transparent");
      ctx.fillStyle = divGrad;
      ctx.fillRect(48, SIZE * 0.46, SIZE - 96, 4);
      // Subtext
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)";
      ctx.font = `${Math.round(SIZE * 0.032)}px 'Arial', sans-serif`;
      wrapText(ctx, subtext || "Contact us to learn more", 48, SIZE * 0.54, SIZE - 96, 44, 5);
      // Bottom CTA
      const btnGrad = ctx.createLinearGradient(48, 0, 400, 0);
      btnGrad.addColorStop(0, c1); btnGrad.addColorStop(1, c2);
      ctx.fillStyle = btnGrad;
      ctx.beginPath(); ctx.roundRect(48, SIZE - 120, 380, 72, 36); ctx.fill();
      ctx.fillStyle = isLight(c1) ? "#000" : "#fff";
      ctx.font = `bold ${Math.round(SIZE * 0.028)}px 'Arial', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Book Now →", 238, SIZE - 72);
    },
  },
];

// ─── AI Style Presets ─────────────────────────────────────────────────────────

const AI_STYLES = [
  { id: "photorealistic", label: "Photorealistic", desc: "Real-life photography style" },
  { id: "modern-graphic", label: "Modern Graphic", desc: "Bold graphic design, vibrant" },
  { id: "minimal-clean", label: "Minimal & Clean", desc: "White space, elegant, luxury" },
  { id: "warm-lifestyle", label: "Warm Lifestyle", desc: "Natural, candid, approachable" },
];

const AI_SUBJECT_PRESETS = [
  "Happy patient smiling in a bright modern dental office",
  "Before and after smile transformation with branded frame",
  "Professional doctor in modern clinic setting",
  "Close-up of beautiful healthy teeth and confident smile",
  "Modern aesthetic clinic interior, clean and welcoming",
  "Team of healthcare professionals smiling together",
  "Patient consultation, warm and professional atmosphere",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GraphicStudio() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: practice } = useQuery<Practice | null>({ queryKey: ["/api/practice"] });

  const colors = [practice?.brandColor1 || "#6B5CE7", practice?.brandColor2 || "#9B8AF0", practice?.brandColor3 || "#ffffff"];
  const practiceName = practice?.name || "Your Practice";

  const [tab, setTab] = useState<"templates" | "ai">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState("big-type");
  const [photoImg, setPhotoImg] = useState<HTMLImageElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [aiImageImg, setAiImageImg] = useState<HTMLImageElement | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [headline, setHeadline] = useState("YOUR HEADLINE HERE");
  const [subtext, setSubtext] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("photorealistic");

  // Load logo
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
    const tmpl = TEMPLATES.find((t) => t.id === selectedTemplate) ?? TEMPLATES[0];
    tmpl.render({ ctx, photo: photoImg, aiImage: aiImageImg, logo: logoImg, colors, practiceName, headline, subtext });
  }, [selectedTemplate, photoImg, aiImageImg, logoImg, colors, practiceName, headline, subtext]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // AI image generation
  const aiMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/image", {
      prompt: aiPrompt,
      style: aiStyle,
      brandColors: colors,
      practiceName,
    }),
    onSuccess: (data: any) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { setAiImageImg(img); setAiImageUrl(data.url); };
      img.onerror = () => {
        // CORS issue with DALL-E URLs — load via proxy or show URL
        setAiImageUrl(data.url);
        toast({ title: "AI image ready", description: "Image generated — applying to template." });
      };
      img.src = data.url;
      toast({ title: "Image generated!", description: "Applying to your graphic..." });
    },
    onError: (err: any) => toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
  });

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    const img = new Image();
    img.onload = () => setPhotoImg(img);
    img.src = url;
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${practiceName.replace(/\s+/g, "-").toLowerCase()}-graphic.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast({ title: "Downloaded!", description: "1080×1080 PNG saved." });
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
            <p className="text-sm text-muted-foreground mt-0.5">Create professional branded social graphics</p>
          </div>
          <Button onClick={handleDownload} className="gap-2">
            <Download size={14} /> Download 1080×1080
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          {/* Left — Canvas */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border overflow-hidden bg-black" style={{ aspectRatio: "1/1" }}>
              <canvas ref={canvasRef} width={SIZE} height={SIZE} className="w-full h-full" />
            </div>

            {/* Template picker */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <Layout size={11} /> Choose Template
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TEMPLATES.map((t) => (
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
              <TabsList className="w-full">
                <TabsTrigger value="templates" className="flex-1 gap-1.5 text-xs"><Layout size={12} />Template Controls</TabsTrigger>
                <TabsTrigger value="ai" className="flex-1 gap-1.5 text-xs"><Wand2 size={12} />AI Image Generation</TabsTrigger>
              </TabsList>

              {/* Template Controls */}
              <TabsContent value="templates" className="space-y-4 mt-4">
                {/* Brand colors */}
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Brand Colors (auto)</p>
                  <div className="flex gap-2 flex-wrap">
                    {colors.filter(Boolean).map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md border border-border/50 shadow-sm" style={{ background: c }} />
                        <span className="text-xs font-mono text-muted-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photo upload */}
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon size={11} /> Client Photo
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  {photoUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={photoUrl} alt="Uploaded" className="w-16 h-16 rounded-lg object-cover border border-border" />
                      <div className="flex-1">
                        <p className="text-xs font-medium flex items-center gap-1"><Check size={11} className="text-green-500" /> Photo loaded</p>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                          <RefreshCw size={10} /> Change photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground">
                      <Upload size={20} className="text-primary" />
                      <p className="text-sm font-medium">Upload patient or staff photo</p>
                      <p className="text-xs">JPG, PNG, WEBP</p>
                    </button>
                  )}
                </div>

                {/* Text controls */}
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Text Content</p>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Main Headline</label>
                    <input value={headline} onChange={(e) => setHeadline(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="HAPPY BIRTHDAY" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Subtext / Caption</label>
                    <textarea value={subtext} onChange={(e) => setSubtext(e.target.value)} rows={3}
                      className="w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Paste your AI caption here or write custom text..." />
                    <p className="text-[10px] text-muted-foreground">Tip: Generate in Create → copy caption → paste here</p>
                  </div>
                </div>
              </TabsContent>

              {/* AI Generation */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5"><Sparkles size={11} /> DALL-E 3 Image Generation</p>
                  <p className="text-xs text-muted-foreground">Generates a professional image using your brand colors. The image is then applied to your selected template as the background photo.</p>
                </div>

                {/* Subject presets */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Quick Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {AI_SUBJECT_PRESETS.map((preset) => (
                      <button key={preset} onClick={() => setAiPrompt(preset)}
                        className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${aiPrompt === preset ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
                        {preset.length > 35 ? preset.slice(0, 35) + "…" : preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom prompt */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Custom Prompt</p>
                  <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3}
                    className="w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Describe what you want to see in the image..." />
                </div>

                {/* Style */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Visual Style</p>
                  <div className="grid grid-cols-2 gap-2">
                    {AI_STYLES.map((s) => (
                      <button key={s.id} onClick={() => setAiStyle(s.id)}
                        className={`rounded-lg border p-2.5 text-left transition-all ${aiStyle === s.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                        <p className={`text-xs font-semibold ${aiStyle === s.id ? "text-primary" : "text-foreground"}`}>{s.label}</p>
                        <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <Button onClick={() => aiMutation.mutate()} disabled={!aiPrompt || aiMutation.isPending} className="w-full gap-2" size="lg">
                  {aiMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Generating (~15s)...</> : <><Wand2 size={15} /> Generate AI Image</>}
                </Button>

                {aiImageUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-green-500 flex items-center gap-1"><Check size={11} /> AI image generated</p>
                    <img src={aiImageUrl} alt="AI generated" className="w-full rounded-lg border border-border" />
                    <p className="text-[10px] text-muted-foreground">This image is applied as the background on the Gradient Hero template. Select that template to see it.</p>
                    <a href={aiImageUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Copy size={10} /> Open full image in new tab
                    </a>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">~$0.06 per image • Requires OpenAI key in Render</p>
              </TabsContent>
            </Tabs>

            {/* Download */}
            <Button onClick={handleDownload} size="lg" className="w-full gap-2">
              <Download size={15} /> Download PNG (1080×1080)
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
