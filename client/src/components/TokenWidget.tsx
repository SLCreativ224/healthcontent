/**
 * TokenWidget — shows current token balance in the sidebar
 * Also shows low-token warning banner at the top of the app
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, ShoppingCart, AlertTriangle, CheckCircle, Star } from "lucide-react";

interface TokenData {
  balance: number;
  resetAt: string;
  monthlyAllowance: number;
  packs: Array<{
    id: string;
    tokens: number;
    priceCents: number;
    label: string;
    popular: boolean;
  }>;
}

export function useTokens() {
  return useQuery<TokenData>({
    queryKey: ["/api/tokens"],
  });
}

// ─── Token balance pill for sidebar ──────────────────────────────────────────

export function TokenBalancePill({ onClick }: { onClick?: () => void }) {
  const { data } = useTokens();
  if (!data) return null;

  const pct = Math.min(100, (data.balance / data.monthlyAllowance) * 100);
  const isLow = data.balance <= 3;
  const isEmpty = data.balance === 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
      data-testid="token-balance-pill"
    >
      <div className={`rounded-lg border px-3 py-2.5 transition-colors ${
        isEmpty ? "border-red-500/40 bg-red-500/5" :
        isLow  ? "border-amber-500/40 bg-amber-500/5" :
                 "border-border/50 bg-card/50 hover:bg-card"
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Zap size={11} className={isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-primary"} />
            <span className="text-[11px] font-medium text-muted-foreground">Tokens</span>
          </div>
          <span className={`text-[11px] font-bold ${
            isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-foreground"
          }`}>
            {data.balance} left
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 rounded-full bg-border/50 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isEmpty ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground/60">
            {data.monthlyAllowance}/mo included
          </span>
          <span className={`text-[10px] font-medium ${isEmpty || isLow ? "text-amber-400" : "text-primary opacity-0 group-hover:opacity-100 transition-opacity"}`}>
            {isEmpty || isLow ? "Buy more →" : "Buy more →"}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Low token warning banner ─────────────────────────────────────────────────

export function LowTokenBanner({ onBuyMore }: { onBuyMore: () => void }) {
  const { data } = useTokens();
  const [dismissed, setDismissed] = useState(false);

  if (!data || dismissed) return null;
  if (data.balance > 5) return null;

  const isEmpty = data.balance === 0;

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 text-sm border-b ${
      isEmpty
        ? "bg-red-500/10 border-red-500/20 text-red-400"
        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
    }`}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} />
        <span className="text-xs font-medium">
          {isEmpty
            ? "You're out of tokens — content generation is paused."
            : `Only ${data.balance} token${data.balance === 1 ? "" : "s"} remaining. Top up to keep generating.`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className={`h-7 text-xs px-3 ${isEmpty ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"}`}
          onClick={onBuyMore}
        >
          Buy tokens
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs opacity-60 hover:opacity-100 transition-opacity ml-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Buy More Tokens Modal ────────────────────────────────────────────────────

export function BuyTokensModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useTokens();
  const { toast } = useToast();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: (packId: string) =>
      apiRequest<{ url: string }>("POST", "/api/tokens/checkout", { packId }),
    onSuccess: (data) => {
      // Open Stripe checkout in a new tab
      window.open(data.url, "_blank");
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLoadingPackId(null);
    },
  });

  const handleBuy = (packId: string) => {
    setLoadingPackId(packId);
    checkoutMutation.mutate(packId);
  };

  const resetDate = data?.resetAt ? new Date(data.resetAt) : null;
  const nextReset = resetDate
    ? new Date(resetDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            Buy More Tokens
          </DialogTitle>
          <DialogDescription>
            Tokens are used to generate AI content. Pick a pack — they never expire and stack on top of your monthly allowance.
          </DialogDescription>
        </DialogHeader>

        {/* Current balance */}
        {data && (
          <div className="flex items-center justify-between rounded-lg bg-card border border-border/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground text-xs">Current balance</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{data.balance} tokens</span>
              {nextReset && (
                <span className="text-[10px] text-muted-foreground/60">
                  · resets {nextReset.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Packs */}
        <div className="space-y-2.5 mt-1">
          {data?.packs.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-lg border p-4 transition-colors ${
                pack.popular
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60 bg-card hover:border-border"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-2.5 left-4">
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 flex items-center gap-1">
                    <Star size={9} /> Most Popular
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{pack.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pack.tokens} content pieces</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${(pack.priceCents / 100).toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">${(pack.priceCents / pack.tokens / 100).toFixed(2)}/token</p>
                </div>
              </div>
              <Button
                className="w-full mt-3 h-9 text-sm"
                variant={pack.popular ? "default" : "outline"}
                onClick={() => handleBuy(pack.id)}
                disabled={loadingPackId === pack.id}
                data-testid={`btn-buy-${pack.id}`}
              >
                {loadingPackId === pack.id ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Redirecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingCart size={13} />
                    Buy {pack.tokens} tokens for ${(pack.priceCents / 100).toFixed(0)}
                  </span>
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/60 text-center mt-1">
          Secure payment via Stripe · Tokens added instantly after purchase
        </p>
      </DialogContent>
    </Dialog>
  );
}
