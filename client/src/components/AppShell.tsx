import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, PlusCircle, BookOpen, FolderOpen,
  CalendarDays, LogOut, Sun, Moon, Menu, X, Sparkles, SplitSquareHorizontal, Settings,
  Palette, Video, Building2, Crown, CreditCard, ShieldCheck, Image
} from "lucide-react";
import { useState } from "react";
import type { Practice } from "@shared/schema";
import { TokenBalancePill, LowTokenBanner, BuyTokensModal } from "./TokenWidget";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, group: "main" },
  { href: "/app/create", label: "Create", icon: PlusCircle, group: "main" },
  { href: "/app/before-after", label: "Before & After", icon: SplitSquareHorizontal, group: "main" },
  { href: "/app/video", label: "Video & Reels", icon: Video, group: "main" },
  { href: "/app/library", label: "Library", icon: BookOpen, group: "main" },
  { href: "/app/campaigns", label: "Campaigns", icon: FolderOpen, group: "main" },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays, group: "main" },
];

const TOOLS_ITEMS = [
  { href: "/app/design", label: "Design Editor", icon: Palette, group: "tools" },
  { href: "/app/graphics", label: "Graphic Studio", icon: Image, group: "tools" },
  { href: "/app/practices", label: "Practices", icon: Building2, group: "tools", pro: true },
  { href: "/app/billing", label: "Billing", icon: CreditCard, group: "tools" },
];

function NavLink({ href, label, Icon, pro }: { href: string; label: string; Icon: any; pro?: boolean }) {
  const [location] = useHashLocation();
  const isActive = location === href || (href !== "/app" && location.startsWith(href));

  return (
    <Link href={href}>
      <a
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150",
          isActive
            ? "bg-primary/15 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
        )}
      >
        <Icon
          size={15}
          className={cn(
            "transition-colors",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
        <span>{label}</span>
        {isActive && (
          <div className="ml-auto w-1 h-1 rounded-full bg-primary" />
        )}
        {pro && !isActive && (
          <Crown size={9} className="ml-auto text-amber-400/60" />
        )}
      </a>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isPro } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [, navigate] = useHashLocation();

  // Fetch practice for logo + name in sidebar
  const { data: practice } = useQuery<Practice>({ queryKey: ["/api/practice"] });

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "HC";

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Practice branding — shows logo if available, else default mark */}
      <div className="px-4 py-4">
        {practice?.logoDataUrl ? (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10"
              style={{ background: practice.brandColor1 ? `${practice.brandColor1}22` : "transparent" }}
            >
              <img
                src={practice.logoDataUrl}
                alt={practice.name}
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight leading-tight truncate">{practice.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{practice.specialty ?? "AI Studio"}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 glow-primary">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L13 5V11L8 14L3 11V5L8 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="8" cy="8" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight leading-none">HealthContent</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">AI Studio</p>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4 mb-3" />

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Content
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <NavLink key={href} href={href} label={label} Icon={Icon} />
        ))}
        <div className="h-px bg-border mx-3 my-3" />
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Tools
        </p>
        {TOOLS_ITEMS.map(({ href, label, icon: Icon, pro }) => (
          <NavLink key={href} href={href} label={label} Icon={Icon} pro={pro} />
        ))}

        {/* Admin link — only visible to admin users */}
        {user?.email && ["demo@healthcontent.ai", "spencer@slcreativ.com"].includes(user.email) && (
          <>
            <div className="h-px bg-border mx-3 my-3" />
            <NavLink href="/admin" label="Admin" Icon={ShieldCheck} />
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-4 space-y-1">
        <div className="h-px bg-border mx-2 mb-3" />

        {/* Practice settings shortcut */}
        {practice && (
          <Link href="/app/setup">
            <a className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md bg-white/[0.03] border border-border/50 hover:border-border transition-colors mb-1 group">
              {practice.logoDataUrl ? (
                <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                  <img src={practice.logoDataUrl} alt="" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-semibold text-primary">{initials}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground truncate flex-1 group-hover:text-foreground transition-colors">
                {practice.name}
              </p>
              <Settings size={11} className="text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
            </a>
          </Link>
        )}

        {!practice && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-white/[0.03] border border-border/50">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-semibold text-primary">{initials}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate flex-1">{user?.email}</p>
          </div>
        )}

        {/* Tier badge */}
        <div className="px-3 py-1">
          {isPro ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
              <Crown size={9} /> Pro Plan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
              Starter Plan
            </span>
          )}
        </div>

        {/* Token balance pill */}
        <div className="px-1 mb-1">
          <TokenBalancePill onClick={() => setBuyModalOpen(true)} />
        </div>

        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all"
          onClick={toggle}
          data-testid="btn-theme-toggle"
        >
          {theme === "dark"
            ? <Sun size={15} />
            : <Moon size={15} />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all"
          onClick={logout}
          data-testid="btn-logout"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-52 bg-sidebar border-r border-sidebar-border flex flex-col md:hidden transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {practice?.logoDataUrl ? (
              <div className="w-7 h-7 rounded-md overflow-hidden border border-white/10">
                <img src={practice.logoDataUrl} alt="" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Sparkles size={11} className="text-primary-foreground" />
              </div>
            )}
            <span className="font-semibold text-sm">{practice?.name ?? "HealthContent"}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </header>

        {/* Low token warning banner */}
        <LowTokenBanner onBuyMore={() => setBuyModalOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Buy tokens modal */}
      <BuyTokensModal open={buyModalOpen} onClose={() => setBuyModalOpen(false)} />
    </div>
  );
}
