import { appIcon } from "@/lib/brand-image";

// iPhone / iPad home-screen icon. Square: iOS rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(180, false);
}
