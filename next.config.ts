import type { NextConfig } from "next";

// Static export: the app has no backend by design (docs/adr/0001-no-backend-client-side-ai.md).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Pin the workspace root so a stray lockfile above the repo can't widen it.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
