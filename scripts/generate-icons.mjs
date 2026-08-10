// Renders the PNG app icons from the SVGs beside them, under public/icons/.
// The output is committed, so this only needs re-running when an icon's drawing changes.
// Usage: npm run icons:generate
//
// PNG at all, when the SVGs are the drawings: Android's install prompt and iOS's home screen both
// want raster icons at known sizes, and iOS ignores an SVG entirely. The SVGs stay the source, and
// the manifest offers both.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const iconsDir = fileURLToPath(new URL("../public/icons/", import.meta.url));

/** Each PNG the app ships, and the drawing and size it is rendered from. */
const ICONS = [
  { from: "icon.svg", to: "icon-192.png", size: 192 },
  { from: "icon.svg", to: "icon-512.png", size: 512 },
  { from: "icon-maskable.svg", to: "icon-maskable-512.png", size: 512 },
  // Apple's home screen mask cuts the corners itself, so this is the full-bleed drawing.
  { from: "icon-maskable.svg", to: "apple-touch-icon.png", size: 180 },
];

/**
 * Turning an SVG into a PNG needs a renderer this repo does not ship. rsvg-convert is the portable
 * one (`brew install librsvg`, `apt install librsvg2-bin`); sips comes with macOS and is what saves
 * a maintainer on a Mac from installing anything. ImageMagick is deliberately not in this list —
 * its built-in SVG renderer drops the stroked paths these icons are drawn with, and it produces a
 * plain dark square rather than failing.
 */
const RENDERERS = [
  {
    command: "rsvg-convert",
    argsFor: (from, to, size) => ["-w", String(size), "-h", String(size), "-o", to, from],
  },
  {
    command: "sips",
    argsFor: (from, to, size) => [
      "-s",
      "format",
      "png",
      "--resampleHeightWidth",
      String(size),
      String(size),
      from,
      "--out",
      to,
    ],
  },
];

/** Renders one icon with the first renderer that turns out to be installed. */
function render(from, to, size) {
  for (const { command, argsFor } of RENDERERS) {
    try {
      execFileSync(command, argsFor(`${iconsDir}${from}`, `${iconsDir}${to}`, size), { stdio: "ignore" });
      return command;
    } catch (error) {
      // Not installed — try the next one. Anything else is this renderer failing at its job.
      if (error.code !== "ENOENT") throw error;
    }
  }

  const names = RENDERERS.map(({ command }) => command).join(" or ");
  throw new Error(`No SVG renderer found — install ${names} and run this again`);
}

for (const { from, to, size } of ICONS) {
  const renderer = render(from, to, size);
  console.log(`${to} — ${size}x${size} from ${from}, with ${renderer}`);
}

console.log(`Wrote ${ICONS.length} icons to ${iconsDir}`);
