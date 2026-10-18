import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/brand-image";
import { BRAND } from "@/lib/site";

// The link-preview card for every page (Discord, LINE, X, Slack...), drawn at build time.
export const alt = "CoCommit: git, with buttons. Commit, push and open pull requests without the terminal.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BRAND.canvas, color: "#ffffff" }}>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "72px 80px 0" }}>
          {/* logo.svg's viewBox is 277 × 79 */}
          <img src={logoDataUri("logo.svg")} width={277} height={79} alt="" />
          <div style={{ display: "flex", marginTop: 72, fontSize: 112, lineHeight: 1.05, letterSpacing: "-0.02em" }}>Git, with buttons.</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 38, lineHeight: 1.3, color: BRAND.muted, maxWidth: 940 }}>
            Commit, push and open pull requests without the terminal. Chat, files and AI context for small teams.
          </div>
        </div>
        <div style={{ display: "flex", height: 24 }}>
          {BRAND.blocks.map((c) => (
            <div key={c} style={{ flexGrow: 1, background: c }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
