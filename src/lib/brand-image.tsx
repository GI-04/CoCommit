import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/site";

// Server only: the icons and the share image are drawn at build time from the logo files in public/,
// so the logo has one source. Both files use fill="currentColor", which an <img> can't inherit.
export function logoDataUri(file: "logo.svg" | "logo-mark.svg", color = "#ffffff"): string {
  const svg = readFileSync(path.join(process.cwd(), "public", file), "utf8").replaceAll("currentColor", color);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// The app icon: the white logo mark on CoCommit blue. `rounded` for browser tabs and the manifest;
// Apple rounds the home-screen icon itself, so apple-icon passes false.
export function appIcon(size: number, rounded = true): ImageResponse {
  const mark = Math.round(size * 0.72);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.blue,
          borderRadius: rounded ? Math.round(size * 0.22) : 0,
        }}
      >
        {/* logo-mark.svg's viewBox is 68 × 40 */}
        <img src={logoDataUri("logo-mark.svg")} width={mark} height={Math.round((mark * 40) / 68)} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
