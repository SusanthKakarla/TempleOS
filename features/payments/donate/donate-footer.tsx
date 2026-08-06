interface DonateFooterProps {
  templeName: string;
}

/** Deliberately one line — no nav, no links, no TempleOS marketing chrome (this page must only carry the temple's own branding, see (donate)/layout.tsx's doc comment). */
export function DonateFooter({ templeName }: DonateFooterProps) {
  return (
    <footer className="border-t border-[#2D2D2D]/8 px-5 py-8 text-center text-xs text-[#2D2D2D]/50">
      <p>{templeName}</p>
      <p className="mt-1">Powered by TempleOS</p>
    </footer>
  );
}
