import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  Megaphone, TrendingUp, FileText, BarChart2, HeadphonesIcon,
  Coins, Users, Lightbulb, Globe, Bot,
  ChevronDown, ChevronUp, Star, Check, X, ArrowRight, Zap, Shield, Clock, Languages, Brain, Rocket
} from "lucide-react";

// ─── Agent data ─────────────────────────────────────────────────────────────

const AGENTS = [
  { id: 1, name: "Nova", role: "Marketing Strateeg", icon: Megaphone, color: "#f472b6", description: "Campagnes, social media & brand awareness op autopiloot." },
  { id: 2, name: "Rex", role: "Sales Coach", icon: TrendingUp, color: "#3b82f6", description: "Pipeline-beheer, follow-ups & deals sluiten." },
  { id: 3, name: "Sage", role: "Content Creator", icon: FileText, color: "#a78bfa", description: "Blogs, nieuwsbrieven, productbeschrijvingen & meer." },
  { id: 4, name: "Atlas", role: "Data Analist", icon: BarChart2, color: "#34d399", description: "Rapporten, dashboards & zakelijke inzichten." },
  { id: 5, name: "Aria", role: "Customer Support", icon: HeadphonesIcon, color: "#60a5fa", description: "FAQ's beantwoorden, tickets verwerken & klanten blij houden." },
  { id: 6, name: "Finn", role: "Financieel Adviseur", icon: Coins, color: "#fbbf24", description: "Cashflow, budgetten & financiële planning." },
  { id: 7, name: "Lena", role: "HR Specialist", icon: Users, color: "#f87171", description: "Vacatures, onboarding & personeelsbeleid." },
  { id: 8, name: "Zeno", role: "Strategie Consultant", icon: Lightbulb, color: "#818cf8", description: "Groeistrategie, concurrentieanalyse & roadmaps." },
  { id: 9, name: "Mira", role: "Vertalingen & Lokalisatie", icon: Globe, color: "#2dd4bf", description: "Professionele vertalingen in 5 talen." },
  { id: 10, name: "Kai", role: "AI Trainer", icon: Bot, color: "#fb923c", description: "Custom workflows en agent-automatisering bouwen." },
];

// ─── Pricing data ────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Starter",
    price: "€19",
    period: "/mnd",
    yearPrice: "€190/jr",
    description: "Ideaal voor ZZP'ers die willen beginnen.",
    agents: "3 agents",
    messages: "100/mnd",
    languages: "NL + EN",
    tasks: "Basis",
    prioritySupport: false,
    teamCollab: false,
    customAgents: false,
    sla: false,
    cta: "Start gratis",
    popular: false,
    gradient: false,
  },
  {
    name: "Pro",
    price: "€49",
    period: "/mnd",
    yearPrice: "€490/jr",
    description: "Voor ondernemers die willen groeien.",
    agents: "Alle 10 agents",
    messages: "Onbeperkt",
    languages: "NL, EN, DE, FR, ES",
    tasks: "Volledig",
    prioritySupport: true,
    teamCollab: false,
    customAgents: false,
    sla: false,
    cta: "Start gratis",
    popular: true,
    gradient: true,
  },
  {
    name: "Team",
    price: "€99",
    period: "/mnd",
    yearPrice: "€990/jr",
    description: "Voor teams en snelgroeiende bedrijven.",
    agents: "Alle 10 agents",
    messages: "Onbeperkt",
    languages: "NL, EN, DE, FR, ES",
    tasks: "Volledig",
    prioritySupport: true,
    teamCollab: "Tot 5 gebruikers",
    customAgents: true,
    sla: "99.9% uptime",
    cta: "Neem contact op",
    popular: false,
    gradient: false,
  },
];

// ─── Comparison table data ────────────────────────────────────────────────────

