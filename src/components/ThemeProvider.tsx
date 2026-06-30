"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Props = {
  children: React.ReactNode;
};

type ThemeSettings = {
  theme: "dark" | "light";
  card: "solid" | "glass";
  density: "compact" | "regular" | "comfortable";
  accent: string;
};

type ThemeContextValue = {
  settings: ThemeSettings;
  setSetting: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
};

const DEFAULT_SETTINGS: ThemeSettings = {
  theme: "light",
  card: "solid",
  density: "regular",
  accent: "#0035A8",
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: Props) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
    document.body.dataset.card = settings.card;
    document.body.dataset.density = settings.density;
    document.documentElement.style.setProperty("--accent", settings.accent);
  }, [settings]);

  const value = useMemo<ThemeContextValue>(() => ({
    settings,
    setSetting: (key, value) => setSettings((prev) => ({ ...prev, [key]: value })),
  }), [settings]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}

export default ThemeProvider;
