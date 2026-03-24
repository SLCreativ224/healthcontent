import { Router, Switch, Route, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";

import AuthPage from "@/pages/AuthPage";
import PracticeSetup from "@/pages/PracticeSetup";
import Dashboard from "@/pages/Dashboard";
import CreateContent from "@/pages/CreateContent";
import ContentLibrary from "@/pages/ContentLibrary";
import ContentDetail from "@/pages/ContentDetail";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import CalendarView from "@/pages/CalendarView";
import BeforeAfter from "@/pages/BeforeAfter";
import BeforeAfterLibrary from "@/pages/BeforeAfterLibrary";
import ManagePractices from "@/pages/ManagePractices";
import DesignEditor from "@/pages/DesignEditor";
import VideoReels from "@/pages/VideoReels";
import BillingPage from "@/pages/BillingPage";
import AdminPanel from "@/pages/AdminPanel";
import ResetPassword from "@/pages/ResetPassword";
import HomePage from "@/pages/HomePage";
import NotFound from "@/pages/not-found";
import type { Practice } from "@shared/schema";

// Routes that don't require onboarding completion
const SETUP_EXEMPT = ["/app/setup"];

// Authenticated app routes (prefixed under /app)
function AppRoutes() {
  const { user, isLoading: authLoading } = useAuth();
  const [location] = useHashLocation();

  // Check practice / onboarding status
  const { data: practice, isLoading: practiceLoading } = useQuery<Practice | null>({
    queryKey: ["/api/practice"],
    enabled: !!user,
  });

  const isLoading = authLoading || (!!user && practiceLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // Gate: if practice onboarding not complete and not already on /app/setup, redirect there
  const isSetupExempt = SETUP_EXEMPT.some((p) => location.startsWith(p));
  if (!isSetupExempt && practice !== undefined && !practice?.onboardingComplete) {
    // Use effect-free redirect — render redirect component
    return <SetupRedirect />;
  }

  return (
    <Switch>
      <Route path="/app" component={Dashboard} />
      <Route path="/app/setup" component={PracticeSetup} />
      <Route path="/app/create" component={CreateContent} />
      <Route path="/app/library" component={ContentLibrary} />
      <Route path="/app/content/:id" component={ContentDetail} />
      <Route path="/app/campaigns" component={Campaigns} />
      <Route path="/app/campaigns/:id" component={CampaignDetail} />
      <Route path="/app/calendar" component={CalendarView} />
      <Route path="/app/before-after/library" component={BeforeAfterLibrary} />
      <Route path="/app/before-after" component={BeforeAfter} />
      <Route path="/app/practices" component={ManagePractices} />
      <Route path="/app/design" component={DesignEditor} />
      <Route path="/app/video" component={VideoReels} />
      <Route path="/app/billing" component={BillingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SetupRedirect() {
  // Show PracticeSetup directly — no navigation needed
  return <PracticeSetup />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useHashLocation}>
          <AuthProvider>
            <Switch>
              {/* Admin panel — separate layout */}
              <Route path="/admin" component={AdminPanel} />
              {/* Password reset — public */}
              <Route path="/reset-password" component={ResetPassword} />
              {/* Login / register — public */}
              <Route path="/login" component={AuthPage} />
              {/* All authenticated app routes — must come before / */}
              <Route path="/app" component={AppRoutes} />
              <Route path="/app/:rest*" component={AppRoutes} />
              {/* Public marketing homepage — last so it doesn't swallow /app */}
              <Route path="/" component={HomePage} />
              {/* Fallback */}
              <Route component={NotFound} />
            </Switch>
            <Toaster />
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
