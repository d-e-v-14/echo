import type { Metadata } from "next";
import content from "@/content/legal/eula.md";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "End User License Agreement",
  description:
    "The End User License Agreement for the Echo mobile application.",
  alternates: { canonical: "/eula" },
};

export default function EulaPage() {
  return <LegalDocument content={content} />;
}
