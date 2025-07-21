// src/app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Echo Web",
  description: "Your chat app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en">
      <body>{children}</body>
      </html>
  );
}
