"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { normalizeThemePreference, type ThemePreference } from "./theme-preference";

const options: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Usar configuración del sistema" },
];

export function ThemeSelect({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const Icon = preference === "dark" ? Moon : preference === "light" ? Sun : SunMoon;

  return (
    <label className={`flex items-center gap-2 ${compact ? "min-w-0" : "rounded-xl border border-default bg-surface px-3 py-2.5"}`}>
      <Icon aria-hidden="true" size={16} className="shrink-0 text-accent" />
      <span className={compact ? "min-w-0 flex-1 text-xs font-semibold text-secondary" : "sr-only"}>Apariencia</span>
      <select
        aria-label="Apariencia"
        value={preference}
        onChange={(event) => setPreference(normalizeThemePreference(event.target.value))}
        className="min-h-9 min-w-0 flex-1 rounded-lg border border-default bg-surface px-2 text-sm text-primary outline-none transition focus-visible:ring-2 focus-visible:ring-focus"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
