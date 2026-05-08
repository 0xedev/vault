"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeSettings = {
  theme: "dark" | "light";
  card: "solid" | "glass";
  density: "compact" | "regular" | "comfortable";
  accent: string;
};

const defaults: ThemeSettings = {
  theme: "dark",
  card: "solid",
  density: "regular",
  accent: "#7CFFB2",
};

const ThemeContext = createContext<{
  settings: ThemeSettings;
  setSetting: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
}>({ settings: defaults, setSetting: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(defaults);

  const setSetting = useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
    document.body.dataset.card = settings.card;
    document.body.dataset.density = settings.density;

    const isAdmin = document.body.dataset.role === "admin";
    const accent = isAdmin ? "#FF6B6B" : settings.accent;
    document.documentElement.style.setProperty("--accent", accent);

    const c = accent;
    const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
    const lum = (0.299*r + 0.587*g + 0.114*b);
    document.documentElement.style.setProperty("--accent-ink", lum > 160 ? "#052817" : "#FFFFFF");
  }, [settings]);

  return (
    <ThemeContext.Provider value={{ settings, setSetting }}>
      {children}
    </ThemeContext.Provider>
  );
}
