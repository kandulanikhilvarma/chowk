// Fails when a text or UI color pair in app/globals.css misses WCAG AA, in light or dark.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const light = {};
const dark = {};
for (const [, name, l, d] of css.matchAll(/--([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi)) {
  light[name] = l;
  dark[name] = d;
}

const luminance = (hex) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background]. Every pair carries body text, so each needs 4.5:1.
const pairs = [
  ["ink", "bg"], ["ink", "surface"], ["ink", "surface-2"],
  ["ink-2", "bg"], ["ink-2", "surface"], ["ink-2", "surface-2"],
  ["primary", "bg"], ["primary", "surface"], ["primary", "primary-soft"],
  ["on-primary", "primary"], ["on-primary", "primary-hover"],
  ["on-accent", "accent"],
  ["success", "surface"], ["success", "success-soft"],
  ["danger", "surface"], ["danger", "danger-soft"],
];

let failed = 0;
for (const [theme, tokens] of [["light", light], ["dark", dark]]) {
  for (const [fg, bg] of pairs) {
    if (!tokens[fg] || !tokens[bg]) {
      console.error(`missing token: ${fg} or ${bg}`);
      failed++;
      continue;
    }
    const r = ratio(tokens[fg], tokens[bg]);
    if (r < 4.5) {
      console.error(`${theme}: ${fg} on ${bg} = ${r.toFixed(2)} (needs 4.5)`);
      failed++;
    }
  }
}

if (failed) process.exit(1);
console.log(`contrast: ${pairs.length * 2} pairs pass WCAG AA`);
