import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { Info, RefreshCcw, Receipt, Ban, Clock, Mail } from "lucide-react";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalSection } from "@/components/legal/legal-section";
import { TableOfContents } from "@/components/legal/table-of-contents";

export const metadata: Metadata = {
  title: "Donation & Refund Policy | TempleOS",
  description: "How donations, receipts, and refunds work for temples using TempleOS's public donation pages.",
};

const LAST_UPDATED = "August 7, 2026";
const EFFECTIVE_DATE = "August 7, 2026";

const sections: { id: string; title: string; icon: LucideIcon }[] = [
  { id: "overview", title: "Overview", icon: Info },
  { id: "how-refunds-work", title: "How Refunds Work", icon: RefreshCcw },
  { id: "donation-receipts", title: "Donation Receipts", icon: Receipt },
  { id: "non-refundable", title: "Non-Refundable Circumstances", icon: Ban },
  { id: "processing-time", title: "Processing Time", icon: Clock },
  { id: "contact", title: "Contact Us", icon: Mail },
];

export default function DonationRefundPolicyPage() {
  return (
    <>
      <LegalHero
        eyebrow="Donation & Refund Policy"
        title="Donation & Refund Policy"
        description="Plain-language explanation of how donations, receipts, and refunds are handled on a temple's TempleOS donation page."
        lastUpdated={LAST_UPDATED}
        effectiveDate={EFFECTIVE_DATE}
      />

      <div className="border-b border-border bg-background lg:hidden">
        <nav aria-label="Table of contents" className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {sections.map((entry) => (
            <a
              key={entry.id}
              href={`#${entry.id}`}
              className="shrink-0 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            >
              {entry.title}
            </a>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-10">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <TableOfContents
            entries={sections.map(({ id, title, icon: Icon }) => ({
              id,
              title,
              icon: <Icon className="size-3.5 shrink-0" aria-hidden="true" />,
            }))}
          />
        </aside>

        <div className="space-y-6">
          <LegalSection id="overview" title="Overview" icon={Info}>
            <p>
              Donations made through a temple&apos;s TempleOS public donation page are voluntary contributions
              to that temple, collected on the temple&apos;s behalf. TempleOS provides the software and payment
              infrastructure; the temple receiving the donation is responsible for how the funds are used.
              This policy explains how refunds, receipts, and payment issues are handled.
            </p>
            <p>
              This policy is effective as of {EFFECTIVE_DATE} and was last updated on {LAST_UPDATED}.
            </p>
          </LegalSection>

          <LegalSection id="how-refunds-work" title="How Refunds Work" icon={RefreshCcw}>
            <p>
              Refunds are <strong>temple-initiated</strong>, not automatic. If a donor believes a donation was
              made in error (for example, a duplicate payment or an incorrect amount), they should contact the
              temple directly using the contact details on the temple&apos;s donation page or profile.
            </p>
            <ul>
              <li>A temple administrator reviews the request and, where appropriate, initiates a refund from the dashboard.</li>
              <li>Refunds are processed back to the <strong>original payment method</strong> used for the donation (the same UPI account, card, or bank account the payment came from).</li>
              <li>TempleOS does not independently decide whether a refund is granted — that decision rests with the temple.</li>
            </ul>
          </LegalSection>

          <LegalSection id="donation-receipts" title="Donation Receipts" icon={Receipt}>
            <p>
              A confirmation is sent to the donor once a payment is successfully captured. Where a temple has
              receipt generation configured, a formal receipt is also issued. Donors who do not receive a
              receipt, or who need a reissued copy for tax purposes, should contact the temple directly — the
              temple, not TempleOS, is the party issuing the receipt.
            </p>
          </LegalSection>

          <LegalSection id="non-refundable" title="Non-Refundable Circumstances" icon={Ban}>
            <p>Refunds are generally not available once a donation has been:</p>
            <ul>
              <li>Confirmed and used by the temple for its stated purpose.</li>
              <li>Made with the donor&apos;s full knowledge and intent — a change of mind after a successful, correctly-processed donation is not, by itself, grounds for a refund.</li>
              <li>Made anonymously with no way to verify or contact the original donor.</li>
            </ul>
            <p>
              Genuine errors — duplicate charges, an incorrect amount entered, or a payment that failed on the
              donor&apos;s end but was still charged — are the cases refunds are intended to cover. Contact the
              temple as soon as possible if any of these apply.
            </p>
          </LegalSection>

          <LegalSection id="processing-time" title="Processing Time" icon={Clock}>
            <p>
              Once a temple approves a refund, it is submitted to the original payment provider. Funds
              typically reach the donor&apos;s original payment method within <strong>5–7 business days</strong>,
              though the exact timing depends on the donor&apos;s bank or UPI app and is outside TempleOS&apos;s
              or the temple&apos;s direct control.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="Contact Us" icon={Mail}>
            <p>
              For questions about a specific donation, contact the temple directly using the details on its
              donation page. For questions about this policy or the TempleOS platform, contact us at{" "}
              <a href="mailto:privacy@trytempleos.com">privacy@trytempleos.com</a>.
            </p>
          </LegalSection>
        </div>
      </div>
    </>
  );
}
