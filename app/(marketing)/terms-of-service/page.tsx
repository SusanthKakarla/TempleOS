import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  FileCheck2,
  BadgeCheck,
  UserCog,
  Users,
  MessageSquare,
  CreditCard,
  CalendarCheck,
  Undo2,
  Copyright,
  ShieldCheck,
  Ban,
  ShieldAlert,
  AlertTriangle,
  Handshake,
  Scale,
  Gavel,
  FileEdit,
  Mail,
} from "lucide-react";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalSection } from "@/components/legal/legal-section";
import { TableOfContents } from "@/components/legal/table-of-contents";

export const metadata: Metadata = {
  title: "Terms of Service | TempleOS",
  description:
    "The terms governing use of the TempleOS temple management platform, including donations, seva bookings, and WhatsApp Business Platform messaging.",
};

const LAST_UPDATED = "July 20, 2026";
const EFFECTIVE_DATE = "July 20, 2026";

const sections: { id: string; title: string; icon: LucideIcon }[] = [
  { id: "acceptance", title: "Acceptance of Terms", icon: FileCheck2 },
  { id: "eligibility", title: "Eligibility", icon: BadgeCheck },
  { id: "temple-admin-responsibilities", title: "Temple Admin Responsibilities", icon: UserCog },
  { id: "devotee-responsibilities", title: "Devotee Responsibilities", icon: Users },
  { id: "whatsapp-usage", title: "WhatsApp Business Usage & Meta Compliance", icon: MessageSquare },
  { id: "donations", title: "Donation Terms", icon: CreditCard },
  { id: "seva-bookings", title: "Seva Booking Terms", icon: CalendarCheck },
  { id: "cancellation-refunds", title: "Cancellation & Refund Disclaimer", icon: Undo2 },
  { id: "intellectual-property", title: "Intellectual Property", icon: Copyright },
  { id: "acceptable-use", title: "Acceptable Use Policy", icon: ShieldCheck },
  { id: "suspension-termination", title: "Suspension or Termination", icon: Ban },
  { id: "liability", title: "Limitation of Liability", icon: ShieldAlert },
  { id: "warranties", title: "Disclaimer of Warranties", icon: AlertTriangle },
  { id: "indemnification", title: "Indemnification", icon: Handshake },
  { id: "governing-law", title: "Governing Law", icon: Scale },
  { id: "dispute-resolution", title: "Dispute Resolution", icon: Gavel },
  { id: "changes", title: "Changes to These Terms", icon: FileEdit },
  { id: "contact", title: "Contact Details", icon: Mail },
];

