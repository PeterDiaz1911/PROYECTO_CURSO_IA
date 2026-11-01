export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const themeStorageKey = "agricola-theme-preference";

export function normalizeThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemIsDark ? "dark" : "light") : preference;
}

export const themeBootstrapScript = `(()=>{let p=null;try{p=localStorage.getItem("${themeStorageKey}")}catch{}try{const m=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=p==="light"||p==="dark"?p:m?"dark":"light"}catch{document.documentElement.dataset.theme=p==="dark"?"dark":"light"}})();`;
