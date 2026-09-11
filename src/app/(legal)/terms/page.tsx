import type { Metadata } from "next";
import content from "@/content/legal/terms-of-service.md";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your access to and use of Echo, operated by IEEE Computer Society VIT.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  return <LegalDocument content={content} />;
}
