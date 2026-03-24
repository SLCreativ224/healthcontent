import { useState, useEffect } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Lock, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [location, navigate] = useHashLocation();
  const { toast } = useToast();

  // Parse token from URL: /#/reset-password?token=xxx
  const token = new URLSearchParams(
    typeof window !== "undefined" ? window.location.hash.split("?")[1] || "" : ""
  ).get("token") ?? "";

  const [mode, setMode] = useState<"request" | "reset">(token ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setDone(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 5V11L8 14L3 11V5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2" fill="white"/>
            </svg>
          </div>
          <span className="font-semibold text-sm">HealthContent</span>
        </div>

        {done ? (
          // ─── Success state ─────────────────────────────────────────────────
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">
              {mode === "request" ? "Check your email" : "Password updated"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "request"
                ? "If an account exists for that email, you'll receive a reset link within a minute."
                : "Your password has been changed. You can now sign in with your new password."}
            </p>
            <Button className="w-full mt-2" onClick={() => navigate("/")}>
              Back to sign in
            </Button>
          </div>
        ) : mode === "request" ? (
          // ─── Request reset ─────────────────────────────────────────────────
          <>
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight mb-1.5">Forgot your password?</h2>
              <p className="text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
            </div>
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</Label>
                <Input
                  type="email"
                  placeholder="you@yourpractice.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-10 bg-card border-border"
                  data-testid="input-reset-email"
                />
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto" onClick={() => navigate("/")}>
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </div>
          </>
        ) : (
          // ─── Set new password ──────────────────────────────────────────────
          <>
            <div className="mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock size={18} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight mb-1.5">Set new password</h2>
              <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-10 bg-card border-border"
                  data-testid="input-new-password"
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirm Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="h-10 bg-card border-border"
                  data-testid="input-confirm-password"
                />
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading || !token}>
                {loading ? "Updating..." : "Update password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
