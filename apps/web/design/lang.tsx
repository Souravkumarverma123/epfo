"use client";

/** Site-wide language toggle. One provider, read anywhere with useLang(). */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

interface LangContextValue {
  lang: Locale;
  setLang: (lang: Locale) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Locale>("en");

  // Keep <html lang> in step with the toggle (WCAG 2.2 AA, 3.1.1 Language of
  // Page). Without this the document stays lang="en" while showing Devanagari,
  // and a screen reader announces Hindi with an English voice — which is not a
  // cosmetic problem, it is unintelligible. The switch is client-side, so this
  // is the only place that knows the real answer; the server cannot render it.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider> (see SiteShell)");
  return ctx;
}

/** Common chrome strings (header/footer). Page content keeps its own copy. */
export const CHROME_COPY: Record<
  Locale,
  {
    langSwitch: string;
    helpline: string;
    service: string;
    signout: string;
    employeeLogin: string;
    employerLogin: string;
  }
> = {
  en: {
    langSwitch: "हिन्दी में देखें",
    helpline: "Helpline 1800 118 005",
    service: "EPFO One",
    signout: "Sign out",
    employeeLogin: "Employee Login",
    employerLogin: "Employer Login",
  },
  hi: {
    langSwitch: "View in English",
    helpline: "हेल्पलाइन 1800 118 005",
    service: "ईपीएफओ ऑनलाइन",
    signout: "साइन आउट",
    employeeLogin: "कर्मचारी लॉगिन",
    employerLogin: "नियोक्ता लॉगिन",
  },
};
