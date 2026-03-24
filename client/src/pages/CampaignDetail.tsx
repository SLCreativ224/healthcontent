import { useParams } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, PlusCircle } from "lucide-react";
import type { Campaign, ContentItem } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function CampaignDetail() {
  const { id } = useParams();
  const [, navigate] = useHashLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: campaign, isLoading: loadingCampaign } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", id],
  });

  const { data: items = [], isLoading: loadingItems } = useQuery<ContentItem[]>({
    queryKey: ["/api/content/campaign", id],
    queryFn: async () => {
      const res = await fetch(`/api/content/campaign/${id}`, { credentials: "include" });
      return res.json();
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/campaigns/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      navigate("/app/campaigns");
    },
  });

  if (loadingCampaign) {
    return (
      <AppShell>
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!campaign) return <AppShell><p className="text-muted-foreground">Campaign not found.</p></AppShell>;

  return (
    <AppShell>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/app/campaigns")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Campaigns
          </button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteCampaign.mutate()}
            disabled={deleteCampaign.isPending}
            data-testid="btn-delete-campaign"
          >
            <Trash2 size={14} />
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {items.length} content item{items.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Content</h2>
          <Button size="sm" variant="outline" onClick={() => navigate("/app/create")} data-testid="btn-add-content">
            <PlusCircle size={14} className="mr-1.5" />
            Add content
          </Button>
        </div>

        {loadingItems && <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

        {!loadingItems && items.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">No content in this campaign.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add content by opening a content item and assigning it to this campaign.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/app/content/${item.id}`)}
              className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
              data-testid={`campaign-item-${item.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.caption}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">{item.contentType}</Badge>
                  {item.scheduledDate && (
                    <span className="text-xs text-muted-foreground">{item.scheduledDate}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
