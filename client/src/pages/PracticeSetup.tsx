import { useEffect, useRef, useState, useCallback } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SPECIALTIES, BRAND_FEELS } from "@shared/schema";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Check, Upload, X, ChevronRight, ChevronLeft,
  Image, Palette, Sparkles, Building2, Globe, MapPin,
  Briefcase, Users, Star, MessageSquare, ExternalLink
} from "lucide-react";

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Practice Info", icon: Building2, desc: "Basic details about your practice" },
  { id: 2, label: "Brand Identity", icon: Palette, desc: "Logo, icon, and colors" },
  { id: 3, label: "Feel & Voice", icon: Sparkles, desc: "How you want to sound and look" },
  { id: 4, label: "Review", icon: Check, desc: "Confirm and save" },
];

// ─── Color Presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: "Ocean", colors: ["#0066CC", "#00B4D8"] },
  { name: "Blush", colors: ["#C9706A", "#F4A261"] },
  { name: "Forest", colors: ["#2D6A4F", "#74C69D"] },
  { name: "Violet", colors: ["#7B2FBE", "#C77DFF"] },
  { name: "Slate", colors: ["#334155", "#64748B"] },
  { name: "Gold", colors: ["#92400E", "#D97706"] },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, "Practice name is required"),
  specialty: z.enum(SPECIALTIES),
  city: z.string().optional(),
  website: z.string().optional(),
});

const step2Schema = z.object({
  logoDataUrl: z.string().optional(),
  iconDataUrl: z.string().optional(),
  brandColor1: z.string().min(1, "Primary color is required"),
  brandColor2: z.string().min(1, "Secondary color is required"),
  brandColor3: z.string().optional(),
});

const step3Schema = z.object({
  brandFeel: z.string().min(1, "Please select a brand feel"),
  brandVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  uniqueSellingPoint: z.string().optional(),
  additionalNotes: z.string().optional(),
});

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type FormValues = z.infer<typeof fullSchema>;

// ─── Image Upload Component ───────────────────────────────────────────────────

