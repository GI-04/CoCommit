import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
  description: "CoCommit's privacy policy, cookies and browser storage, terms of service and copyright notice.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
