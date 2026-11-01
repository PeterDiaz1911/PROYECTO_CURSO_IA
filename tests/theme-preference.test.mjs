import test from "node:test";
import assert from "node:assert/strict";
import { normalizeThemePreference, resolveTheme, themeStorageKey } from "../src/features/theme/theme-preference.ts";

test("theme preference accepts only the three supported appearance modes", () => {
  assert.equal(normalizeThemePreference("light"), "light");
  assert.equal(normalizeThemePreference("dark"), "dark");
  assert.equal(normalizeThemePreference("system"), "system");
  assert.equal(normalizeThemePreference("nativa-auth"), "system");
  assert.equal(normalizeThemePreference(null), "system");
});

test("system appearance follows the OS while explicit choices remain stable", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("appearance preference uses storage isolated from authentication", () => {
  assert.equal(themeStorageKey, "agricola-theme-preference");
  assert.notEqual(themeStorageKey, "nativa-auth");
});