function ImageUpload({
  label,
  hint,
  value,
  onChange,
  required,
  testId,
}: {
  label: string;
  hint: string;
  value?: string;
  onChange: (v: string) => void;
  required?: boolean;
  testId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm font-medium">{label}</span>
        {required
          ? <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">Required</span>
          : <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">Optional</span>}
      </div>
      <div
        className={cn(
          "relative border border-dashed rounded-xl transition-all duration-200 cursor-pointer group",
          value
            ? "border-primary/40 bg-primary/5"
            : "border-border/60 bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5"
        )}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        data-testid={testId}
      >
        {value ? (
          <div className="flex items-center gap-3 p-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
              <img src={value} alt="Uploaded" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Uploaded</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Click to replace</p>
            </div>
            <button
              type="button"
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-border/40 flex items-center justify-center group-hover:border-primary/30 transition-colors">
              <Upload size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="text-xs font-medium">Drop file or click to upload</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
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
    </div>
  );
}

// ─── Color Picker Row ─────────────────────────────────────────────────────────

function ColorPicker({
  label,
  required,
  value,
  onChange,
  testId,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm font-medium">{label}</span>
        {required
          ? <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">Required</span>
          : <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">Optional</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-11 h-11 rounded-xl border-2 border-white/10 cursor-pointer overflow-hidden shadow-sm hover:scale-105 transition-transform"
            style={{ backgroundColor: value || "#334155" }}
          >
            <input
              type="color"
              value={value || "#334155"}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid={testId}
            />
          </div>
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="font-mono text-sm w-32"
          maxLength={7}
        />
        {value && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: value }} />
            <span>{value}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feel Card ────────────────────────────────────────────────────────────────

const FEEL_DESCRIPTIONS: Record<string, string> = {
  "Luxury & Sophisticated": "Premium, aspirational tone. Think high-end spa or concierge medicine.",
  "Warm & Approachable": "Friendly and caring. Makes patients feel safe and welcome.",
  "Clinical & Trustworthy": "Professional and evidence-based. Emphasizes expertise and results.",
  "Fun & Energetic": "Playful and bold. Great for practices targeting a younger demographic.",
  "Minimalist & Modern": "Clean, sleek, no-fluff. Design-forward with concise messaging.",
  "Bold & Confident": "Direct, results-driven. Strong CTAs and transformation-focused.",
};

// ─── Step Components ──────────────────────────────────────────────────────────

function Step1({ form }: { form: any }) {
  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Building2 size={13} className="text-muted-foreground" /> Practice Name
            </FormLabel>
            <FormControl>
              <Input placeholder="Bright Smiles Orthodontics" {...field} data-testid="input-practice-name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="specialty"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Briefcase size={13} className="text-muted-foreground" /> Specialty
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-specialty">
                  <SelectValue placeholder="Choose specialty" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <MapPin size={13} className="text-muted-foreground" />
              City <span className="text-muted-foreground font-normal">(optional)</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="Los Angeles, CA" {...field} value={field.value ?? ""} data-testid="input-city" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Globe size={13} className="text-muted-foreground" />
              Website <span className="text-muted-foreground font-normal">(optional)</span>
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input placeholder="https://yourpractice.com" {...field} value={field.value ?? ""} data-testid="input-website" className="pr-8" />
                {field.value && (
                  <a
                    href={field.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function Step2({ form }: { form: any }) {
  const color1 = form.watch("brandColor1") || "";
  const color2 = form.watch("brandColor2") || "";
  const color3 = form.watch("brandColor3") || "";

  return (
    <div className="space-y-7">
      {/* Logo + Icon uploads */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="logoDataUrl"
          render={({ field }) => (
            <ImageUpload
              label="Practice Logo"
              hint="PNG, SVG, or JPG — full wordmark"
              value={field.value}
              onChange={field.onChange}
              required
              testId="upload-logo"
            />
          )}
        />
        <FormField
          control={form.control}
          name="iconDataUrl"
          render={({ field }) => (
            <ImageUpload
              label="Practice Icon"
              hint="Square icon or favicon mark"
              value={field.value}
              onChange={field.onChange}
              testId="upload-icon"
            />
          )}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Color presets */}
      <div>
        <p className="text-sm font-medium mb-3">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5 transition-all text-xs"
              onClick={() => {
                form.setValue("brandColor1", preset.colors[0]);
                form.setValue("brandColor2", preset.colors[1]);
              }}
            >
              <div className="flex gap-0.5">
                {preset.colors.map((c) => (
                  <div key={c} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-muted-foreground">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color pickers */}
      <div className="space-y-5">
        <FormField
          control={form.control}
          name="brandColor1"
          render={({ field }) => (
            <FormItem>
              <ColorPicker
                label="Primary Color"
                required
                value={field.value || ""}
                onChange={field.onChange}
                testId="color-primary"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brandColor2"
          render={({ field }) => (
            <FormItem>
              <ColorPicker
                label="Secondary Color"
                required
                value={field.value || ""}
                onChange={field.onChange}
                testId="color-secondary"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brandColor3"
          render={({ field }) => (
            <FormItem>
              <ColorPicker
                label="Accent Color"
                value={field.value || ""}
                onChange={field.onChange}
                testId="color-accent"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Optional third color — used for CTAs, highlights, or decorative elements.
              </p>
            </FormItem>
          )}
        />
      </div>

      {/* Live preview swatch */}
      {(color1 || color2) && (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="flex h-10">
            {color1 && <div className="flex-1" style={{ backgroundColor: color1 }} />}
            {color2 && <div className="flex-1" style={{ backgroundColor: color2 }} />}
            {color3 && <div className="flex-1" style={{ backgroundColor: color3 }} />}
          </div>
          <div className="flex px-3 py-2 bg-white/[0.02] gap-3">
            {[color1, color2, color3].filter(Boolean).map((c, i) => (
              <span key={i} className="text-[11px] font-mono text-muted-foreground">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step3({ form }: { form: any }) {
  const selectedFeel = form.watch("brandFeel");

  return (
    <div className="space-y-7">
      {/* Brand Feel */}
      <FormField
        control={form.control}
        name="brandFeel"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Star size={13} className="text-muted-foreground" /> Brand Feel
              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1">Required</span>
            </FormLabel>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {BRAND_FEELS.map((feel) => (
                <button
                  key={feel}
                  type="button"
                  className={cn(
                    "text-left p-3 rounded-xl border transition-all duration-150",
                    field.value === feel
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 bg-white/[0.02] text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-white/[0.04]"
                  )}
                  onClick={() => field.onChange(feel)}
                  data-testid={`feel-${feel.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}
                >
                  <p className="text-xs font-medium leading-tight">{feel}</p>
                  {field.value === feel && (
                    <p className="text-[10px] text-primary/80 mt-1 leading-snug">{FEEL_DESCRIPTIONS[feel]}</p>
                  )}
                </button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Brand Voice */}
      <FormField
        control={form.control}
        name="brandVoice"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <MessageSquare size={13} className="text-muted-foreground" />
              Brand Voice
              <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded ml-1">Optional</span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g., 'We speak like a trusted friend who happens to be an expert. Warm, knowledgeable, never condescending. We celebrate every patient milestone.'"
                className="resize-none text-sm"
                rows={3}
                {...field}
                value={field.value ?? ""}
                data-testid="input-brand-voice"
              />
            </FormControl>
            <p className="text-[11px] text-muted-foreground mt-1">
              Describe your practice's personality and communication style. The AI will match it.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Target Audience */}
      <FormField
        control={form.control}
        name="targetAudience"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Users size={13} className="text-muted-foreground" />
              Target Audience
              <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded ml-1">Optional</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Women 30–50, working professionals, new moms, teens and parents"
                {...field}
                value={field.value ?? ""}
                data-testid="input-target-audience"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Unique Selling Point */}
      <FormField
        control={form.control}
        name="uniqueSellingPoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-muted-foreground" />
              What Makes You Different
              <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded ml-1">Optional</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Same-day appointments, 20 years experience, newest laser technology in the region"
                {...field}
                value={field.value ?? ""}
                data-testid="input-usp"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Additional Notes */}
      <FormField
        control={form.control}
        name="additionalNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              <MessageSquare size={13} className="text-muted-foreground" />
              Anything Else for the AI
              <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded ml-1">Optional</span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g., 'Never use before/after language. Always include our financing offer. We prefer nature-inspired imagery.'"
                className="resize-none text-sm"
                rows={3}
                {...field}
                value={field.value ?? ""}
                data-testid="input-additional-notes"
              />
            </FormControl>
            <p className="text-[11px] text-muted-foreground mt-1">
              Rules, preferences, or anything the AI should always know about your practice.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function Step4Review({ values }: { values: FormValues }) {
  const sections = [
    {
      title: "Practice Info",
      items: [
        { label: "Name", value: values.name },
        { label: "Specialty", value: values.specialty },
        { label: "City", value: values.city || "—" },
        { label: "Website", value: values.website || "—" },
      ],
    },
    {
      title: "Brand Identity",
      items: [
        { label: "Logo", value: values.logoDataUrl ? "Uploaded" : "Not uploaded" },
        { label: "Icon", value: values.iconDataUrl ? "Uploaded" : "Not uploaded" },
        { label: "Primary Color", value: values.brandColor1 || "—", color: values.brandColor1 },
        { label: "Secondary Color", value: values.brandColor2 || "—", color: values.brandColor2 },
        { label: "Accent Color", value: values.brandColor3 || "—", color: values.brandColor3 },
      ],
    },
    {
      title: "Feel & Voice",
      items: [
        { label: "Brand Feel", value: values.brandFeel || "—" },
        { label: "Brand Voice", value: values.brandVoice || "—" },
        { label: "Target Audience", value: values.targetAudience || "—" },
        { label: "What Makes You Different", value: values.uniqueSellingPoint || "—" },
        { label: "Additional Notes", value: values.additionalNotes || "—" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Color swatch preview */}
      {(values.brandColor1 || values.brandColor2) && (
        <div className="rounded-xl border border-border/40 overflow-hidden mb-2">
          <div className="flex h-8">
            {values.brandColor1 && <div className="flex-1" style={{ backgroundColor: values.brandColor1 }} />}
            {values.brandColor2 && <div className="flex-1" style={{ backgroundColor: values.brandColor2 }} />}
            {values.brandColor3 && <div className="flex-1" style={{ backgroundColor: values.brandColor3 }} />}
          </div>
        </div>
      )}

      {/* Logo preview */}
      {values.logoDataUrl && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-border/40">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src={values.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-medium">Logo uploaded</p>
            {values.iconDataUrl && <p className="text-[11px] text-muted-foreground mt-0.5">Icon also uploaded</p>}
          </div>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.title} className="rounded-xl border border-border/40 overflow-hidden">
          <div className="px-4 py-2.5 bg-white/[0.03] border-b border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</p>
          </div>
          <div className="divide-y divide-border/30">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-[11px] text-muted-foreground w-36 flex-shrink-0 pt-0.5">{item.label}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {(item as any).color && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: (item as any).color }}
                    />
                  )}
                  <span className="text-xs text-foreground break-words">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
        <Sparkles size={15} className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-primary">AI is ready to create brand-matched content</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Every piece of content you generate will be tailored to match your practice's identity, voice, and colors.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PracticeSetup() {
  const [, navigate] = useHashLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const { data: practice } = useQuery({ queryKey: ["/api/practice"] });

  const form = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      name: "",
      specialty: "Dentist",
      city: "",
      website: "",
      logoDataUrl: "",
      iconDataUrl: "",
      brandColor1: "",
      brandColor2: "",
      brandColor3: "",
      brandFeel: "",
      brandVoice: "",
      targetAudience: "",
      uniqueSellingPoint: "",
      additionalNotes: "",
    },
  });

  // Pre-fill from existing practice if editing
  useEffect(() => {
    if (practice) {
      const p = practice as any;
      form.reset({
        name: p.name || "",
        specialty: p.specialty || "Dentist",
        city: p.city || "",
        website: p.website || "",
        logoDataUrl: p.logoDataUrl || "",
        iconDataUrl: p.iconDataUrl || "",
        brandColor1: p.brandColor1 || "",
        brandColor2: p.brandColor2 || "",
        brandColor3: p.brandColor3 || "",
        brandFeel: p.brandFeel || "",
        brandVoice: p.brandVoice || "",
        targetAudience: p.targetAudience || "",
        uniqueSellingPoint: p.uniqueSellingPoint || "",
        additionalNotes: p.additionalNotes || "",
      });
    }
  }, [practice]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiRequest("POST", "/api/practice", { ...data, onboardingComplete: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/practice"] });
      toast({ title: "Practice profile saved", description: "Your brand identity is ready. The AI will now generate content matched to your practice." });
      navigate("/app");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Step-level validation before advancing
  async function handleNext() {
    let fields: (keyof FormValues)[] = [];
    if (step === 1) fields = ["name", "specialty"];
    if (step === 2) fields = ["brandColor1", "brandColor2"];
    if (step === 3) fields = ["brandFeel"];

    const valid = await form.trigger(fields);
    if (valid) setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  const values = form.watch();
  const isEditing = !!(practice as any)?.id;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold">
            {isEditing ? "Edit Practice Profile" : "Set Up Your Practice"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your brand identity trains the AI to create content that looks and sounds like you.
          </p>
        </div>

        {/* Step progress bar */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isComplete = step > s.id;
            const isCurrent = step === s.id;

            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => isComplete && setStep(s.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 group flex-shrink-0",
                    isComplete ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                    isComplete ? "border-primary bg-primary text-primary-foreground" :
                    isCurrent ? "border-primary bg-primary/10 text-primary" :
                    "border-border/50 bg-background text-muted-foreground"
                  )}>
                    {isComplete ? <Check size={14} /> : <Icon size={14} />}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium whitespace-nowrap hidden sm:block",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </button>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-px mx-2 transition-colors duration-300 mb-3",
                    step > s.id ? "bg-primary" : "bg-border/50"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
          {/* Card header */}
          <div className="px-6 pt-6 pb-5 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              {(() => {
                const Icon = STEPS[step - 1].icon;
                return <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon size={15} className="text-primary" />
                </div>;
              })()}
              <div>
                <h2 className="text-sm font-semibold">{STEPS[step - 1].label}</h2>
                <p className="text-[11px] text-muted-foreground">{STEPS[step - 1].desc}</p>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                Step {step} of {STEPS.length}
              </div>
            </div>
          </div>

          {/* Card body */}
          <div className="px-6 py-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
                {step === 1 && <Step1 form={form} />}
                {step === 2 && <Step2 form={form} />}
                {step === 3 && <Step3 form={form} />}
                {step === 4 && <Step4Review values={values} />}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-5 border-t border-border/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={step === 1 ? () => navigate("/app") : handleBack}
                    className="gap-1.5"
                    data-testid="btn-back"
                  >
                    <ChevronLeft size={14} />
                    {step === 1 ? "Cancel" : "Back"}
                  </Button>

                  {step < 4 ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNext}
                      className="gap-1.5"
                      data-testid="btn-next"
                    >
                      Continue
                      <ChevronRight size={14} />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={mutation.isPending}
                      className="gap-1.5 glow-primary"
                      data-testid="btn-save-practice"
                    >
                      {mutation.isPending ? (
                        <>
                          <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          Save & Start Creating
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* Skip hint on step 1 if not already set up */}
        {step === 1 && !isEditing && (
          <p className="text-center text-[11px] text-muted-foreground mt-4">
            You can always update this later from the sidebar settings.
          </p>
        )}
      </div>
    </AppShell>
  );
}
