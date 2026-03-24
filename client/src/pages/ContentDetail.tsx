import { useState } from "react";
import { useParams } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Save, Trash2, ArrowLeft, Image as ImageIcon, Hash,
  Calendar, Copy, Check, Instagram, Facebook, Eye
} from "lucide-react";
import type { ContentItem, Campaign } from "@shared/schema";

// ─── Social Post Preview ───────────────────────────────────────────────────────

function InstagramPreview({
  caption, hashtags, practiceName, logoUrl,
}: {
  caption: string; hashtags: string; practiceName: string; logoUrl?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-[#0d0d0f] overflow-hidden max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-400 flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-[10px] font-bold">{practiceName.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-white leading-tight">{practiceName || "Your Practice"}</p>
          <p className="text-[10px] text-white/40">Sponsored</p>
        </div>
        <div className="ml-auto">
          <div className="w-1 h-1 rounded-full bg-white/30 inline-block mx-0.5" />
          <div className="w-1 h-1 rounded-full bg-white/30 inline-block mx-0.5" />
          <div className="w-1 h-1 rounded-full bg-white/30 inline-block mx-0.5" />
        </div>
      </div>

      {/* Photo placeholder */}
      <div className="bg-gradient-to-br from-primary/20 to-violet-600/20 flex items-center justify-center" style={{ aspectRatio: "1/1" }}>
        <div className="text-center">
          <ImageIcon size={28} className="text-white/20 mx-auto mb-2" />
          <p className="text-[10px] text-white/30">Your image here</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3.5 py-2 flex gap-3.5">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/60 fill-none stroke-current" strokeWidth={1.8}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/60 fill-none stroke-current" strokeWidth={1.8}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/60 fill-none stroke-current" strokeWidth={1.8}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/60 fill-none stroke-current ml-auto" strokeWidth={1.8}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
      </div>

      {/* Caption */}
      <div className="px-3.5 pb-4 space-y-1.5">
        <p className="text-xs text-white/90 leading-relaxed line-clamp-4">
          <span className="font-semibold">{practiceName || "yourpractice"} </span>
          {caption}
        </p>
        {hashtags && (
          <p className="text-[11px] text-primary/80 leading-relaxed line-clamp-2">
            {hashtags.split(",").filter(Boolean).map((h) => h.trim()).join(" ")}
          </p>
        )}
        <p className="text-[10px] text-white/30 pt-0.5">View all comments</p>
      </div>
    </div>
  );
}

function FacebookPreview({
  caption, hashtags, practiceName, logoUrl,
}: {
  caption: string; hashtags: string; practiceName: string; logoUrl?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-[#0d0d0f] overflow-hidden max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-[11px] font-bold">{practiceName.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-white leading-tight">{practiceName || "Your Practice"}</p>
          <p className="text-[10px] text-white/40">Just now · 🌐</p>
        </div>
        <div className="ml-auto text-white/40 text-base leading-none">···</div>
      </div>

      {/* Caption */}
      <div className="px-4 py-3">
        <p className="text-xs text-white/90 leading-relaxed line-clamp-5">
          {caption}
        </p>
        {hashtags && (
          <p className="text-[11px] text-blue-400/80 mt-1.5 line-clamp-2">
            {hashtags.split(",").filter(Boolean).map((h) => h.trim()).join(" ")}
          </p>
        )}
      </div>

      {/* Photo placeholder */}
      <div className="bg-gradient-to-br from-blue-500/10 to-primary/10 flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
        <div className="text-center">
          <ImageIcon size={24} className="text-white/20 mx-auto mb-1.5" />
          <p className="text-[10px] text-white/30">Your image here</p>
        </div>
      </div>

      {/* Reactions bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-t border-white/5 text-[11px] text-white/30">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentDetail() {
  const { id } = useParams();
  const [, navigate] = useHashLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: item, isLoading } = useQuery<ContentItem>({ queryKey: ["/api/content", id] });
  const { data: campaigns = [] } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const { data: practice } = useQuery<any>({ queryKey: ["/api/practice"] });

  const [caption, setCaption] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [improveInstructions, setImproveInstructions] = useState("");
  const [copied, setCopied] = useState<"caption" | "hashtags" | "image-prompt" | null>(null);

  // Use local state if edited, else use fetched data
  const displayCaption = caption ?? item?.caption ?? "";
  const displayHashtags = hashtags ?? item?.hashtags ?? "";
  const displayDate = scheduledDate ?? item?.scheduledDate ?? "";
  const displayCampaignId = campaignId ?? String(item?.campaignId ?? "");

  async function copyToClipboard(type: "caption" | "hashtags" | "image-prompt") {
    const text = type === "caption"
      ? displayCaption
      : type === "hashtags"
      ? displayHashtags
      : item?.imagePrompt ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-HTTPS
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/content/${id}`, {
        caption: displayCaption,
        hashtags: displayHashtags,
        scheduledDate: displayDate || null,
        campaignId: displayCampaignId && displayCampaignId !== "none" ? Number(displayCampaignId) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/content", id] });
      qc.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Saved", description: "Your changes have been saved." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const improveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/ai/improve/${id}`, { instructions: improveInstructions }),
    onSuccess: (updated: ContentItem) => {
      setCaption(updated.caption);
      setImproving(false);
      qc.invalidateQueries({ queryKey: ["/api/content", id] });
      toast({ title: "Caption improved!", description: "AI has refined your caption." });
    },
    onError: (err: any) => {
      setImproving(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/content/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/content"] });
      navigate("/app/library");
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!item) return <AppShell><p className="text-muted-foreground">Content not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/app/library")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="btn-back"
          >
            <ArrowLeft size={14} />
            Library
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="btn-delete"
            >
              <Trash2 size={14} />
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="btn-save"
            >
              <Save size={14} className="mr-1.5" />
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>

        {/* Title + meta */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-2">{item.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            {[item.specialty, item.contentType, item.goal, item.tone].map((val) => (
              <Badge key={val} variant="secondary" className="text-xs">{val}</Badge>
            ))}
          </div>
        </div>

        {/* Tabs: Edit vs Preview */}
        <Tabs defaultValue="edit" className="mb-8">
          <TabsList className="mb-5 h-9">
            <TabsTrigger value="edit" className="gap-1.5 text-xs">
              Edit Content
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 text-xs">
              <Eye size={12} />
              Social Preview
            </TabsTrigger>
          </TabsList>

          {/* ── Edit tab ── */}
          <TabsContent value="edit" className="space-y-5 mt-0">

            {/* Caption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Caption / Script</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard("caption")}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="btn-copy-caption"
                  >
                    {copied === "caption" ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                    {copied === "caption" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Improve with AI panel */}
              <div className={`rounded-xl border bg-card/30 overflow-hidden transition-all ${improving ? "border-primary/30" : "border-border/50"}`}>
                <Textarea
                  value={displayCaption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-[160px] text-sm border-0 bg-transparent rounded-none focus-visible:ring-0 resize-none"
                  data-testid="textarea-caption"
                />
                <div className="border-t border-border/40 p-2.5 flex items-center gap-2 bg-white/[0.02]">
                  {improving ? (
                    <>
                      <Input
                        value={improveInstructions}
                        onChange={(e) => setImproveInstructions(e.target.value)}
                        placeholder='E.g. "Make it shorter" or "Add more urgency"'
                        className="h-8 text-xs flex-1"
                        data-testid="input-improve-instructions"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") improveMutation.mutate();
                          if (e.key === "Escape") setImproving(false);
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => improveMutation.mutate()}
                        disabled={improveMutation.isPending}
                        className="h-8 text-xs gap-1.5 flex-shrink-0"
                        data-testid="btn-improve-submit"
                      >
                        <Sparkles size={11} />
                        {improveMutation.isPending ? "Improving..." : "Improve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setImproving(false)}
                        className="h-8 text-xs flex-shrink-0"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImproving(true)}
                      className="h-8 text-xs gap-1.5"
                      data-testid="btn-improve"
                    >
                      <Sparkles size={12} />
                      Improve with AI
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Hash size={13} className="text-muted-foreground" />
                  <Label>Hashtags</Label>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("hashtags")}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="btn-copy-hashtags"
                >
                  {copied === "hashtags" ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                  {copied === "hashtags" ? "Copied!" : "Copy"}
                </button>
              </div>
              <Input
                value={displayHashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#hashtag1,#hashtag2"
                data-testid="input-hashtags"
              />
              {/* Preview */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {displayHashtags.split(",").filter(Boolean).map((h) => (
                  <span key={h} className="text-xs text-primary font-medium">{h.trim()}</span>
                ))}
              </div>
            </div>

            {/* Image Prompt */}
            <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-muted-foreground" />
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Image Prompt</Label>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("image-prompt")}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="btn-copy-image-prompt"
                >
                  {copied === "image-prompt" ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                  {copied === "image-prompt" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{item.imagePrompt}</p>
              <p className="text-xs text-muted-foreground">Use this prompt with DALL-E, Midjourney, or any image generator.</p>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-muted-foreground" />
                <Label>Schedule date</Label>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <Input
                type="date"
                value={displayDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                data-testid="input-date"
              />
            </div>

            {/* Campaign */}
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select
                value={displayCampaignId || "none"}
                onValueChange={(v) => setCampaignId(v === "none" ? "" : v)}
              >
                <SelectTrigger data-testid="select-campaign">
                  <SelectValue placeholder="No campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ── Preview tab ── */}
          <TabsContent value="preview" className="mt-0">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
                  <Instagram size={12} /> Instagram
                </p>
                <InstagramPreview
                  caption={displayCaption}
                  hashtags={displayHashtags}
                  practiceName={practice?.name ?? "Your Practice"}
                  logoUrl={practice?.logoDataUrl}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
                  <Facebook size={12} /> Facebook
                </p>
                <FacebookPreview
                  caption={displayCaption}
                  hashtags={displayHashtags}
                  practiceName={practice?.name ?? "Your Practice"}
                  logoUrl={practice?.logoDataUrl}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Previews are approximate. Final appearance will vary by platform.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
