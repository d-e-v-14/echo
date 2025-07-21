// src/app/(app)/layout.tsx
import Sidebar from "@/components/Sidebar";
import "../globals.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <body className="flex">
        <Sidebar />
        <main className="flex-1">{children}</main>
        </body>
    );
}
