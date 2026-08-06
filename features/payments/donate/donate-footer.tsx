import Link from "next/link";

interface DonateFooterProps {
  templeName: string;
}

/** Minimal — temple name + the two real legal pages this app already has (not stubs) + a TempleOS credit line. No nav, no marketing chrome (this page must only carry the temple's own branding, see (donate)/layout.tsx's doc comment). */
export function DonateFooter({ templeName }: DonateFooterProps) {
  return (
    <footer className="mt-10 border-t border-[#F3E7DA] px-5 py-8 text-center text-xs text-[#8C7B6D]">
      <p className="text-[#6B5B4F]">{templeName}</p>
      <div className="mt-2 flex items-center justify-center gap-3">
        <Link href="/privacy-policy" className="hover:text-[#F97316] hover:underline">
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms-of-service" className="hover:text-[#F97316] hover:underline">
          Terms
        </Link>
      </div>
      <p className="mt-2">Powered by TempleOS</p>
    </footer>
  );
}
