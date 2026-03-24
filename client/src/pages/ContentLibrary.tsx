import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle, Search, SplitSquareHorizontal, Download, Copy, Check,
  Sparkles, Save, Trash2, Image as ImageIcon, Hash, Calendar, Instagram, Facebook, Eye, X
} from "lucide-react";
import type { ContentItem, Campaign } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  "Instagram Post": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "Facebook Post": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "TikTok/Reel Script": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

function InstagramPreview({ caption, hashtags, practiceName, logoUrl }: { caption: string; hashtags: string; practiceName: string; logoUrl?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-[#0d0d0f] overflow-hidden max-w-sm mx-auto">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-400 flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" /> : <span className="text-white text-[10px] font-bold">{practiceName.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div>
          <p className="text-xs font-semibold text-white leading-tight">{practiceName || "Your Practice"}</p>
          <p className="text-[10px] text-white/40">Sponsored</p>
        </div>
      </div>
      <div className="bg-gradient-to-br from-primary/20 to-violet-600/20 flex items-center justify-center" style={{ aspectRatio: "1/1" }}>
        <div className="text-center"><ImageIcon size={28} className="text-white/20 mx-auto mb-2" /><p className="text-[10px] text-white/30">Your image here</p></div>
      </div>
      <div className="px-3.5 pb-4 pt-2 space-y-1.5">
        <p className="text-xs text-white/90 leading-relaxed line-clamp-4"><span className="font-semibold">{practiceName || "yourpractice"} </span>{caption}</p>
        {hashtags && <p className="text-[11px] text-primary/80 leading-relaxed line-clamp-2">{hashtags.split(",").filter(Boolean).map((h) => h.trim()).join(" ")}</p>}
      </div>
    </div>
  );
}

function FacebookPreview({ caption, hashtags, practiceName, logoUrl }: { caption: string; hashtags: string; practiceName: string; logoUrl?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-[#0d0d0f] overflow-hidden max-w-sm mx-auto">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" /> : <span className="text-white text-[11px] font-bold">{practiceName.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div>
          <p className="text-xs font-semibold text-white leading-tight">{practiceName || "Your Practice"}</p>
          <p className="text-[10px] text-white/40">Just now · 🌐</p>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-white/90 leading-relaxed line-clamp-5">{caption}</p>
        {hashtags && <p className="text-[11px] text-blue-400/80 mt-1.5 line-clamp-2">{hashtags.split(",").filter(Boolean).map((h) => h.trim()).join(" ")}</p>}
      </div>
      <div className="bg-gradient-to-br from-blue-500/10 to-primary/10 flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
        <div className="text-center"><ImageIcon size={24} className="text-white/20 mx-auto mb-1.5" /><p className="text-[10px] text-white/30">Your image here</p></div>
      </div>
      <div className="px-4 py-2.5 flex items-center justify-between border-t border-white/5 text-[11px] text-white/30">
        <span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span>
      </div>
    </div>
  );
}

function ContentDetailPanel({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [caption, setCaption] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [improveInstructions, setImproveInstructions] = useState("");
  const [copied, setCopied] = useState<"caption" | "hashtags" | "image-prompt" | null>(null);

  const { data: campaigns = [] } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const { data: practice } = useQuery<any>({ queryKey: ["/api/practice"] });

  const displayCaption = caption ?? item.caption ?? "";
  const displayHashtags = hashtags ?? item.hashtags ?? "";
  const displayDate = scheduledDate ?? item.scheduledDate ?? "";
  const displayCampaignId = campaignId ?? String(item.campaignId ?? "");

  async function copyToClipboard(type: "caption" | "hashtags" | "image-prompt") {
    const text = type === "caption" ? displayCaption : type === "hashtags" ? displayHashtags : item.imagePrompt ?? "";
    try { await navigator.clipboard.writeText(text); } catch {
      const el = document.createElement("textarea"); el.value = text; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(type); setTimeout(() => setCopied(null), 2000);
  }

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/content/${item.id}`, { caption: displayCaption, hashtags: displayHashtags, scheduledDate: displayDate || null, campaignId: displayCampaignId && displayCampaignId !== "none" ? Number(displayCampaignId) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/content"] }); toast({ title: "Saved" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const improveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/ai/improve/${item.id}`, { instructions: improveInstructions }),
    onSuccess: (updated: ContentItem) => { setCaption(updated.caption); setImproving(false); qc.invalidateQueries({ queryKey: ["/api/content"] }); toast({ title: "Caption improved!" }); },
    onError: (err: any) => { setImproving(false); toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/content/${item.id}`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/content"] }); onClose(); },
  });

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-base font-semibold truncate pr-4">{item.title}</SheetTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}><Trash2 size={13} /></Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save size={13} className="mr-1.5" />{saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[item.specialty, item.contentType, item.goal, item.tone].map((val) => (
            <Badge key={val} variant="secondary" className="text-xs">{val}</Badge>
          ))}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <Tabs defaultValue="edit">
          <TabsList className="mb-5 h-9">
            <TabsTrigger value="edit" className="text-xs">Edit Content</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye size={12} />Social Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-5 mt-0">
            {/* Caption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Caption / Script</Label>
                <button type="button" onClick={() => copyToClipboard("caption")} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  {copied === "caption" ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                  {copied === "caption" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className={`rounded-xl border bg-card/30 overflow-hidden transition-all ${improving ? "border-primary/30" : "border-border/50"}`}>
                <Textarea value={displayCaption} onChange={(e) => setCaption(e.target.value)} className="min-h-[140px] text-sm border-0 bg-transparent rounded-none focus-visible:ring-0 resize-none" />
                <div className="border-t border-border/40 p-2.5 flex items-center gap-2 bg-white/[0.02]">
                  {improving ? (
                    <>
                      <Input value={improveInstructions} onChange={(e) => setImproveInstructions(e.target.value)} placeholder='E.g. "Make it shorter"' className="h-8 text-xs flex-1" autoFocus onKeyDown={(e) => { if (e.key === "Enter") improveMutation.mutate(); if (e.key === "Escape") setImproving(false); }} />
                      <Button size="sm" onClick={() => improveMutation.mutate()} disabled={improveMutation.isPending} className="h-8 text-xs gap-1.5 flex-shrink-0"><Sparkles size={11} />{improveMutation.isPending ? "Improving..." : "Improve"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setImproving(false)} className="h-8 text-xs flex-shrink-0">Cancel</Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setImproving(true)} className="h-8 text-xs gap-1.5"><Sparkles size={12} />Improve with AI</Button>
                  )}
                </div>
              </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5"><Hash size={13} className="text-muted-foreground" /><Label>Hashtags</Label></div>
                <button type="button" onClick={() => copyToClipboard("hashtags")} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  {copied === "hashtags" ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                  {copied === "hashtags" ? "Copied!" : "Copy"}
                </button>
              </div>
              <Input value={displayHashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#hashtag1,#hashtag2" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {displayHashtags.split(",").filter(Boolean).map((h) => <span key={h} className="text-xs text-primary font-medium">{h.trim()}</span>)}
              </div>
            </div>

            {/* Image Prompt */}
            <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5"><ImageIcon size={13} className="text-muted-foreground" /><Label className="text-muted-foreground text-xs uppercase tracking-wide">Image Prompt</Label></div>
                <button type="button" onClick={() => copyToClipboard("image-prompt")} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  {copied === "image-prompt" ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                  {copied === "image-prompt" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{item.imagePrompt}</p>
              <p className="text-xs text-muted-foreground">Use with DALL-E, Midjourney, or any image generator.</p>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5"><Calendar size={13} className="text-muted-foreground" /><Label>Schedule date</Label><span className="text-xs text-muted-foreground">(optional)</span></div>
              <Input type="date" value={displayDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>

            {/* Campaign */}
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={displayCampaignId || "none"} onValueChange={(v) => setCampaignId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No campaign" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {campaigns.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5"><Instagram size={12} /> Instagram</p>
                <InstagramPreview caption={displayCaption} hashtags={displayHashtags} practiceName={practice?.name ?? "Your Practice"} logoUrl={practice?.logoDataUrl} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5"><Facebook size={12} /> Facebook</p>
                <FacebookPreview caption={displayCaption} hashtags={displayHashtags} practiceName={practice?.name ?? "Your Practice"} logoUrl={practice?.logoDataUrl} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ContentLibrary() {
  const [, navigate] = useHashLocation();
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery<ContentItem[]>({ queryKey: ["/api/content"] });

  const duplicateMutation = useMutation({
    mutationFn: (item: ContentItem) => apiRequest("POST", "/api/ai/generate", { specialty: item.specialty, contentType: item.contentType, goal: item.goal, tone: item.tone }),
    onSuccess: (newItem: ContentItem) => { qc.invalidateQueries({ queryKey: ["/api/content"] }); toast({ title: "Duplicated", description: "A new copy has been created." }); setSelectedItem(newItem); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function exportCSV() {
    if (items.length === 0) return;
    const headers = ["Title", "Type", "Specialty", "Goal", "Tone", "Caption", "Hashtags", "Image Prompt", "Scheduled Date", "Created"];
    const rows = items.map((item) => [item.title, item.contentType, item.specialty, item.goal, item.tone, item.caption.replace(/"/g, '""'), item.hashtags, item.imagePrompt?.replace(/"/g, '""') ?? "", item.scheduledDate ?? "", new Date(item.createdAt).toLocaleDateString()]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `healthcontent-library-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${items.length} items saved to CSV.` });
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.specialty.toLowerCase().includes(q) || item.goal.toLowerCase().includes(q) || item.caption.toLowerCase().includes(q);
  });

  return (
    <AppShell>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Content Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{items.length} posts</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button size="sm" variant="outline" onClick={() => navigate("/app/before-after/library")} className="gap-1.5 text-xs h-8">
              <SplitSquareHorizontal size={13} />Before &amp; Afters
            </Button>
            {items.length > 0 && (
              <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs h-8">
                <Download size={13} />Export CSV
              </Button>
            )}
            <Button size="sm" onClick={() => navigate("/app/create")}><PlusCircle size={14} className="mr-1.5" />New content</Button>
          </div>
        </div>

        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by title, specialty, goal..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading && <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-medium">{search ? "No results found" : "No content yet"}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{search ? "Try a different search term." : "Create your first AI-generated post."}</p>
            {!search && <Button size="sm" onClick={() => navigate("/app/create")}><PlusCircle size={14} className="mr-1.5" />Create content</Button>}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="group relative rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                <button onClick={() => setSelectedItem(item)} className="w-full text-left p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate pr-12">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.caption}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.contentType] ?? "bg-muted text-muted-foreground"}`}>{item.contentType}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{item.specialty}</Badge>
                    <Badge variant="outline" className="text-xs">{item.goal}</Badge>
                    {item.scheduledDate && <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">Scheduled {item.scheduledDate}</Badge>}
                  </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(item); }} disabled={duplicateMutation.isPending} title="Duplicate" className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground bg-card border border-border/60 rounded-md px-2 py-1">
                  <Copy size={10} />Duplicate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content detail slide-over */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          {selectedItem && <ContentDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