const COMPARISON = [
  { feature: "Nederlandse interface", dreamteam: true, sintra: false, chatgpt: false },
  { feature: "Gespecialiseerde personas", dreamteam: true, sintra: true, chatgpt: false },
  { feature: "GDPR EU-servers", dreamteam: true, sintra: false, chatgpt: false },
  { feature: "Taakbeheer (Kanban)", dreamteam: true, sintra: false, chatgpt: false },
  { feature: "Meertalig (5 talen)", dreamteam: true, sintra: "Beperkt", chatgpt: false },
  { feature: "Prijs", dreamteam: "€49/mnd", sintra: "$39/mnd", chatgpt: "$20/mnd" },
  { feature: "Ondernemer-gericht", dreamteam: "✓✓", sintra: "✓", chatgpt: false },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Hoe werken de AI-agents?",
    a: "Elke agent is een gespecialiseerde AI op basis van Claude van Anthropic, gefinetuned op een specifiek vakgebied. Ze onthouden context van jullie gesprekken en worden steeds beter in hun rol.",
  },
  {
    q: "Is mijn data veilig?",
    a: "Ja. Wij gebruiken EU-servers en zijn volledig GDPR-compliant. Jouw gegevens worden nooit gebruikt voor het trainen van externe AI-modellen en blijven altijd jouw eigendom.",
  },
  {
    q: "Kan ik opzeggen?",
    a: "Je kunt maandelijks opzeggen, zonder boete. Geen verborgen kosten. Na opzegging houd je toegang tot het einde van de betaalde periode.",
  },
  {
    q: "Werkt het ook voor kleine bedrijven?",
    a: "Absoluut. DreamTeam is speciaal gebouwd voor ZZP'ers en MKB. Het Starter-plan is bewust laagdrempelig gehouden — begin klein en schaal op wanneer je klaar bent.",
  },
  {
    q: "Spreken de agents ook Engels?",
    a: "Ja, alle 5 talen worden ondersteund in het Pro- en Team-plan: Nederlands, Engels, Duits, Frans en Spaans. Het Starter-plan ondersteunt NL en EN.",
  },
  {
    q: "Wat als een agent een fout maakt?",
    a: "Agents kunnen fouten maken — net als menselijke medewerkers. Controleer altijd kritische uitvoer, met name financiële of juridische content. Onze agents geven zelf aan wanneer iets buiten hun expertise valt.",
  },
];

// ─── Logo SVG ─────────────────────────────────────────────────────────────────

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
        <linearGradient id="landing-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="landing-logo-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path d="M20 3 L35 11.5 L35 28.5 L20 37 L5 28.5 L5 11.5 Z" fill="none" stroke="url(#landing-logo-grad)" strokeWidth="2" filter="url(#landing-logo-glow)" />
      <path d="M20 9 L29 14 L29 26 L20 31 L11 26 L11 14 Z" fill="url(#landing-logo-grad)" opacity="0.15" />
      <path d="M15 14 L15 26 L20 26 C23.3 26 26 23.3 26 20 C26 16.7 23.3 14 20 14 Z" fill="url(#landing-logo-grad)" />
      <path d="M17 16.5 L17 23.5 L20 23.5 C21.9 23.5 23.5 21.9 23.5 20 C23.5 18.1 21.9 16.5 20 16.5 Z" fill="#050810" />
    </svg>
  );
}

// ─── Pricing section (shared between Landing + Pricing page) ────────────────

