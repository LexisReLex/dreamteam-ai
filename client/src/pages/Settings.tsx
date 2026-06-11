import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Bell, Zap, Shield, ChevronRight, Loader2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/LanguageContext";
import { LOCALES } from "@/lib/i18n";
import type { UserProfile } from "@shared/schema";

function PlanFeatureList({ planKey }: { planKey: "pf_starter" | "pf_pro" | "pf_team" }) {
  const { tArr } = useLanguage();
  const feats = tArr(planKey);
  return (
    <div className="grid grid-cols-2 gap-1.5 mb-4">
      {feats.map((f) => (
        <div key={f} className="flex items-center gap-1.5 text-xs text-foreground/80">
          <div className="w-1 h-1 rounded-full bg-purple-400" />
          {f}
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const { t, locale, setLocale } = useLanguage();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery<UserProfile>({ queryKey: ["/api/profile"] });

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const PLAN_CONFIG = {
    starter: { labelKey: "plan_starter" as const, color: "text-gray-400",   pfKey: "pf_starter" as const },
    pro:     { labelKey: "plan_pro" as const,     color: "text-blue-400",   pfKey: "pf_pro" as const    },
    team:    { labelKey: "plan_team" as const,    color: "text-purple-400", pfKey: "pf_team" as const   },
  };

  useEffect(() => {
    if (profile) { setName(profile.name); setCompany(profile.company); }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const planCfg = PLAN_CONFIG[profile?.plan || "starter"];

  return (
    <div className="relative min-h-full mesh-bg grid-pattern">
      <div className="orb-blue w-64 h-64 top-0 right-0 opacity-20" />
      <div className="orb-purple w-48 h-48 bottom-1/3 left-0 opacity-15" />

      <div className="relative z-10 p-6 max-w-3xl mx-auto space-y-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("settings_title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("settings_subtitle")}</p>
        </div>

        {/* Profile */}
        <section className="glass-card rounded-xl p-6 space-y-5" data-testid="section-profile">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("section_profile")}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}
              data-testid="profile-avatar">
              {name?.[0] || "L"}
            </div>
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground">{company}</p>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block", planCfg.color, "bg-current/10")}>
                {t("plan_label", { plan: t(planCfg.labelKey) })}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t("label_name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-name" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t("label_company")}</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)}
                className="bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)] focus:border-primary" data-testid="input-company" />
            </div>
          </div>
          <Button onClick={() => updateMutation.mutate({ name, company })} disabled={updateMutation.isPending} size="sm"
            className="text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }} data-testid="button-save-profile">
            {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            {t("btn_save")}
          </Button>
        </section>

        {/* Language */}
        <section className="glass-card rounded-xl p-6 space-y-4" data-testid="section-language">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("section_language")}</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("language_label")}</p>
              <p className="text-xs text-muted-foreground">NL · EN · DE · FR · ES</p>
            </div>
            <Select value={locale} onValueChange={(v) => setLocale(v as any)}>
              <SelectTrigger className="w-44 bg-[rgba(255,255,255,0.03)] border-[rgba(59,130,246,0.2)]" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0f1e] border-[rgba(59,130,246,0.2)]">
                {LOCALES.map(({ code, label, flag }) => (
                  <SelectItem key={code} value={code}>{flag} {label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Notifications */}
        <section className="glass-card rounded-xl p-6 space-y-4" data-testid="section-notifications">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("section_notifications")}</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "notificationsEmail", labelKey: "notif_email_label" as const, descKey: "notif_email_desc" as const, value: profile?.notificationsEmail ?? true },
              { key: "notificationsPush",  labelKey: "notif_push_label" as const,  descKey: "notif_push_desc" as const,  value: profile?.notificationsPush  ?? true },
              { key: "notificationsWeekly",labelKey: "notif_weekly_label" as const,descKey: "notif_weekly_desc" as const,value: profile?.notificationsWeekly ?? false },
            ].map(({ key, labelKey, descKey, value }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{t(labelKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(descKey)}</p>
                </div>
                <Switch checked={value} onCheckedChange={(v) => updateMutation.mutate({ [key]: v })} data-testid={`toggle-${key}`} />
              </div>
            ))}
          </div>
        </section>

        {/* Plan upgrade CTA */}
        <section className="rounded-xl p-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.12) 100%)", border: "1px solid rgba(139,92,246,0.25)" }}
          data-testid="section-plan-upgrade">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.6), transparent)" }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400">{t("team_plan_badge")}</span>
                </div>
                <h3 className="font-bold text-base mb-1" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("upgrade_title")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("upgrade_desc")}</p>
                <PlanFeatureList planKey="pf_team" />
              </div>
            </div>
            <Button className="gap-2 text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }} data-testid="button-upgrade-plan">
              {t("btn_upgrade")} <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Security */}
        <section className="glass-card rounded-xl p-5" data-testid="section-security">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm" style={{ fontFamily: "'Clash Display', sans-serif" }}>{t("section_security")}</h2>
          </div>
          <div className="space-y-3">
            {([
              ["sec_password", "sec_password_desc"],
              ["sec_2fa",      "sec_2fa_desc"     ],
              ["sec_sessions", "sec_sessions_desc"],
            ] as const).map(([lk, dk]) => (
              <button key={lk} className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[rgba(59,130,246,0.06)] transition-colors group"
                data-testid={`button-security-${lk}`}>
                <div className="text-left">
                  <p className="text-sm font-medium">{t(lk)}</p>
                  <p className="text-xs text-muted-foreground">{t(dk)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
