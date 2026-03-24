import { useState } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useHashLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — immersive brand panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[hsl(240_8%_6%)] flex-col justify-between p-12">
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid opacity-40" />

        {/* Glow orb */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(258_80%_68%)] opacity-[0.07] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[hsl(198_75%_60%)] opacity-[0.05] blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[hsl(258_80%_68%)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 5V11L8 14L3 11V5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2" fill="white"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">HealthContent</span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div>
            <p className="text-[hsl(258_80%_78%)] text-xs font-medium uppercase tracking-widest mb-4">
              AI Content Platform
            </p>
            <h1 className="text-white font-serif text-[2.6rem] leading-[1.15] mb-5">
              Social media content<br />
              for healthcare,<br />
              <span className="gradient-text">powered by AI.</span>
            </h1>
            <p className="text-[hsl(240_5%_55%)] text-sm leading-relaxed max-w-sm">
              Generate on-brand captions, hashtags, and image prompts for your practice in seconds. Built for orthodontists, dentists, med spas, and more.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {[
              "Instagram Posts",
              "Facebook Posts",
              "TikTok Scripts",
              "Campaign Planner",
              "Content Calendar",
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] text-[hsl(240_5%_70%)] border border-white/[0.08]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="relative">
          <p className="text-[hsl(240_5%_35%)] text-xs">
            <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(240_5%_55%)] transition-colors">
              Built with Perplexity Computer
            </a>
          </p>
        </div>
      </div>

      {/* Right — auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L13 5V11L8 14L3 11V5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="8" cy="8" r="2" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-sm">HealthContent</span>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold tracking-tight mb-1.5">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to your practice dashboard."
                : "Start generating AI content for your practice."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </Label>
              <Input
                type="email"
                placeholder="you@yourpractice.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 bg-card border-border focus:border-primary/60 transition-colors"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Password
              </Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-10 bg-card border-border focus:border-primary/60 transition-colors"
                data-testid="input-password"
              />
              {mode === "register" && (
                <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={loading}
              data-testid="btn-submit-auth"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                mode === "login" ? "Sign in" : "Create account"
              )}
            </Button>
            {mode === "login" && (
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setLocation("/reset-password")}
                  data-testid="btn-forgot-password"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </form>

          {/* Demo login shortcut */}
          {mode === "login" && (
            <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Try the demo account:</p>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => { setEmail("demo@healthcontent.ai"); setPassword("Demo1234!"); }}
                data-testid="btn-fill-demo"
              >
                demo@healthcontent.ai  /  Demo1234!
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-center text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                className="font-medium text-foreground hover:text-primary transition-colors"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                data-testid="btn-toggle-auth-mode"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
