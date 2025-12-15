import type { Metadata } from "next";
import "../app/globals.css";
import { MinimizedCallBar } from "@/components/MinimizedCallBar";


export const metadata: Metadata = {
  title: {
    default: "Echo",
    template: "%s • Echo",
  },
  description:
    "Echo is a real-time communication platform by IEEE Computer Society VIT, featuring servers, channels, voice calls, and instant messaging for seamless collaboration.",
  applicationName: "Echo",
  metadataBase: new URL("https://echo.ieeecsvit.com"),
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  keywords: [
    "Echo",
    "IEEE CS VIT",
    "IEEE Computer Society VIT",
    "real-time chat",
    "voice channels",
    "messaging platform",
    "collaboration tool",
    "Discord alternative",
  ],
  authors: [
    { name: "IEEE Computer Society VIT" },
  ],
  creator: "IEEE Computer Society VIT",
  publisher: "IEEE Computer Society VIT",
  openGraph: {
    title: "Echo",
    description:
      "Echo is a modern real-time communication platform built by IEEE Computer Society VIT with voice, text, and server-based collaboration.",
    url: "https://echo.ieeecsvit.com",
    siteName: "Echo",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The <html> tag is required here
    <html lang="en">
      {/* The <body> tag is also required */}
      <body>
        {/* 'children' will be replaced by your page content */}
        {children}
        {/* Minimized call bar - shows when user navigates away from active call */}
        <MinimizedCallBar />
      </body>
    </html>
  );
}