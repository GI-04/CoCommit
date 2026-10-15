import type { NextConfig } from "next";

// No static export: the Tauri desktop app loads the deployed web URL
// (see src-tauri/tauri.conf.json), so the web build keeps its server and API routes.
const nextConfig: NextConfig = {};

export default nextConfig;
