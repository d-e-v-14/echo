// app/layout.tsx
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // adjust path as needed

export const metadata = {
  title: "Echo Web",
  description: "Your chat app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
