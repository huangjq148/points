export type ThemeMode = "light" | "dark";
export type ThemeScope = "parent" | "child";

export const THEME_STORAGE_KEYS: Record<ThemeScope, string> = {
  parent: "little_achievers_parent_theme",
  child: "little_achievers_theme",
};

export function readStoredTheme(scope: ThemeScope): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEYS[scope]);
  return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
}

export function resolvePreferredTheme(scope: ThemeScope): ThemeMode {
  if (typeof window === "undefined") return "light";

  const storedTheme = readStoredTheme(scope);
  if (storedTheme) return storedTheme;

  const otherScope: ThemeScope = scope === "parent" ? "child" : "parent";
  const otherTheme = readStoredTheme(otherScope);
  if (otherTheme) return otherTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setThemeStorage(scope: ThemeScope, theme: ThemeMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEYS[scope], theme);
}

export function applyDocumentTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.style.colorScheme = theme;
}
