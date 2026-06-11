import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

interface Props {
  collapsed?: boolean;
}

export default function LanguageSwitcher({ collapsed = false }: Props) {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === locale)!;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        data-testid="button-language-switcher"
        title={t("section_language")}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all text-xs font-medium",
          "text-muted-foreground hover:text-foreground hover:bg-[rgba(59,130,246,0.08)] border border-transparent hover:border-[rgba(59,130,246,0.15)]",
          collapsed ? "justify-center" : ""
        )}
      >
        <Globe className="w-4 h-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="text-base leading-none">{current.flag}</span>
            <span className="flex-1 text-left truncate">{current.label}</span>
          </>
        )}
        {collapsed && <span className="text-base leading-none sr-only">{current.flag}</span>}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 rounded-xl overflow-hidden shadow-xl",
            "bg-[#0a0f1e] border border-[rgba(59,130,246,0.25)]",
            "shadow-[0_8px_32px_rgba(59,130,246,0.15)]",
            collapsed
              ? "left-full top-0 ml-2 w-44"
              : "bottom-full mb-2 left-0 right-0"
          )}
          data-testid="dropdown-language"
        >
          {LOCALES.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => { setLocale(code); setOpen(false); }}
              data-testid={`lang-option-${code}`}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors",
                code === locale
                  ? "bg-[rgba(59,130,246,0.15)] text-primary font-medium"
                  : "text-muted-foreground hover:bg-[rgba(59,130,246,0.08)] hover:text-foreground"
              )}
            >
              <span className="text-base">{flag}</span>
              <span>{label}</span>
              {code === locale && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
