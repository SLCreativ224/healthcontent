import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, FolderOpen, ArrowRight, FileText, CalendarDays, Trash2 } from "lucide-react";
import type { Campaign, ContentItem } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Campaigns() {
  const [, navigate] = useHashLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const { data: allContent = [] } = useQuery<ContentItem[]>({ queryKey: ["/api/content"] });

  // Build per-campaign stats from allContent
  function getCampaignStats(campaignId: number) {
    const items = allContent.filter((c) => c.campaignId === campaignId);
    const scheduled = items.filter((c) => c.scheduledDate).length;
    const nextDate = items
      .filter((c) => c.scheduledDate)
      .map((c) => c.scheduledDate!)
      .sort()[0];
    return { count: items.length, scheduled, nextDate };
  }

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/campaigns", { name, description }),
    onSuccess: (c: Campaign) => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign created" });
      setShowNew(false);
      setName(""); setDescription("");
      navigate(`/app/campaigns/${c.id}`);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/campaigns/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <AppShell>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Group content into focused marketing campaigns.</p>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)} data-testid="btn-new-campaign">
            <PlusCircle size={14} className="mr-1.5" />
            New campaign
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        )}

        {!isLoading && campaigns.length === 0 && (
          <div className="text-center py-16 rounded-xl border border-dashed border-border">
            <FolderOpen size={28} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No campaigns yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Create a campaign to organise related posts together.</p>
            <Button size="sm" onClick={() => setShowNew(true)}>Create campaign</Button>
          </div>
        )}

        <div className="space-y-2">
          {campaigns.map((c) => {
            const stats = getCampaignStats(c.id);
            return (
              <div
                key={c.id}
                className="group relative rounded-xl border border-border bg-card hover:border-primary/30 transition-all"
                data-testid={`campaign-row-${c.id}`}
              >
                <button
                  onClick={() => navigate(`/app/campaigns/${c.id}`)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        {stats.count === 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50 text-muted-foreground">
                            Empty
                          </Badge>
                        )}
                        {stats.count > 0 && stats.scheduled === stats.count && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Fully scheduled
                          </Badge>
                        )}
                        {stats.count > 0 && stats.scheduled > 0 && stats.scheduled < stats.count && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            In progress
                          </Badge>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{c.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText size={11} />
                          {stats.count} post{stats.count !== 1 ? "s" : ""}
                        </span>
                        {stats.scheduled > 0 && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CalendarDays size={11} />
                            {stats.scheduled} scheduled
                          </span>
                        )}
                        {stats.nextDate && (
                          <span className="text-xs text-muted-foreground">
                            Next: {stats.nextDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </p>
                      <ArrowRight size={15} className="text-muted-foreground" />
                    </div>
                  </div>
                </button>

                {/* Delete on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(c.id); }}
                  disabled={deleteMutation.isPending}
                  className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  data-testid={`btn-delete-campaign-${c.id}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Campaign Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Campaign name</Label>
              <Input
                placeholder="e.g. Teeth Whitening March Promo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) createMutation.mutate(); }}
                data-testid="input-campaign-name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="What is this campaign about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                data-testid="input-campaign-description"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button
                disabled={!name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                data-testid="btn-create-campaign"
              >
                {createMutation.isPending ? "Creating..." : "Create campaign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
