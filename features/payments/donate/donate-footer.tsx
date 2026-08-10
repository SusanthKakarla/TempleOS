import Image from "next/image";

interface DonateFooterProps {
  templeName: string;
  contactPhone: string | null;
}

/**
 * Minimal, compact footer — just enough to identify the temple and offer a
 * contact number, no navigation. Quick Links and Legal columns were
 * deliberately removed (this page's own header/hero already carries the
 * "Donate Now" CTA, and the legal pages remain reachable from the
 * marketing site's own footer — this page stays focused on the donation
 * flow itself).
 */
export function DonateFooter({ templeName, contactPhone }: DonateFooterProps) {
  return (
    <footer className="mt-4 bg-[#45251F] px-5 py-6 text-[#F3EAE0]/80">
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-1.5 text-center">
        <Image src="/donate-om-medallion.png" alt="" width={32} height={32} className="size-8 opacity-90" />
        <p className="font-heading text-sm text-white">{templeName}</p>
        {contactPhone && <p className="text-xs text-[#E9DED0]/70">Contact: {contactPhone}</p>}
        <p className="mt-1 text-[11px] text-[#E9DED0]/50">Powered by TempleOS</p>
      </div>
    </footer>
  );
}
