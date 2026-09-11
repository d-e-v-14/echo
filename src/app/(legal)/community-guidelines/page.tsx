import type { Metadata } from "next";
import content from "@/content/legal/community-guidelines.md";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "The community rules and acceptable-use policy for the Echo platform.",
  alternates: { canonical: "/community-guidelines" },
};

export default function CommunityGuidelinesPage() {
  return <LegalDocument content={content} />;
}
