import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { translations, interpolate, type Locale, type TranslationKey } from "./i18n";
import { apiRequest } from "./queryClient";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  tArr: (key: TranslationKey) => string[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("nl");

  // Load locale from profile on mount
  useEffect(() => {
    apiRequest("GET", "/api/profile")
      .then((r) => r.json())
      .then((profile) => {
        if (profile?.language && ["nl","en","de","fr","es"].includes(profile.language)) {
          setLocaleState(profile.language as Locale);
        }
      })
      .catch(() => {/* ignore */});
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    // Persist to backend
    apiRequest("PATCH", "/api/profile", { language: l }).catch(() => {/* ignore */});
  }, []);

  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>): string => {
    const dict = translations[locale] as Record<string, unknown>;
    const fallback = translations.nl as Record<string, unknown>;
    const raw = (dict[key] ?? fallback[key] ?? key) as string | string[];
    const str = Array.isArray(raw) ? raw.join(", ") : raw;
    return vars ? interpolate(str, vars) : str;
  }, [locale]);

  const tArr = useCallback((key: TranslationKey): string[] => {
    const dict = translations[locale] as Record<string, unknown>;
    const fallback = translations.nl as Record<string, unknown>;
    const raw = dict[key] ?? fallback[key] ?? [];
    return Array.isArray(raw) ? raw as string[] : [raw as string];
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, tArr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
