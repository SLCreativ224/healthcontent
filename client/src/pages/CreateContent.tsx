import { useState, useEffect } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import type { ContentItem } from "@shared/schema";
import { SPECIALTIES, CONTENT_TYPES, CONTENT_GOALS, CONTENT_TONES } from "@shared/schema";

function Chip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
        selected
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
      }`}
    >
      {label}
    </button>
  );
}

export default function CreateContent() {
  const [, navigate] = useHashLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [specialty, setSpecialty] = useState<string>("");
  const [contentType, setContentType] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [customIdea, setCustomIdea] = useState<string>("");

  // Pre-fill from seasonal suggestion via URL param
  useEffect(() => {
    const hash = window.location.hash;
    const queryStr = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(queryStr);
    const idea = params.get("idea");
    if (idea) setCustomIdea(decodeURIComponent(idea));
  }, []);

  const { data: practice } = useQuery({ queryKey: ["/api/practice"] });
  const effectiveSpecialty = specialty || (practice as any)?.specialty || "";

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/ai/generate", {
        specialty: effectiveSpecialty,
        contentType,
        goal,
        tone,
        customIdea: customIdea || undefined,
      }),
    onSuccess: (item: ContentItem) => {
      qc.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Content generated" });
      navigate(`/app/content/${item.id}`);
    },
    onError: (err: any) =>
      toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
  });

  const steps = [
    { id: "specialty", label: "Specialty", done: !!effectiveSpecialty },
    { id: "type",      label: "Content type", done: !!contentType },
    { id: "goal",      label: "Goal", done: !!goal },
    { id: "tone",      label: "Tone", done: !!tone },
  ];
  const stepsComplete = steps.filter((s) => s.done).length;
  const isReady = stepsComplete === 4;

  return (
    <AppShell>
      <div className="max-w-xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            AI Generator
          </p>
          <h1 className="text-xl font-semibold">Create Content</h1>
        </div>

        {mutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Generating your content</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI is writing your caption, hashtags, and image prompt...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-7">

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stepsComplete} of 4 configured</span>
                {isReady && <span className="text-xs text-primary font-medium">Ready to generate</span>}
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(stepsComplete / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Specialty */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Specialty
              </Label>
              <Select value={effectiveSpecialty} onValueChange={setSpecialty}>
                <SelectTrigger className="bg-card border-border h-10" data-testid="select-specialty">
                  <SelectValue placeholder="Select your specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Content Type */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Content type
              </Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((t) => (
                  <Chip key={t} label={t} selected={contentType === t} onClick={() => setContentType(t)} />
                ))}
              </div>
            </div>

            {/* Goal */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Goal
              </Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_GOALS.map((g) => (
                  <Chip key={g} label={g} selected={goal === g} onClick={() => setGoal(g)} />
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Tone
              </Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TONES.map((t) => (
                  <Chip key={t} label={t} selected={tone === t} onClick={() => setTone(t)} />
                ))}
              </div>
            </div>

            {/* Seasonal idea banner */}
            {customIdea && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5">
                <Sparkles size={13} className="text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary mb-0.5">Seasonal idea pre-filled</p>
                  <p className="text-xs text-muted-foreground leading-snug">{customIdea}</p>
                </div>
                <button onClick={() => setCustomIdea("")} className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0">✕</button>
              </div>
            )}

            {/* Generate button */}
            <Button
              className="w-full h-11 font-medium gap-2 mt-2"
              disabled={!isReady}
              onClick={() => mutation.mutate()}
              data-testid="btn-generate"
            >
              <Sparkles size={15} />
              Generate with AI
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