export default function TermsOfServicePage() {
  return (
    <>
      <LegalHero
        eyebrow="Terms of Service"
        title="Terms of Service"
        description="These terms govern access to and use of TempleOS by temple administrators and devotees interacting with a temple through our platform, including via WhatsApp."
        lastUpdated={LAST_UPDATED}
        effectiveDate={EFFECTIVE_DATE}
      />

      <div className="border-b border-border bg-background lg:hidden">
        <nav
          aria-label="Table of contents"
          className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6"
        >
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
          <LegalSection id="acceptance" title="Acceptance of Terms" icon={FileCheck2}>
            <p>
              These Terms of Service (&quot;<strong>Terms</strong>&quot;) govern your access to and use of
              TempleOS — the software platform, dashboard, WhatsApp chatbot, and related services
              provided by TempleOS (&quot;<strong>we</strong>&quot;, &quot;<strong>us</strong>&quot;). By
              creating a temple account, logging into the TempleOS dashboard, booking a seva, making a
              donation, or interacting with a temple through TempleOS-powered WhatsApp messaging, you
              agree to be bound by these Terms and our <a href="/privacy-policy">Privacy Policy</a>. If
              you do not agree to these Terms, do not use TempleOS.
            </p>
            <p>
              <strong>TempleOS is a software platform, not a temple.</strong> We provide the technology
              that temples use to manage their profile, sevas, donations, events, and devotee
              communication. TempleOS does not own, operate, or exercise religious authority over any
              temple, and is not a party to the relationship between a devotee and a temple beyond
              providing the platform that connects them.
            </p>
            <p>
              A temple administrator accepting these Terms on behalf of a temple represents that they are
              authorized to do so, and that the temple will ensure its staff and volunteers comply with
              these Terms when using the platform.
            </p>
          </LegalSection>

          <LegalSection id="eligibility" title="Eligibility" icon={BadgeCheck}>
            <p>
              To use TempleOS you must be able to form a legally binding contract under applicable law.
              Temple administrator accounts are intended for adults (18 years or older) acting on behalf
              of, or with the authorization of, the temple they register. Devotees interacting with a
              temple through WhatsApp or a booking page are expected to provide accurate information and,
              where a minor is registered as a dependent for seva or event purposes, this must be done by
              a parent, guardian, or the temple administrator on the minor&apos;s behalf.
            </p>
          </LegalSection>

          <LegalSection id="temple-admin-responsibilities" title="Temple Admin Responsibilities" icon={UserCog}>
            <p>Temple administrators are solely responsible for the content and configuration of their own temple account, including:</p>
            <ul>
              <li>The accuracy of temple profile information, seva schedules, pricing, and event details published through the dashboard.</li>
              <li>Obtaining valid devotee consent before collecting personal information or sending WhatsApp messages.</li>
              <li>Keeping devotee data confidential and using it only for legitimate temple administration purposes.</li>
              <li>Keeping login credentials and OTP-based access confidential and not sharing administrator access with unauthorized individuals.</li>
              <li>Setting and honoring the temple&apos;s own seva booking, cancellation, and refund policies.</li>
              <li>Complying with all applicable laws, including tax laws relating to donations, when operating their temple account.</li>
            </ul>
            <p>
              <strong>TempleOS does not verify the authenticity, accuracy, or completeness of religious,
              doctrinal, or factual information a temple publishes.</strong> Devotees should direct any
              questions about a temple&apos;s practices, sevas, or events to that temple directly.
            </p>
          </LegalSection>

          <LegalSection id="devotee-responsibilities" title="Devotee Responsibilities" icon={Users}>
            <p>Devotees using TempleOS to interact with a temple agree to:</p>
            <ul>
              <li>Provide accurate registration, contact, and payment information.</li>
              <li>Use the platform only for legitimate personal purposes related to seva bookings, donations, and temple communication.</li>
              <li>Not impersonate another person or misuse another devotee&apos;s information.</li>
              <li>Not attempt to disrupt, reverse engineer, or gain unauthorized access to the platform or a temple&apos;s WhatsApp chatbot.</li>
              <li>Understand that any booking, donation, or communication policy set by a temple is the temple&apos;s own, and not set by TempleOS.</li>
            </ul>
          </LegalSection>

          <LegalSection id="whatsapp-usage" title="WhatsApp Business Usage & Meta Compliance" icon={MessageSquare}>
            <p>
              TempleOS messaging is powered by <strong>Meta&apos;s WhatsApp Business Platform</strong>{" "}
              (WhatsApp Cloud API). By opting in to WhatsApp communication from a temple, you agree that:
            </p>
            <ul>
              <li>
                You are <strong>explicitly opting in</strong> before receiving event reminders, temple
                announcements, booking confirmations, or donation receipts over WhatsApp.
              </li>
              <li>
                You may <strong>opt out at any time</strong> by replying <strong>&quot;STOP&quot;</strong>{" "}
                (or another supported mechanism made available by the temple, such as a dashboard-managed
                unsubscribe request) to stop receiving further messages.
              </li>
              <li>
                Message delivery depends on Meta&apos;s services, your device, and your carrier, and{" "}
                <strong>may occasionally be delayed or unavailable</strong> for reasons outside
                TempleOS&apos;s control.
              </li>
              <li>
                TempleOS and every temple using the platform must comply with{" "}
                <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noreferrer">
                  Meta&apos;s WhatsApp Business Messaging Policy
                </a>
                , including its prohibition on unsolicited marketing and content unrelated to temple
                activities.
              </li>
              <li>
                <strong>TempleOS is not responsible for WhatsApp message delivery failures, delays, or
                account restrictions caused by Meta</strong>, including issues arising from changes to
                Meta&apos;s platform, policies, or infrastructure.
              </li>
            </ul>
          </LegalSection>

          <LegalSection id="donations" title="Donation Terms" icon={CreditCard}>
            <p>
              TempleOS facilitates the recording and, where enabled, online processing of donations made
              to a temple. Donations are processed through secure{" "}
              <strong>third-party payment gateways</strong>;{" "}
              <strong>TempleOS never stores card numbers, CVVs, or banking credentials</strong>. TempleOS
              records only the donation amount, timestamp, donor reference, and receipt details necessary
              for the temple&apos;s accounting and for issuing donation receipts.
            </p>
            <p>
              Donations are made directly to the receiving temple, not to TempleOS. Refund requests,
              receipt corrections, and tax-exemption documentation are the responsibility of the temple,
              though TempleOS provides the tools to generate and reissue receipts on the temple&apos;s
              behalf.{" "}
              <strong>TempleOS is not responsible for payment gateway failures, declined transactions,
              or settlement delays</strong> — these are governed by the applicable payment gateway&apos;s
              own terms.
            </p>
          </LegalSection>

          <LegalSection id="seva-bookings" title="Seva Booking Terms" icon={CalendarCheck}>
            <p>
              Seva bookings made through TempleOS are subject to availability and to the specific policies
              of the temple offering the seva, including pricing, rescheduling, and cancellation rules set
              by that temple. TempleOS provides the booking and confirmation infrastructure; the temple is
              responsible for performing the seva and for setting and honoring its own booking policies.
              Booking confirmations are sent via WhatsApp and/or the dashboard once a booking is accepted.
            </p>
          </LegalSection>

          <LegalSection id="cancellation-refunds" title="Cancellation & Refund Disclaimer" icon={Undo2}>
            <p>
              Cancellation windows, eligibility for rescheduling, and refund amounts for sevas and
              donations are determined entirely by the individual temple, not by TempleOS. TempleOS does
              not guarantee that any booking or donation is refundable, and disputes over cancellations or
              refunds should be raised directly with the temple. Where a temple processes a refund through
              its connected payment gateway, settlement timing is subject to that gateway&apos;s own
              processing times.
            </p>
          </LegalSection>

          <LegalSection id="intellectual-property" title="Intellectual Property" icon={Copyright}>
            <p>
              The TempleOS name, logo, software, dashboard design, and underlying technology are the
              property of TempleOS and its licensors, and are protected by applicable intellectual
              property laws. These Terms do not grant any ownership rights in the platform. Temples retain
              ownership of their own devotee data, content, branding, and imagery uploaded to the
              platform, and grant TempleOS a limited license to host, process, and display that content
              solely to operate the temple&apos;s account.
            </p>
          </LegalSection>

          <LegalSection id="acceptable-use" title="Acceptable Use Policy" icon={ShieldCheck}>
            <p>When using TempleOS, you agree not to:</p>
            <ul>
              <li>Use the platform for any unlawful purpose or in violation of any applicable law or regulation.</li>
              <li>Send unsolicited marketing, spam, or content unrelated to temple activities over WhatsApp or any other channel.</li>
              <li>Upload content that is defamatory, fraudulent, or infringes another party&apos;s intellectual property or religious sensitivities without authorization.</li>
              <li>Attempt to probe, scan, or test the vulnerability of the platform, or interfere with its normal operation.</li>
              <li>Use another person&apos;s account or devotee identity without authorization.</li>
              <li>Resell, sublicense, or provide third-party access to TempleOS without our written consent.</li>
            </ul>
          </LegalSection>

          <LegalSection id="suspension-termination" title="Suspension or Termination" icon={Ban}>
            <p>
              A temple administrator may close their TempleOS account at any time by contacting us.
              TempleOS may suspend or terminate access to the platform, with or without notice, if a user
              violates these Terms, misuses devotee data, engages in fraudulent activity, violates
              Meta&apos;s WhatsApp policies, or poses a security risk to the platform or its other users.
              Upon termination, access to the dashboard ends; data retention following termination is
              handled in accordance with our{" "}
              <a href="/privacy-policy#data-retention">Data Retention &amp; Deletion</a> practices.
            </p>
          </LegalSection>

          <LegalSection id="liability" title="Limitation of Liability" icon={ShieldAlert}>
            <p>
              To the fullest extent permitted by law, TempleOS and its affiliates shall not be liable for
              any indirect, incidental, special, or consequential damages, including loss of donations,
              bookings, or data, arising from:
            </p>
            <ul>
              <li>Use of, or inability to use, the platform.</li>
              <li>WhatsApp delivery delays or failures caused by Meta or a devotee&apos;s carrier.</li>
              <li>Third-party payment gateway outages, errors, or declined transactions.</li>
              <li>Incorrect, outdated, or misleading temple content (including seva schedules, pricing, or religious information) provided by a temple administrator.</li>
              <li>Disputes between a devotee and a temple regarding bookings, donations, cancellations, or refunds.</li>
            </ul>
            <p>Nothing in these Terms limits liability that cannot be limited under applicable law.</p>
          </LegalSection>

          <LegalSection id="warranties" title="Disclaimer of Warranties" icon={AlertTriangle}>
            <p>
              TempleOS is provided on an <strong>&quot;as is&quot;</strong> and{" "}
              <strong>&quot;as available&quot;</strong> basis, without warranties of any kind, whether
              express, implied, or statutory, including implied warranties of merchantability, fitness
              for a particular purpose, and non-infringement. We do not warrant that the platform will be
              uninterrupted, error-free, or that WhatsApp messages will always be delivered, and we do not
              warrant the accuracy, completeness, or religious authenticity of any content published by a
              temple.
            </p>
          </LegalSection>

          <LegalSection id="indemnification" title="Indemnification" icon={Handshake}>
            <p>
              You agree to indemnify and hold harmless TempleOS, its officers, employees, and affiliates
              from any claims, damages, losses, or expenses (including reasonable legal fees) arising from
              your use of the platform, your violation of these Terms, your violation of any law, or your
              infringement of any third-party right, including content a temple publishes or devotee data
              a temple collects without proper consent.
            </p>
          </LegalSection>

          <LegalSection id="governing-law" title="Governing Law" icon={Scale}>
            <p>
              These Terms are governed by, and construed in accordance with, the <strong>laws of
              India</strong>, without regard to conflict-of-law principles.
            </p>
          </LegalSection>

          <LegalSection id="dispute-resolution" title="Dispute Resolution" icon={Gavel}>
            <p>
              Before pursuing formal legal action, both parties agree to attempt to resolve any dispute
              arising from these Terms through good-faith negotiation by contacting the details below.
              If a dispute cannot be resolved informally within a reasonable time, it shall be subject to
              the exclusive jurisdiction of the competent courts as determined under the{" "}
              <a href="#governing-law">Governing Law</a> section above.
            </p>
          </LegalSection>

          <LegalSection id="changes" title="Changes to These Terms" icon={FileEdit}>
            <p>
              We may update these Terms from time to time to reflect changes in our services, legal
              requirements, or for other operational reasons. The &quot;Last updated&quot; date at the top
              of this page indicates when these Terms were last revised, and the &quot;Effective&quot; date
              indicates when the current version took effect. Material changes will be communicated to
              temple administrators via the dashboard or email where reasonably possible. Continued use of
              TempleOS after an update constitutes acceptance of the revised Terms.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="Contact Details" icon={Mail}>
            <p>
              Questions about these Terms of Service can be directed to{" "}
              <a href="mailto:legal@trytempleos.com">legal@trytempleos.com</a>.
            </p>
          </LegalSection>
        </div>
      </div>
    </>
  );
}
