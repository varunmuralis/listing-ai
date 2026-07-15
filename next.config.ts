import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root: several lockfiles exist above this dir.
  turbopack: { root: projectRoot },
  images: {
    remotePatterns: [
      // Deterministic dev fixture placeholder images.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // Supabase Storage public buckets (production images).
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
