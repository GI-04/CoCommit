import { appIcon } from "@/lib/brand-image";

// Browser tab and manifest icons (/icon/32, /icon/192, /icon/512), drawn at build time.
export function generateImageMetadata() {
  return [32, 192, 512].map((n) => ({ id: String(n), size: { width: n, height: n }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return appIcon(Number(await id));
}
