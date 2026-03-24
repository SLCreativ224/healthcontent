import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle, Search, Download, Trash2, Copy, Check,
  SplitSquareHorizontal, ArrowLeft, Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BeforeAfterItem {
  id: number;
  title: string;
  treatment: string;
  layout: string;
  caption: string;
  hashtags: string;
  compositeDataUrl?: string;
  hasBeforeImage?: boolean;
  hasAfterImage?: boolean;
  createdAt: string;
}

const LAYOUT_LABEL: Record<string, string> = {
  "side-by-side": "Side by Side",
  "stacked": "Stacked",
  "split-diagonal": "Diagonal Split",
};

export default function BeforeAfterLibrary() {
  const [, navigate] = useHashLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: items = [], isLoading } = useQuery<BeforeAfterItem[]>({
    queryKey: ["/api/before-after"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/before-after/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/before-after"] });
      toast({ title: "Deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  async function copyCaption(item: BeforeAfterItem) {
    const text = `${item.caption}\n\n${item.hashtags}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(item.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadImage(item: BeforeAfterItem) {
    if (!item.compositeDataUrl) return;
    const a = document.createElement("a");
    a.href = item.compositeDataUrl;
    a.download = `${item.treatment.replace(/\s+/g, "-")}-before-after.jpg`;
    a.click();
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.treatment.toLowerCase().includes(q) ||
      item.caption.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/app/before-after")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="btn-back"
            >
              <ArrowLeft size={14} />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Before &amp; After Library</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{items.length} saved</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/app/before-after")}
            data-testid="btn-new-ba"
            className="gap-1.5"
          >
            <PlusCircle size={14} />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by treatment, caption..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <SplitSquareHorizontal size={20} className="text-violet-400" />
            </div>
            <p className="text-sm font-semibold mb-1">
              {search ? "No results found" : "No before & afters yet"}
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              {search ? "Try a different search term." : "Create your first branded transformation post."}
            </p>
            {!search && (
              <Button size="sm" onClick={() => navigate("/app/before-after")} className="gap-1.5">
                <PlusCircle size={14} />
                Create one
              </Button>
            )}
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-border transition-all group"
                  data-testid={`ba-card-${item.id}`}
                >
                  {/* Composite image */}
                  <div
                    className="relative cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{ aspectRatio: "1/1", maxHeight: "240px" }}
                  >
                    {item.compositeDataUrl ? (
                      <img
                        src={item.compositeDataUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        style={{ maxHeight: "240px" }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500/10 to-primary/10 flex items-center justify-center">
                        <SplitSquareHorizontal size={28} className="text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 text-xs h-8"
                        onClick={(e) => { e.stopPropagation(); downloadImage(item); }}
                        disabled={!item.compositeDataUrl}
                        data-testid={`btn-download-${item.id}`}
                      >
                        <Download size={12} /> Download
                      </Button>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full font-medium border border-violet-500/20">
                            {LAYOUT_LABEL[item.layout] ?? item.layout}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar size={9} />
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`btn-delete-${item.id}`}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>

                    {/* Caption preview / expanded */}
                    {item.caption && (
                      <div>
                        <p
                          className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? "" : "line-clamp-2"} cursor-pointer`}
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                          {item.caption}
                        </p>
                        {isExpanded && item.hashtags && (
                          <p className="text-[11px] text-primary/80 mt-1.5 leading-relaxed">
                            {item.hashtags.split(",").filter(Boolean).map((h) => h.trim()).join(" ")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs h-8"
                        onClick={() => copyCaption(item)}
                        data-testid={`btn-copy-${item.id}`}
                      >
                        {copied === item.id ? (
                          <><Check size={11} className="text-primary" /> Copied!</>
                        ) : (
                          <><Copy size={11} /> Copy Caption</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs h-8"
                        onClick={() => downloadImage(item)}
                        disabled={!item.compositeDataUrl}
                        data-testid={`btn-dl-${item.id}`}
                      >
                        <Download size={11} /> Download
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
