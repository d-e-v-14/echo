import type { Metadata } from "next";
import content from "@/content/legal/privacy-policy.md";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Echo, operated by IEEE Computer Society VIT, collects, uses, stores, and shares your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return <LegalDocument content={content} />;
}
