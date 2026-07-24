import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/lib/LanguageContext";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Agents from "@/pages/Agents";
import AgentDetail from "@/pages/AgentDetail";
import Tasks from "@/pages/Tasks";
import Loops from "@/pages/Loops";
import FreeLLM from "@/pages/FreeLLM";
import Settings from "@/pages/Settings";
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Legal from "@/pages/Legal";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import { Menu, X } from "lucide-react";

function AppRoutes() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPublic =
    location === "/" ||
    location.startsWith("/pricing") ||
    location.startsWith("/legal");

  if (isPublic) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/legal/:slug" component={Legal} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:relative md:translate-x-0 md:block",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center h-12 px-4 border-b border-[rgba(59,130,246,0.12)] bg-[#060b18] md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-[rgba(59,130,246,0.08)] transition-colors"
            data-testid="button-mobile-menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 font-semibold text-sm gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            DreamTeam
          </span>
        </div>

        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/agents" component={Agents} />
          <Route path="/agent/:id" component={AgentDetail} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/loops" component={Loops} />
          <Route path="/free-llm" component={FreeLLM} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

export default function App() {
  // Force dark mode
  document.documentElement.classList.add("dark");

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router hook={useHashLocation}>
          <AppRoutes />
        </Router>
        <Toaster />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
