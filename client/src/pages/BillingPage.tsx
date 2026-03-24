import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import {
  Crown, Check, Zap, TrendingUp, Sparkles,
  CreditCard, ExternalLink, ArrowRight
} from "lucide-react";

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: 29,
    description: "Perfect for solo practices just getting started with social media.",
    color: "border-border",
    badge: null,
    features: [
      "30 AI-generated posts per month",
      "1 practice profile",
      "Instagram, Facebook & TikTok scripts",
      "Content calendar",
      "Before & After generator",
    ],
    limit: "30 posts/mo",
  },
  {
    key: "growth",
    name: "Growth",
    price: 79,
    description: "For active practices ready to scale their social presence.",
    color: "border-primary/40",
    badge: "Most Popular",
    features: [
      "150 AI-generated posts per month",
      "1 practice profile",
      "Everything in Starter",
      "Campaign planner",
      "Video & Reels scripts",
      "Design editor",
    ],
    limit: "150 posts/mo",
  },
  {
    key: "pro",
    name: "Pro",
    price: 149,
    description: "For multi-location practices or agencies managing multiple brands.",
    color: "border-amber-500/40",
    badge: "Best Value",
    features: [
      "Unlimited AI-generated posts",
      "Up to 5 practice profiles",
      "Everything in Growth",
      "Priority AI generation",
      "Multi-practice switcher",
      "Priority support",
    ],
    limit: "Unlimited",
  },
];

export default function BillingPage() {
  const { user, isPro } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentTier = user?.tier ?? "starter";

  const checkoutMutation = useMutation({
    mutationFn: (planKey: string) => apiRequest("POST", "/api/billing/checkout", { plan: planKey }),
    onSuccess: (data: any) => {
      if (data?.url) window.open(data.url, "_blank");
      else toast({ title: "Checkout ready", description: "Redirecting to payment..." });
    },
    onError: () => {
      toast({ title: "Checkout failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/billing/portal", {}),
    onSuccess: (data: any) => {
      if (data?.url) window.open(data.url, "_blank");
    },
    onError: () => toast({ title: "Failed", description: "Could not open billing portal.", variant: "destructive" }),
  });

  async function handleSelectPlan(planKey: string) {
    if (planKey === currentTier) return;
    setLoadingPlan(planKey);
    try {
      await checkoutMutation.mutateAsync(planKey);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium mb-2">
            <Crown size={11} /> Billing & Plans
          </div>
          <h1 className="text-2xl font-bold">Choose your plan</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            All plans include a 7-day free trial. Cancel anytime. No hidden fees.
          </p>
        </div>

        {/* Current plan banner */}
        {currentTier && (
          <div className="rounded-xl border border-border/50 bg-card px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles size={14} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Current plan: <span className="text-primary capitalize">{currentTier}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.stripeSubscriptionStatus === "active" ? "Active subscription" : "No active subscription"}
                </p>
              </div>
            </div>
            {(user as any)?.stripeCustomerId && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                <CreditCard size={12} />
                Manage billing <ExternalLink size={10} />
              </Button>
            )}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.key;
            const isLoading = loadingPlan === plan.key;

            return (
              <Card key={plan.key} className={`relative border-2 transition-all ${plan.color} ${isCurrent ? "bg-primary/5" : "bg-card"}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
                    {isCurrent && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Current</Badge>
                    )}
                    {plan.key === "pro" && (
                      <Crown size={14} className="text-amber-400" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check size={12} className="text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full gap-1.5"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || isLoading}
                    onClick={() => handleSelectPlan(plan.key)}
                    data-testid={`btn-select-plan-${plan.key}`}
                  >
                    {isLoading ? (
                      <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processing...</>
                    ) : isCurrent ? (
                      "Current plan"
                    ) : (
                      <>{currentTier === "starter" && plan.key !== "starter" ? "Upgrade" : "Switch"} to {plan.name} <ArrowRight size={12} /></>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card className="border-border/40">
          <CardContent className="pt-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { q: "Is there a free trial?", a: "Yes — all plans include a 7-day free trial. No charge until the trial ends." },
              { q: "Can I change plans later?", a: "Absolutely. Upgrade or downgrade anytime from the billing portal. Changes take effect immediately." },
              { q: "What happens if I hit my post limit?", a: "You'll see a notice and can upgrade to continue generating. Existing content is never deleted." },
              { q: "How does billing work?", a: "We charge monthly via Stripe. You can cancel anytime before your next renewal date." },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-sm font-medium mb-1">{q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
