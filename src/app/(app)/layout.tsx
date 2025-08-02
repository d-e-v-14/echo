// src/app/(app)/layout.tsx
import Sidebar from "@/components/Sidebar";
import "../globals.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
