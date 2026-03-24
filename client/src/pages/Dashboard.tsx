import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import {
  Sparkles, ArrowRight, BookOpen, FolderOpen,
  CalendarDays, Settings, ChevronRight, SplitSquareHorizontal,
  CheckCircle2, Circle, ChevronDown, ChevronUp
} from "lucide-react";
import type { ContentItem, Practice, Campaign } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import SeasonalSuggestions from "@/components/SeasonalSuggestions";

const TYPE_DOT: Record<string, string> = {
  "Instagram Post":     "bg-pink-400",
  "Facebook Post":      "bg-blue-400",
  "TikTok/Reel Script": "bg-violet-400",
};

export default function Dashboard() {
  const [, navigate] = useHashLocation();
  const { user } = useAuth();
  const [checklistOpen, setChecklistOpen] = useState(true);

  const { data: practice } = useQuery<Practice>({ queryKey: ["/api/practice"] });
  const { data: content = [] } = useQuery<ContentItem[]>({ queryKey: ["/api/content"] });
  const { data: campaigns = [] } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const { data: baItems = [] } = useQuery<any[]>({ queryKey: ["/api/before-after"] });

  const recent = content.slice(0, 5);
  const scheduled = content.filter((c) => c.scheduledDate).length;

  // Onboarding checklist steps
  const checks = [
    {
      id: "practice",
      label: "Set up your practice profile",
      done: !!practice?.onboardingComplete,
      action: () => navigate("/app/setup"),
      actionLabel: "Set up",
    },
    {
      id: "content",
      label: "Generate your first AI post",
      done: content.length > 0,
      action: () => navigate("/app/create"),
      actionLabel: "Create",
    },
    {
      id: "ba",
      label: "Create a Before & After post",
      done: baItems.length > 0,
      action: () => navigate("/app/before-after"),
      actionLabel: "Try it",
    },
    {
      id: "campaign",
      label: "Start a campaign",
      done: campaigns.length > 0,
      action: () => navigate("/app/campaigns"),
      actionLabel: "Create",
    },
    {
      id: "schedule",
      label: "Schedule a post on the calendar",
      done: scheduled > 0,
      action: () => navigate("/app/calendar"),
      actionLabel: "Go",
    },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  const allDone = doneCount === checks.length;

  return (
    <AppShell>
      <div className="max-w-4xl space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            {practice ? (
              <>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                  {practice.specialty}{practice.city ? ` · ${practice.city}` : ""}
                </p>
                <h1 className="text-xl font-semibold">{practice.name}</h1>
              </>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                  Getting started
                </p>
                <h1 className="text-xl font-semibold">Welcome to HealthContent</h1>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/setup")}
            className="text-xs gap-1.5 h-8"
            data-testid="btn-practice-settings"
          >
            <Settings size={12} />
            Practice
          </Button>
        </div>

        {/* ── Onboarding checklist ── */}
        {!allDone && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              onClick={() => setChecklistOpen((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                  <svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                    <circle
                      cx="16" cy="16" r="13" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="2.5"
                      strokeDasharray={`${(doneCount / checks.length) * 81.7} 81.7`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary">
                    {doneCount}/{checks.length}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Getting started</p>
                  <p className="text-xs text-muted-foreground">{checks.length - doneCount} step{checks.length - doneCount !== 1 ? "s" : ""} remaining</p>
                </div>
              </div>
              {checklistOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </button>

            {checklistOpen && (
              <div className="border-t border-border divide-y divide-border/50">
                {checks.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 px-5 py-3 ${step.done ? "opacity-50" : ""}`}
                  >
                    {step.done ? (
                      <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                    ) : (
                      <Circle size={16} className="text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <p className={`text-sm flex-1 ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {step.label}
                    </p>
                    {!step.done && (
                      <button
                        onClick={step.action}
                        className="text-xs text-primary hover:text-primary/80 font-medium flex-shrink-0 transition-colors"
                      >
                        {step.actionLabel} →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Hero action ── */}
        <div
          className="relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer group"
          onClick={() => navigate("/app/create")}
          data-testid="hero-create"
        >
          <div className="absolute inset-0 bg-grid opacity-[0.3]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />
          <div className="relative p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles size={14} className="text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">AI Generator</span>
              </div>
              <p className="text-lg font-semibold mb-1">Create new content</p>
              <p className="text-sm text-muted-foreground">Generate a caption, hashtags, and image prompt in seconds.</p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/15 group-hover:bg-primary/25 border border-primary/20 flex items-center justify-center transition-all">
                <ArrowRight size={16} className="text-primary group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Before & After quick-access ── */}
        <div
          className="relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer group"
          onClick={() => navigate("/app/before-after")}
          data-testid="hero-before-after"
        >
          <div className="absolute top-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/3 -translate-y-1/3" />
          <div className="relative p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <SplitSquareHorizontal size={16} className="text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Before & After Generator</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create branded transformation posts with AI captions.
                  {baItems.length > 0 && (
                    <span className="ml-2 text-violet-400 font-medium">{baItems.length} saved</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              {baItems.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/app/before-after/library"); }}
                  className="text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  View library
                </button>
              )}
              <div className="w-8 h-8 rounded-full bg-violet-500/10 group-hover:bg-violet-500/20 border border-violet-500/20 flex items-center justify-center transition-all">
                <ArrowRight size={14} className="text-violet-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Content items", value: content.length, icon: BookOpen, href: "/app/library", color: "text-violet-400" },
            { label: "Campaigns", value: campaigns.length, icon: FolderOpen, href: "/app/campaigns", color: "text-blue-400" },
            { label: "Scheduled", value: scheduled, icon: CalendarDays, href: "/app/calendar", color: "text-emerald-400" },
            { label: "Before & Afters", value: baItems.length, icon: SplitSquareHorizontal, href: "/app/before-after/library", color: "text-violet-400" },
          ].map(({ label, value, icon: Icon, href, color }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className="text-left p-4 rounded-xl border border-border bg-card hover:border-border/80 hover:bg-card/80 transition-all group"
              data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon size={14} className={`${color} mb-3 opacity-80`} />
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">{label}</p>
            </button>
          ))}
        </div>

        {/* ── Seasonal suggestions ── */}
        <SeasonalSuggestions specialty={practice?.specialty} />

        {/* ── Recent content ── */}
        {recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent content</p>
              <button
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={() => navigate("/app/library")}
              >
                View all <ChevronRight size={12} />
              </button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {recent.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/app/content/${item.id}`)}
                  className="w-full text-left px-4 py-3 bg-card hover:bg-white/[0.03] transition-colors flex items-center gap-3 group"
                  data-testid={`recent-item-${item.id}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TYPE_DOT[item.contentType] ?? "bg-muted"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.caption.slice(0, 80)}...</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                    {item.scheduledDate && (
                      <p className="text-[10px] text-emerald-400 mt-0.5">{item.scheduledDate}</p>
                    )}
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {content.length === 0 && practice && (
          <div className="rounded-xl border border-dashed border-border p-8">
            <div className="flex flex-col items-center text-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Sparkles size={20} className="text-primary/70" />
              </div>
              <p className="text-sm font-semibold mb-1">No content yet</p>
              <p className="text-xs text-muted-foreground mb-5">
                Generate your first AI post — pick a platform, topic, and tone. Takes about 10 seconds.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => navigate("/app/create")} className="gap-1.5 h-8 text-xs">
                  <Sparkles size={12} /> Create content
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/app/before-after")} className="gap-1.5 h-8 text-xs">
                  <SplitSquareHorizontal size={12} /> Before & After
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
