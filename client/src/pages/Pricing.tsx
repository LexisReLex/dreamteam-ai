import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { PricingSection, ComparisonSection } from "./Landing";

// Logo (duplicated here to keep the page self-contained without circular imports)
function Logo() {
  return (
    <svg
      aria-label="DreamTeam"
      viewBox="0 0 40 40"
      fill="none"
      className="w-8 h-8 flex-shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pricing-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="pricing-logo-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path d="M20 3 L35 11.5 L35 28.5 L20 37 L5 28.5 L5 11.5 Z" fill="none" stroke="url(#pricing-logo-grad)" strokeWidth="2" filter="url(#pricing-logo-glow)" />
      <path d="M20 9 L29 14 L29 26 L20 31 L11 26 L11 14 Z" fill="url(#pricing-logo-grad)" opacity="0.15" />
      <path d="M15 14 L15 26 L20 26 C23.3 26 26 23.3 26 20 C26 16.7 23.3 14 20 14 Z" fill="url(#pricing-logo-grad)" />
      <path d="M17 16.5 L17 23.5 L20 23.5 C21.9 23.5 23.5 21.9 23.5 20 C23.5 18.1 21.9 16.5 20 16.5 Z" fill="#050810" />
    </svg>
  );
}

export default function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      {/* Minimal navbar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(59,130,246,0.1)]"
        style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3">
            <Logo />
            <span className="font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              DreamTeam
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => setLocation("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Home
            </button>
            <button className="text-sm text-primary font-medium">
              Pricing
            </button>
          </nav>

          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            Open App
          </button>
        </div>
      </header>

      {/* Page header */}
      <div className="relative pt-32 pb-8 overflow-hidden">
        <div className="absolute inset-0 mesh-bg grid-pattern" />
        <div className="orb-blue w-96 h-96 -top-24 left-1/4 opacity-30" />
        <div className="orb-purple w-80 h-80 top-0 right-1/4 opacity-25" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug naar home
          </button>

          <h1
            className="text-5xl md:text-6xl font-bold mb-5"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            <span className="gradient-text">Transparante</span> Prijzen
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Geen verrassingen. Geen verborgen kosten. Kies het plan dat bij jou past en schaal op wanneer je klaar bent.
          </p>
        </div>
      </div>

      {/* Pricing cards (reused from Landing) */}
      <PricingSection showHeader={false} />

      {/* Comparison table (reused from Landing) */}
      <ComparisonSection />

      {/* Footer strip */}
      <footer
        className="border-t border-[rgba(59,130,246,0.1)] py-8 text-center text-xs text-muted-foreground"
        style={{ background: "rgba(5,8,16,0.9)" }}
      >
        <p>© 2026 DreamTeam. Alle rechten voorbehouden. · KvK: 12345678 · BTW: NL123456789B01</p>
        <p className="mt-1">Gebouwd met ❤️ in Nederland</p>
      </footer>
    </div>
  );
}
