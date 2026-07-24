import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, CheckSquare, RefreshCw, Gift, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@shared/schema";
import { useLanguage } from "@/lib/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps = {}) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: "/dashboard", label: t("nav_dashboard"), icon: LayoutDashboard },
    { path: "/agents", label: t("nav_myteam"), icon: Users },
    { path: "/tasks", label: t("nav_tasks"), icon: CheckSquare },
    { path: "/loops", label: t("nav_loops"), icon: RefreshCw },
    { path: "/free-llm", label: t("nav_freellm"), icon: Gift },
    { path: "/settings", label: t("nav_settings"), icon: Settings },
  ];

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  return (
    <aside
      className={cn(
        "flex flex-col h-screen transition-all duration-300 ease-in-out relative z-20",
        "border-r border-[rgba(59,130,246,0.12)]",
        "bg-[#060b18]",
        collapsed ? "w-16" : "w-60"
      )}
      data-testid="sidebar"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb-blue w-32 h-32 -top-8 -left-8 opacity-50" />
      </div>

      {/* Logo */}
      <div className={cn("flex items-center h-16 px-4 border-b border-[rgba(59,130,246,0.1)]", collapsed ? "justify-center" : "gap-3")}>
        <svg
          aria-label="DreamTeam"
          viewBox="0 0 40 40"
          fill="none"
          className="w-9 h-9 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="logo-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d="M20 3 L35 11.5 L35 28.5 L20 37 L5 28.5 L5 11.5 Z" fill="none" stroke="url(#logo-grad)" strokeWidth="2" filter="url(#logo-glow)" />
          <path d="M20 9 L29 14 L29 26 L20 31 L11 26 L11 14 Z" fill="url(#logo-grad)" opacity="0.15" />
          <path d="M15 14 L15 26 L20 26 C23.3 26 26 23.3 26 20 C26 16.7 23.3 14 20 14 Z" fill="url(#logo-grad)" />
          <path d="M17 16.5 L17 23.5 L20 23.5 C21.9 23.5 23.5 21.9 23.5 20 C23.5 18.1 21.9 16.5 20 16.5 Z" fill="#060b18" />
        </svg>

        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm tracking-wide gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              DreamTeam
            </span>
            <span className="text-[10px] text-muted-foreground truncate">AI Agent Platform</span>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[4.5rem] z-10 w-6 h-6 rounded-full bg-[#0f1628] border border-[rgba(59,130,246,0.3)] flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        data-testid="button-sidebar-toggle"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              onClick={onNavigate}
              data-testid={`nav-${path.replace("/", "")}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-[rgba(59,130,246,0.15)] text-primary border border-[rgba(59,130,246,0.25)] glow-blue"
                  : "text-muted-foreground hover:text-foreground hover:bg-[rgba(59,130,246,0.08)]"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
              )}
              <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "group-hover:text-primary/70")} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Language switcher */}
      <div className={cn("px-2 pb-2", collapsed ? "flex justify-center" : "")}>
        <LanguageSwitcher collapsed={collapsed} />
      </div>

      {/* User section */}
      <div className={cn(
        "p-3 border-t border-[rgba(59,130,246,0.1)]",
        collapsed ? "flex justify-center" : "flex items-center gap-3"
      )}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          data-testid="user-avatar"
        >
          {profile?.name?.[0] || "L"}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{profile?.name || "Lex"}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{profile?.plan || "pro"} plan</p>
          </div>
        )}
      </div>
    </aside>
  );
}
