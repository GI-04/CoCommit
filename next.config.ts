import type { NextConfig } from "next";

// The Tauri desktop build needs plain static files. Tauri sets TAURI_ENV_PLATFORM
// when it runs our build, so only then do we export. The web build keeps the
// server, which API routes (e.g. LiveKit tokens) need.
const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM);

const nextConfig: NextConfig = {
  output: isTauri ? "export" : undefined,
  images: { unoptimized: isTauri },
};

export default nextConfig;
