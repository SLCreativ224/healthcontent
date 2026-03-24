import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Users, TrendingUp, Crown, ShieldCheck, BarChart3,
  RefreshCw, Mail, Calendar, Zap, ArrowLeft, Gift
} from "lucide-react";

interface AdminUser {
  id: number;
  email: string;
  tier: string;
  stripeSubscriptionStatus: string | null;
  createdAt: string;
  contentCount: number;
  practiceName: string | null;
  tokensBalance: number;
  tokensResetAt: string | null;
}

interface AdminStats {
  totalUsers: number;
  starterCount: number;
  growthCount: number;
  proCount: number;
  totalContent: number;
  newUsersThisWeek: number;
}

const TIER_COLORS: Record<string, string> = {
  starter: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  growth: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  pro: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function AdminPanel() {
  const [, navigate] = useHashLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [grantAmounts, setGrantAmounts] = useState<Record<number, string>>({});

  const { data: adminData, isLoading, refetch } = useQuery<{ users: AdminUser[]; stats: AdminStats }>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const tierMutation = useMutation({
    mutationFn: ({ userId, tier }: { userId: number; tier: string }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/tier`, { tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Tier updated", description: "User plan changed successfully." });
    },
    onError: () => toast({ title: "Failed", description: "Could not update tier.", variant: "destructive" }),
  });

  const grantTokensMutation = useMutation({
    mutationFn: ({ userId, amount }: { userId: number; amount: number }) =>
      apiRequest("POST", `/api/admin/users/${userId}/tokens`, { amount }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setGrantAmounts(prev => ({ ...prev, [vars.userId]: "" }));
      toast({ title: "Tokens granted", description: `Added ${vars.amount} tokens successfully.` });
    },
    onError: () => toast({ title: "Failed", description: "Could not grant tokens.", variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!adminData) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <ShieldCheck size={40} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Access denied or not logged in.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/app")}>Back to app</Button>
      </div>
    </div>
  );

  const { users: allUsers, stats } = adminData;
  const filtered = allUsers.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.practiceName?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-sidebar px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck size={15} className="text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">Admin Panel</p>
            <p className="text-[10px] text-muted-foreground">HealthContent AI Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw size={12} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/app")} className="gap-1.5 text-xs">
            <ArrowLeft size={12} /> Back to app
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-foreground" },
            { label: "New This Week", value: stats.newUsersThisWeek, icon: Calendar, color: "text-green-400" },
            { label: "Starter", value: stats.starterCount, icon: Zap, color: "text-slate-400" },
            { label: "Growth", value: stats.growthCount, icon: TrendingUp, color: "text-blue-400" },
            { label: "Pro", value: stats.proCount, icon: Crown, color: "text-amber-400" },
            { label: "Total Content", value: stats.totalContent, icon: BarChart3, color: "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <Icon size={14} className={`${color} mb-2`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users size={15} className="text-primary" /> Users
            </CardTitle>
            <input
              type="text"
              placeholder="Search by email or practice..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 px-3 rounded-md border border-border bg-background text-sm w-64 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["ID", "Email", "Practice", "Plan", "Tokens", "Subscription", "Content", "Joined", "Grant Tokens", "Change Plan"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u.id} className={`border-b border-border/50 hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{u.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary">{u.email.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <span className="text-xs truncate max-w-[180px]">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.practiceName ?? <span className="italic opacity-50">No practice</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] border ${TIER_COLORS[u.tier] ?? TIER_COLORS.starter}`}>
                          {u.tier}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.stripeSubscriptionStatus ? (
                          <Badge variant="outline" className={`text-[10px] ${u.stripeSubscriptionStatus === "active" ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}`}>
                            {u.stripeSubscriptionStatus}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 italic">none</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-center">{u.contentCount}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      {/* Tokens balance */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Zap size={11} className={u.tokensBalance <= 3 ? "text-amber-400" : "text-primary"} />
                          <span className={`text-xs font-medium ${u.tokensBalance <= 3 ? "text-amber-400" : "text-foreground"}`}>
                            {u.tokensBalance ?? 0}
                          </span>
                        </div>
                      </td>
                      {/* Grant tokens */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min="1"
                            max="10000"
                            placeholder="Amt"
                            className="h-7 w-16 text-xs px-2"
                            value={grantAmounts[u.id] ?? ""}
                            onChange={e => setGrantAmounts(prev => ({ ...prev, [u.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 gap-1"
                            disabled={!grantAmounts[u.id] || grantTokensMutation.isPending}
                            onClick={() => {
                              const amt = parseInt(grantAmounts[u.id] ?? "0");
                              if (amt > 0) grantTokensMutation.mutate({ userId: u.id, amount: amt });
                            }}
                            data-testid={`btn-grant-tokens-${u.id}`}
                          >
                            <Gift size={10} /> Grant
                          </Button>
                        </div>
                      </td>
                      {/* Change plan */}
                      <td className="px-4 py-3">
                        <Select
                          value={u.tier}
                          onValueChange={(tier) => tierMutation.mutate({ userId: u.id, tier })}
                        >
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="growth">Growth</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Admin key reminder */}
        <p className="text-xs text-muted-foreground/40 text-center">
          Admin access is restricted to accounts marked as admin in the database. Route: /admin
        </p>
      </div>
    </div>
  );
}


