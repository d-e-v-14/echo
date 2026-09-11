import Link from "next/link";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/community-guidelines", label: "Community Guidelines" },
  { href: "/eula", label: "EULA" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="font-jersey text-3xl leading-none text-white transition-opacity hover:opacity-80"
          >
            echo
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm leading-6 text-white/45">
          <p>
            IEEE Computer Society VIT, VIT University, Katpadi, Vellore - 632014,
            Tamil Nadu, India.
          </p>
          <p className="mt-1">
            Contact:{" "}
            <a
              href="mailto:tech.ieeecsvit@gmail.com"
              className="text-[#FFC341] underline underline-offset-2 hover:text-[#ffd166]"
            >
              tech.ieeecsvit@gmail.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
