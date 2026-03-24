import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Search, SplitSquareHorizontal, Download, Copy, ChevronRight } from "lucide-react";
import type { ContentItem } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  "Instagram Post": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "Facebook Post": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "TikTok/Reel Script": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function ContentLibrary() {
  const [, navigate] = useHashLocation();
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery<ContentItem[]>({ queryKey: ["/api/content"] });

  const duplicateMutation = useMutation({
    mutationFn: (item: ContentItem) =>
      apiRequest("POST", "/api/ai/generate", {
        specialty: item.specialty,
        contentType: item.contentType,
        goal: item.goal,
        tone: item.tone,
      }),
    onSuccess: (newItem: ContentItem) => {
      qc.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Duplicated", description: "A new copy has been created." });
      navigate(`/app/content/${newItem.id}`);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function exportCSV() {
    if (items.length === 0) return;
    const headers = ["Title", "Type", "Specialty", "Goal", "Tone", "Caption", "Hashtags", "Image Prompt", "Scheduled Date", "Created"];
    const rows = items.map((item) => [
      item.title,
      item.contentType,
      item.specialty,
      item.goal,
      item.tone,
      item.caption.replace(/"/g, '""'),
      item.hashtags,
      item.imagePrompt?.replace(/"/g, '""') ?? "",
      item.scheduledDate ?? "",
      new Date(item.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `healthcontent-library-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${items.length} items saved to CSV.` });
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.specialty.toLowerCase().includes(q) ||
      item.goal.toLowerCase().includes(q) ||
      item.caption.toLowerCase().includes(q)
    );
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/app/before-after/library")}
              className="gap-1.5 text-xs h-8"
              data-testid="btn-ba-library"
            >
              <SplitSquareHorizontal size={13} />
              Before &amp; Afters
            </Button>
            {items.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={exportCSV}
                className="gap-1.5 text-xs h-8"
                data-testid="btn-export-csv"
              >
                <Download size={13} />
                Export CSV
              </Button>
            )}
            <Button size="sm" onClick={() => navigate("/app/create")} data-testid="btn-new-content">
              <PlusCircle size={14} className="mr-1.5" />
              New content
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, specialty, goal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-medium">
              {search ? "No results found" : "No content yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {search ? "Try a different search term." : "Create your first AI-generated post."}
            </p>
            {!search && (
              <Button size="sm" onClick={() => navigate("/app/create")}>
                <PlusCircle size={14} className="mr-1.5" />
                Create content
              </Button>
            )}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
                data-testid={`content-row-${item.id}`}
              >
                <button
                  onClick={() => navigate(`/app/content/${item.id}`)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate pr-12">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.caption}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.contentType] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {item.contentType}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{item.specialty}</Badge>
                    <Badge variant="outline" className="text-xs">{item.goal}</Badge>
                    {item.scheduledDate && (
                      <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
                        Scheduled {item.scheduledDate}
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Duplicate button — visible on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(item); }}
                  disabled={duplicateMutation.isPending}
                  title="Duplicate"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground bg-card border border-border/60 rounded-md px-2 py-1"
                  data-testid={`btn-duplicate-${item.id}`}
                >
                  <Copy size={10} />
                  Duplicate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
