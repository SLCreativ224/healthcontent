import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Video, Clapperboard, Target, Clock, Copy,
  Save, Sparkles, Play, TrendingUp, BookOpen, ChevronRight,
  Music2, Zap
} from "lucide-react";
import type { Practice } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoScript {
  hook: string;
  shots: Shot[];
  cta: string;
  caption: string;
  hashtags: string;
  audioSuggestion: string;
  duration: string;
}

interface Shot {
  number: number;
  timing: string;
  visual: string;
  script: string;
  type: "hook" | "content" | "testimonial" | "cta" | "transition";
}

interface SavedScript {
  id: string;
  platform: string;
  goal: string;
  title: string;
  script: VideoScript;
  createdAt: Date;
}

const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts", "Facebook Reels"] as const;
const VIDEO_GOALS = [
  "Patient Education",
  "Treatment Showcase",
  "Before & After Reveal",
  "Day-in-the-Life",
  "FAQ / Myth-Busting",
  "Meet the Team",
  "Seasonal Promotion",
  "Patient Testimonial",
  "Product Highlight",
  "Behind the Scenes",
] as const;

const DURATIONS = ["15 seconds", "30 seconds", "60 seconds", "90 seconds"] as const;
const TONES = ["Energetic & Fun", "Warm & Authentic", "Professional & Trustworthy", "Luxury & Aspirational"] as const;

// ─── Mock AI Script Generator ─────────────────────────────────────────────────

function generateMockScript(platform: string, goal: string, duration: string, tone: string, topic: string): VideoScript {
  const shotCount = duration === "15 seconds" ? 4 : duration === "30 seconds" ? 6 : duration === "60 seconds" ? 9 : 12;
  const secPerShot = Math.round(parseInt(duration) / shotCount);

  const hooks: Record<string, string> = {
    "Patient Education": `POV: You've been putting off this appointment for months — here's why you should stop. 👀`,
    "Treatment Showcase": `Wait until you see what this treatment can actually do... ✨`,
    "Before & After Reveal": `She said she felt like a completely different person. And honestly? Look at these results. 😭`,
    "Day-in-the-Life": `This is what a day at our practice actually looks like — no filter, no script. 🏥`,
    "FAQ / Myth-Busting": `"It's going to hurt." "It's too expensive." Let me debunk the top 3 myths we hear every single week. 🚫`,
    "Meet the Team": `The people behind your smile transformation — meet our team. ❤️`,
    "Seasonal Promotion": `Our ${new Date().toLocaleString("default", { month: "long" })} special is here and it's the one you've been waiting for. 🎉`,
    "Patient Testimonial": `She came in nervous. She left in tears — the good kind. 💜`,
    "Product Highlight": `This is the treatment everyone's been asking about. Here's everything you need to know. 📋`,
    "Behind the Scenes": `Ever wonder what happens before you sit in the chair? Here's your exclusive behind-the-scenes look. 🎬`,
  };

  const shotTemplates = [
    { type: "hook" as const, visual: "Close-up of practitioner looking directly at camera, confident and warm expression", script: hooks[goal] || `You're going to want to see this. ${topic || ""} ✨` },
    { type: "content" as const, visual: "B-roll of modern, clean office environment — bright lighting, premium equipment visible", script: `We use the latest technology to make sure every visit is comfortable and effective.` },
    { type: "content" as const, visual: "Hands-on treatment shot (face or equipment in frame, patient comfortable, no identifiable features)", script: `This ${topic || "treatment"} takes less than an hour and the results speak for themselves.` },
    { type: "testimonial" as const, visual: "Text overlay on clean background: patient quote in large, bold typography", script: `"I wish I had done this sooner" — that's what we hear most.` },
    { type: "content" as const, visual: "Split-screen or side-by-side: consultation → treatment → result", script: `From your first consultation to your final result, we're with you every step.` },
    { type: "content" as const, visual: "Practitioner explaining something to camera — educational, approachable pose", script: `Here's the thing they don't tell you: the procedure is much simpler than it sounds.` },
    { type: "content" as const, visual: "Products or equipment showcase on a clean, well-lit surface", script: `We only use premium, proven techniques backed by years of clinical results.` },
    { type: "content" as const, visual: "Happy patient (silhouette or from behind to protect identity) in a bright, airy space", script: `Every patient's journey is different — and that's exactly how we treat it.` },
    { type: "testimonial" as const, visual: "Before/after text cards with branded colors and minimal design", script: `Results like these don't happen by accident. They happen with the right team.` },
    { type: "cta" as const, visual: "Practitioner to camera, warm direct eye contact — personal and trustworthy", script: `Ready to start your journey? The link in our bio gets you to our booking page in under 30 seconds.` },
    { type: "cta" as const, visual: "Logo + contact info + branded CTA card", script: `Click the link, pick a time, and let's get started. 📲` },
    { type: "cta" as const, visual: "Full-screen branded end card with CTA button overlay", script: `Follow us for more tips — and book your free consultation today!` },
  ];

  const shots: Shot[] = Array.from({ length: shotCount }, (_, i) => {
    const template = shotTemplates[i % shotTemplates.length];
    return {
      number: i + 1,
      timing: `0:${String(i * secPerShot).padStart(2, "0")}–0:${String((i + 1) * secPerShot).padStart(2, "0")}`,
      visual: template.visual,
      script: template.script,
      type: template.type,
    };
  });

  const audioMap: Record<string, string> = {
    "Energetic & Fun": "Trending upbeat pop or viral audio — check TikTok trending sounds. High energy, fast cuts.",
    "Warm & Authentic": "Soft acoustic or lo-fi background music. Let the voiceover carry the emotion.",
    "Professional & Trustworthy": "Calm, minimal background music (no lyrics). Clear, confident voiceover.",
    "Luxury & Aspirational": "Cinematic, minimal score. Slow zooms, breathe between cuts.",
  };

  return {
    hook: shots[0].script,
    shots,
    cta: `Book your free consultation today — link in bio! DM us "READY" for a direct link. 💬`,
    caption: `${hooks[goal] || "Discover what's possible."}\n\nWe specialize in helping you feel your most confident self. Whether you're just starting to explore your options or you're ready to book — we're here for every step of that journey.\n\n✨ Drop a 💜 if this is the sign you needed.\n📲 Book link in bio.`,
    hashtags: `#${platform.replace(/\s/g, "")}`,
    audioSuggestion: audioMap[tone] || "Trending audio from your platform's Explore/Discover page.",
    duration,
  };
}