export function PricingSection({ showHeader = true }: { showHeader?: boolean }) {
  const [, setLocation] = useLocation();

  return (
    <section id="pricing" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        {showHeader && (
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold gradient-text mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Transparante prijzen
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Geen verrassingen. Geen verborgen kosten. Kies het plan dat bij jou past.
            </p>
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={[
                "glass-card rounded-2xl p-8 flex flex-col relative transition-all duration-300",
                plan.popular
                  ? "border-primary/50 glow-blue scale-[1.02] md:scale-[1.04]"
                  : "hover:-translate-y-1",
              ].join(" ")}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="px-4 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
                  >
                    ⭐ Meest gekozen
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{plan.yearPrice} bij jaarlijkse betaling</p>
              </div>

              {/* Features list */}
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  ["Agents", plan.agents],
                  ["Berichten", plan.messages],
                  ["Talen", plan.languages],
                  ["Taakbeheer", plan.tasks],
                ].map(([label, value]) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-medium">{value as string}</span>
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm">
                  {plan.prioritySupport
                    ? <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    : <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                  <span className={plan.prioritySupport ? "" : "text-muted-foreground/50"}>
                    Prioriteit support
                  </span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  {plan.teamCollab
                    ? <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    : <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                  <span className={plan.teamCollab ? "" : "text-muted-foreground/50"}>
                    {plan.teamCollab || "Team samenwerking"}
                  </span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  {plan.customAgents
                    ? <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    : <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                  <span className={plan.customAgents ? "" : "text-muted-foreground/50"}>
                    Custom agents
                  </span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  {plan.sla
                    ? <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    : <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                  <span className={plan.sla ? "" : "text-muted-foreground/50"}>
                    {plan.sla || "SLA garantie"}
                  </span>
                </li>
              </ul>

              <button
                onClick={() => setLocation("/dashboard")}
                className={[
                  "w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                  plan.popular
                    ? "text-white hover:opacity-90 hover:shadow-[0_0_24px_rgba(59,130,246,0.4)]"
                    : "border border-primary/30 text-primary hover:bg-primary/10",
                ].join(" ")}
                style={
                  plan.popular
                    ? { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }
                    : {}
                }
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Guarantee bar */}
        <p className="text-center text-sm text-muted-foreground">
          14 dagen gratis proberen · Geen creditcard nodig · Opzeggen wanneer je wilt
        </p>
      </div>
    </section>
  );
}

// ─── Comparison table (shared) ───────────────────────────────────────────────

export function ComparisonSection() {
  function CellValue({ value }: { value: boolean | string }) {
    if (value === true) return <Check className="w-5 h-5 text-green-400 mx-auto" />;
    if (value === false) return <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
    return <span className="text-sm">{value}</span>;
  }

  return (
    <section className="py-24 relative">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold gradient-text mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Waarom DreamTeam?
          </h2>
          <p className="text-muted-foreground">Bekijk hoe DreamTeam zich verhoudt tot de alternatieven.</p>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[rgba(15,22,40,0.9)]">
                  <th className="text-left px-6 py-4 text-muted-foreground font-medium">Feature</th>
                  <th className="px-6 py-4 text-center">
                    <span className="gradient-text font-bold" style={{ fontFamily: "'Clash Display', sans-serif" }}>DreamTeam</span>
                  </th>
                  <th className="px-6 py-4 text-center text-muted-foreground font-medium">Sintra.AI</th>
                  <th className="px-6 py-4 text-center text-muted-foreground font-medium">ChatGPT Plus</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-[rgba(255,255,255,0.01)]" : ""}>
                    <td className="px-6 py-3.5 text-foreground/80">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center bg-[rgba(59,130,246,0.04)] font-medium text-foreground">
                      <CellValue value={row.dreamteam} />
                    </td>
                    <td className="px-6 py-3.5 text-center text-muted-foreground">
                      <CellValue value={row.sintra} />
                    </td>
                    <td className="px-6 py-3.5 text-center text-muted-foreground">
                      <CellValue value={row.chatgpt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function scrollTo(id: string) {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(59,130,246,0.1)]"
      style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(16px)" }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => scrollTo("hero")} className="flex items-center gap-3">
          <Logo />
          <span className="font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            DreamTeam
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Agents", id: "agents" },
            { label: "Pricing", id: "pricing" },
            { label: "Over ons", id: "faq" },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            Open App
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground p-1"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`block h-0.5 bg-current transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block h-0.5 bg-current transition-all ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[rgba(59,130,246,0.1)] py-4 px-6 space-y-3"
          style={{ background: "rgba(5,8,16,0.95)" }}>
          {[{ label: "Agents", id: "agents" }, { label: "Pricing", id: "pricing" }, { label: "Over ons", id: "faq" }].map(({ label, id }) => (
            <button key={id} onClick={() => scrollTo(id)} className="block text-sm text-muted-foreground hover:text-foreground w-full text-left">
              {label}
            </button>
          ))}
          <button
            onClick={() => setLocation("/dashboard")}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            Open App
          </button>
        </div>
      )}
    </header>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-[rgba(59,130,246,0.04)] transition-colors"
      >
        <span className="font-medium text-sm md:text-base">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-[rgba(59,130,246,0.08)]">
          <p className="pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────

export default function Landing() {
  const [, setLocation] = useLocation();

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 mesh-bg grid-pattern" />
        <div className="orb-blue w-[600px] h-[600px] -top-32 -left-32 opacity-40" />
        <div className="orb-purple w-[500px] h-[500px] top-1/3 right-0 opacity-30" />
        <div className="orb-blue w-[300px] h-[300px] bottom-0 left-1/2 opacity-20" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.08)] text-primary">
              <Zap className="w-3 h-3" />
              Nieuw: Custom agent builder beschikbaar
            </div>

            <h1
              className="text-5xl md:text-6xl font-bold leading-[1.05] mb-6"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Jouw AI{" "}
              <span className="gradient-text">DreamTeam.</span>
              <br />
              Klaar om te werken.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
              10 gespecialiseerde AI-medewerkers voor marketing, sales, content, financiën en meer.
              Geen abonnement op ChatGPT. <span className="text-foreground font-medium">Gewoon resultaat.</span>
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setLocation("/dashboard")}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_32px_rgba(59,130,246,0.45)] hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
              >
                Start gratis proefperiode
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTo("agents")}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold border border-[rgba(59,130,246,0.3)] text-foreground hover:bg-[rgba(59,130,246,0.08)] transition-all hover:-translate-y-0.5"
              >
                Bekijk alle agents
              </button>
            </div>
          </div>

          {/* Right: agent card grid */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {AGENTS.slice(0, 4).map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.id}
                  className="glass-card rounded-2xl p-5 hover:-translate-y-1 transition-transform duration-300"
                  style={{ boxShadow: `0 0 24px ${agent.color}18` }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: `linear-gradient(135deg, ${agent.color}25, ${agent.color}10)`,
                      border: `1px solid ${agent.color}40`,
                      boxShadow: `0 0 20px ${agent.color}20`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: agent.color }} />
                  </div>
                  <p className="font-bold text-sm mb-0.5" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                    {agent.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{agent.role}</p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 status-active" />
                    <span className="text-[10px] text-green-400">Online</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ── */}
      <section className="py-12 border-y border-[rgba(59,130,246,0.08)]" style={{ background: "rgba(15,22,40,0.4)" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">4.9/5</span> — Vertrouwd door{" "}
              <span className="text-foreground font-medium">500+ Nederlandse ondernemers</span>
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            {["Kapper & Co", "TechStart NL", "De Groene Winkel", "Hofmann Advies"].map((name) => (
              <span
                key={name}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-[rgba(59,130,246,0.15)] text-muted-foreground bg-[rgba(59,130,246,0.05)]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 relative">
        <div className="orb-purple w-96 h-96 top-0 right-0 opacity-20" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold gradient-text mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Alles wat je nodig hebt
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Gebouwd voor Nederlandse ondernemers die serieus zijn over groei.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Bot, color: "#3b82f6", title: "10 Gespecialiseerde Agents", desc: "Elk getraind op jouw vakgebied. Van marketing tot finance — altijd de juiste expert." },
              { icon: Clock, color: "#8b5cf6", title: "Altijd beschikbaar", desc: "24/7, geen wachttijd, direct antwoord. Jouw team slaapt nooit." },
              { icon: Shield, color: "#34d399", title: "GDPR by design", desc: "EU-servers, jouw data blijft jouw data. Geen gedeeld model, geen datarisico." },
              { icon: Languages, color: "#f472b6", title: "Meertalig", desc: "NL, EN, DE, FR, ES. Spreek je klanten aan in hun eigen taal." },
              { icon: Brain, color: "#fbbf24", title: "Persoonlijk geheugen", desc: "Agents onthouden context van gesprekken en worden steeds beter in hun rol." },
              { icon: Rocket, color: "#60a5fa", title: "Direct inzetbaar", desc: "Geen setup, geen training, geen IT-afdeling nodig. Gewoon inloggen en starten." },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="glass-card rounded-2xl p-6 hover:-translate-y-0.5 transition-transform duration-200"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                    border: `1px solid ${color}35`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-bold mb-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agent Showcase ── */}
      <section id="agents" className="py-24 relative">
        <div className="orb-blue w-80 h-80 top-0 left-0 opacity-20" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold gradient-text mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Maak kennis met je team
            </h2>
            <p className="text-muted-foreground text-lg">
              10 gespecialiseerde agents, elk expert in zijn vakgebied.
            </p>
          </div>

          {/* Horizontally scrollable row */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-thin">
            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.id}
                  className="glass-card rounded-2xl p-5 flex-shrink-0 w-52 hover:-translate-y-1 transition-transform duration-200 cursor-default"
                  style={{ boxShadow: `0 0 20px ${agent.color}15` }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: `linear-gradient(135deg, ${agent.color}30, ${agent.color}12)`,
                      border: `1px solid ${agent.color}45`,
                      boxShadow: `0 0 16px ${agent.color}20`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: agent.color }} />
                  </div>
                  <p className="font-bold text-sm mb-0.5" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                    {agent.name}
                  </p>
                  <p className="text-xs text-primary mb-2">{agent.role}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 relative" style={{ background: "rgba(15,22,40,0.3)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold gradient-text mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Zo werkt het
            </h2>
            <p className="text-muted-foreground text-lg">In drie stappen aan de slag.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {[
              { step: "01", title: "Kies je agent", desc: "Selecteer de specialist die je nodig hebt — van marketeer tot financieel adviseur.", color: "#3b82f6" },
              { step: "02", title: "Geef je opdracht", desc: "Typ je vraag of taak in gewone taal. Geen prompts leren, geen technische kennis nodig.", color: "#8b5cf6" },
              { step: "03", title: "Resultaat klaar", desc: "Je agent werkt direct. Ontvang teksten, analyses, plannen of adviezen in seconden.", color: "#34d399" },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="text-center relative">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold"
                  style={{
                    fontFamily: "'Clash Display', sans-serif",
                    background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                    border: `1px solid ${color}40`,
                    boxShadow: `0 0 24px ${color}20`,
                    color,
                  }}
                >
                  {step}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── Testimonials ── */}
      <section className="py-24 relative" style={{ background: "rgba(15,22,40,0.25)" }}>
        <div className="orb-purple w-96 h-96 -bottom-24 left-1/2 opacity-15" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold gradient-text mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Wat ondernemers zeggen
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "Als zzp'er had ik altijd moeite met marketing. Nova heeft me in 1 week een complete contentkalender gegeven.",
                name: "Marieke van den Berg",
                role: "Fotograaf",
                avatar: "M",
                color: "#f472b6",
              },
              {
                quote: "Rex coacht me wekelijks door mijn salespipeline. Mijn omzet is in 3 maanden met 40% gestegen.",
                name: "Daan Hofmann",
                role: "Sales Consultant",
                avatar: "D",
                color: "#3b82f6",
              },
              {
                quote: "Finn heeft mijn cashflow-probleem opgelost voordat ik het zelf doorhad.",
                name: "Fatima El Amrani",
                role: "Webshop eigenaar",
                avatar: "F",
                color: "#fbbf24",
              },
            ].map(({ quote, name, role, avatar, color }) => (
              <div key={name} className="glass-card rounded-2xl p-7 flex flex-col gap-5">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-[rgba(59,130,246,0.08)]">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <ComparisonSection />

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 relative" style={{ background: "rgba(15,22,40,0.25)" }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold gradient-text mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Veelgestelde vragen
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="orb-blue w-96 h-96 -top-16 left-1/4 opacity-25" />
        <div className="orb-purple w-80 h-80 -bottom-16 right-1/4 opacity-20" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Klaar om jouw{" "}
            <span className="gradient-text">DreamTeam</span>
            {" "}samen te stellen?
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Start vandaag gratis. Geen creditcard nodig. Je eerste resultaten binnen minuten.
          </p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:-translate-y-1"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            Start gratis proefperiode
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[rgba(59,130,246,0.1)] py-12" style={{ background: "rgba(5,8,16,0.9)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-3">
                <Logo />
                <span className="font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>DreamTeam</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI Agent Platform voor Nederlandse Ondernemers. Jouw digitale team, altijd beschikbaar.
              </p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-semibold mb-3 text-foreground">Product</p>
                <ul className="space-y-2">
                  {["Over ons", "Pricing", "Agents"].map((l) => (
                    <li key={l}>
                      <button
                        onClick={() => {
                          if (l === "Pricing") scrollTo("pricing");
                          else if (l === "Agents") scrollTo("agents");
                          else scrollTo("faq");
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-3 text-foreground">Juridisch</p>
                <ul className="space-y-2">
                  {["Privacybeleid", "Algemene Voorwaarden", "Cookie-beleid"].map((l) => (
                    <li key={l}>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        {l}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-3 text-foreground">Contact</p>
                <ul className="space-y-2">
                  <li>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      Contact
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(59,130,246,0.08)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© 2026 DreamTeam. Alle rechten voorbehouden. · KvK: 12345678 · BTW: NL123456789B01</p>
            <p>Gebouwd met ❤️ in Nederland</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