// ─── Shot Card ────────────────────────────────────────────────────────────────

function ShotCard({ shot }: { shot: Shot }) {
  const typeColors: Record<Shot["type"], string> = {
    hook: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    content: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    testimonial: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    cta: "bg-green-500/15 text-green-400 border-green-500/30",
    transition: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };

  return (
    <div className="rounded-lg border border-border/60 p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">{shot.number}</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{shot.timing}</span>
        </div>
        <Badge className={`text-[10px] capitalize border ${typeColors[shot.type]}`}>
          {shot.type}
        </Badge>
      </div>
      <p className="text-sm font-medium mb-2 leading-snug">{shot.script}</p>
      <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
        <Video size={11} className="mt-0.5 shrink-0" />
        {shot.visual}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VideoReels() {
  const { toast } = useToast();

  const { data: practice } = useQuery<Practice | null>({ queryKey: ["/api/practice"] });

  const [platform, setPlatform] = useState<string>("TikTok");
  const [goal, setGoal] = useState<string>("");
  const [duration, setDuration] = useState<string>("30 seconds");
  const [tone, setTone] = useState<string>("Warm & Authentic");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScript, setCurrentScript] = useState<VideoScript | null>(null);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [activeTab, setActiveTab] = useState<"generate" | "library">("generate");

  async function handleGenerate() {
    if (!goal) return;
    setIsGenerating(true);
    // Simulate AI generation delay
    await new Promise((r) => setTimeout(r, 1800));
    const script = generateMockScript(platform, goal, duration, tone, topic);
    // Merge hashtags with real ones
    script.hashtags = [
      `#${platform.replace(/\s/g, "")}`,
      `#${goal.replace(/\s+&?\s*/g, "")}`,
      `#${(practice?.specialty || "Healthcare").replace(/\s/g, "")}`,
      "#HealthcareMarketing",
      "#MedSpaLife",
      "#BeforeAndAfter",
      "#PatientCare",
      "#HealthyConfidence",
      "#Aesthetic",
      "#SocialMediaHealth",
    ].join(",");
    setCurrentScript(script);
    setIsGenerating(false);
  }

  function handleSave() {
    if (!currentScript || !goal) return;
    const saved: SavedScript = {
      id: `script_${Date.now()}`,
      platform,
      goal,
      title: `${platform} — ${goal} (${duration})`,
      script: currentScript,
      createdAt: new Date(),
    };
    setSavedScripts((prev) => [saved, ...prev]);
    toast({ title: "Script saved", description: "Added to your video library." });
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied`, description: "Pasted to clipboard." });
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <Clapperboard size={18} className="text-primary" />
              Video & Reels
            </h1>
            <p className="text-sm text-muted-foreground">
              Generate shot-by-shot scripts for TikTok, Instagram Reels, and YouTube Shorts.
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setActiveTab("generate")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === "generate"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-generate"
            >
              Generate
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "library"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-library"
            >
              Library
              {savedScripts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                  {savedScripts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Left — Form */}
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Script Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Platform</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPlatform(p)}
                          data-testid={`btn-platform-${p.toLowerCase().replace(/\s/g, "-")}`}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                            platform === p
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Content Goal <span className="text-red-400 text-xs">*</span></Label>
                    <Select value={goal} onValueChange={setGoal}>
                      <SelectTrigger data-testid="select-video-goal">
                        <SelectValue placeholder="What's the video about?" />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_GOALS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger data-testid="select-video-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Video Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger data-testid="select-video-tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Specific Topic <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      placeholder="e.g. Invisalign vs braces, LED teeth whitening"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      data-testid="input-video-topic"
                    />
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={handleGenerate}
                    disabled={isGenerating || !goal}
                    data-testid="btn-generate-script"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Writing script...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Generate Script
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="border-border/40">
                <CardContent className="pt-4 space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Pro Tips
                  </p>
                  {[
                    { icon: TrendingUp, text: "Hook viewers in the first 1-2 seconds — use a question or bold statement." },
                    { icon: Clock, text: `${platform === "TikTok" ? "15–30" : platform === "YouTube Shorts" ? "45–60" : "15–30"}s videos perform best for ${platform}.` },
                    { icon: Music2, text: "Always pair with trending audio — it's the biggest reach driver." },
                    { icon: Target, text: "End with ONE clear CTA. \"Book now\", \"Link in bio\", or \"DM us\"." },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <Icon size={12} className="mt-0.5 text-primary/60 shrink-0" />
                      {text}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right — Output */}
            <div className="space-y-5">
              {!currentScript && !isGenerating && (
                <div className="rounded-xl border border-dashed border-border/50 p-16 text-center">
                  <Clapperboard size={32} className="text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">No script yet</p>
                  <p className="text-xs text-muted-foreground/70">
                    Fill in the settings and click Generate Script to get a shot-by-shot breakdown.
                  </p>
                </div>
              )}

              {isGenerating && (
                <div className="rounded-xl border border-border/50 p-16 text-center">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm font-medium">Writing your script...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crafting hooks, shots, and CTAs for {platform}
                  </p>
                </div>
              )}

              {currentScript && !isGenerating && (
                <div className="space-y-5">
                  {/* Script header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                        <Play size={10} /> {platform}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock size={10} className="mr-1" /> {currentScript.duration}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSave}
                        data-testid="btn-save-script"
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Save size={12} /> Save
                      </Button>
                    </div>
                  </div>

                  {/* Hook */}
                  <Card className="border-amber-500/20 bg-amber-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                        <Zap size={11} /> Opening Hook
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium leading-relaxed">{currentScript.hook}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(currentScript.hook, "Hook")}
                        data-testid="btn-copy-hook"
                        className="mt-2 h-7 text-xs gap-1 text-muted-foreground"
                      >
                        <Copy size={11} /> Copy
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Shot list */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Clapperboard size={11} /> Shot Breakdown ({currentScript.shots.length} shots)
                    </p>
                    <div className="space-y-2">
                      {currentScript.shots.map((shot) => (
                        <ShotCard key={shot.number} shot={shot} />
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold text-green-400 flex items-center gap-2 uppercase tracking-wider">
                        <Target size={11} /> Call to Action
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{currentScript.cta}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(currentScript.cta, "CTA")}
                        data-testid="btn-copy-cta"
                        className="mt-2 h-7 text-xs gap-1 text-muted-foreground"
                      >
                        <Copy size={11} /> Copy
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Caption + Hashtags */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Post Caption & Hashtags
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm whitespace-pre-line leading-relaxed">{currentScript.caption}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(currentScript.caption, "Caption")}
                          data-testid="btn-copy-caption"
                          className="mt-2 h-7 text-xs gap-1 text-muted-foreground"
                        >
                          <Copy size={11} /> Copy Caption
                        </Button>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hashtags</p>
                        <p className="text-xs text-primary/80 leading-relaxed">
                          {currentScript.hashtags.split(",").join(" ")}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(currentScript.hashtags.split(",").join(" "), "Hashtags")}
                          data-testid="btn-copy-hashtags"
                          className="mt-1 h-7 text-xs gap-1 text-muted-foreground"
                        >
                          <Copy size={11} /> Copy Hashtags
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Audio */}
                  <Card className="border-border/40">
                    <CardContent className="pt-4 flex items-start gap-3">
                      <Music2 size={16} className="text-primary/60 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold mb-1">Audio Recommendation</p>
                        <p className="text-sm text-muted-foreground">{currentScript.audioSuggestion}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Library tab */}
        {activeTab === "library" && (
          <div className="space-y-4">
            {savedScripts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 p-16 text-center">
                <BookOpen size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">No saved scripts</p>
                <p className="text-xs text-muted-foreground/70">
                  Generate a script and click Save to add it here.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveTab("generate")}
                >
                  Generate Script
                </Button>
              </div>
            ) : (
              savedScripts.map((s) => (
                <Card key={s.id} className="hover:border-border transition-colors cursor-pointer group">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 text-[10px]">
                            <Play size={9} /> {s.platform}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {s.script.duration}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.script.hook}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {s.createdAt.toLocaleDateString()}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPlatform(s.platform);
                            setGoal(s.goal);
                            setCurrentScript(s.script);
                            setActiveTab("generate");
                          }}
                          data-testid={`btn-load-script-${s.id}`}
                          className="h-7 text-xs gap-1"
                        >
                          Open <ChevronRight size={11} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}


