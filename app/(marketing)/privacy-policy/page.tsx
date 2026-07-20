import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Info,
  Building2,
  Users,
  Settings2,
  Smartphone,
  MessageSquare,
  CreditCard,
  Cookie,
  Clock,
  Lock,
  Globe,
  Share2,
  Landmark,
  ShieldCheck,
  UserCheck,
  Baby,
  FileEdit,
  Mail,
} from "lucide-react";
import { LegalHero } from "@/components/legal/legal-hero";
import { LegalSection } from "@/components/legal/legal-section";
import { TableOfContents } from "@/components/legal/table-of-contents";

export const metadata: Metadata = {
  title: "Privacy Policy | TempleOS",
  description:
    "How TempleOS collects, uses, and protects temple administrator and devotee data, including WhatsApp Business Platform messaging.",
};

const LAST_UPDATED = "July 20, 2026";
const EFFECTIVE_DATE = "July 20, 2026";

const sections: { id: string; title: string; icon: LucideIcon }[] = [
  { id: "overview", title: "Overview", icon: Info },
  { id: "information-from-admins", title: "Information from Temple Admins", icon: Building2 },
  { id: "information-from-devotees", title: "Information from Devotees", icon: Users },
  { id: "how-we-use-information", title: "How We Use Information", icon: Settings2 },
  { id: "whatsapp-integration", title: "WhatsApp Business Platform Integration", icon: Smartphone },
  { id: "whatsapp-consent", title: "WhatsApp Consent & Opt-Out", icon: MessageSquare },
  { id: "donations-payments", title: "Donations & Payment Processing", icon: CreditCard },
  { id: "cookies-analytics", title: "Cookies & Analytics", icon: Cookie },
  { id: "data-retention", title: "Data Retention & Deletion", icon: Clock },
  { id: "data-security", title: "Security Measures", icon: Lock },
  { id: "cross-border-data", title: "Cross-Border Data Processing", icon: Globe },
  { id: "third-party-services", title: "Third-Party Services", icon: Share2 },
  { id: "temple-responsibility", title: "Temple Responsibility for Devotee Data", icon: Landmark },
  { id: "templeos-responsibility", title: "TempleOS's Role as Software Provider", icon: ShieldCheck },
  { id: "user-rights", title: "Your Rights", icon: UserCheck },
  { id: "childrens-privacy", title: "Children's Privacy", icon: Baby },
  { id: "changes", title: "Changes to This Policy", icon: FileEdit },
  { id: "contact", title: "Contact Us", icon: Mail },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <LegalHero
        eyebrow="Privacy Policy"
        title="Privacy Policy"
        description="Plain-language explanation of what TempleOS collects on behalf of temples, how it's used, and the choices devotees and temple administrators have — including for WhatsApp messaging."
        lastUpdated={LAST_UPDATED}
        effectiveDate={EFFECTIVE_DATE}
      />

      {/* Mobile TOC: horizontal chip scroller, hidden on desktop where the sticky sidebar takes over */}
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
          <LegalSection id="overview" title="Overview" icon={Info}>
            <p>
              TempleOS (&quot;<strong>TempleOS</strong>&quot;, &quot;<strong>we</strong>&quot;, &quot;
              <strong>us</strong>&quot;) is a software-as-a-service platform that helps temples manage
              their temple profile, devotee registration, seva bookings, donations, events, a WhatsApp
              chatbot, and broadcast announcements from a single dashboard. This Privacy Policy explains
              what personal information we collect, why we collect it, and the choices available to{" "}
              <strong>temple administrators</strong> (who manage a temple&apos;s account) and{" "}
              <strong>devotees</strong> (who interact with a temple through TempleOS, most commonly via
              WhatsApp).
            </p>
            <p>
              This policy is effective as of {EFFECTIVE_DATE} and was last updated on {LAST_UPDATED}.
            </p>
            <h3>Who this policy applies to</h3>
            <p>
              This policy applies to anyone whose information is processed through TempleOS: temple
              administrators and staff who use the dashboard, and devotees who register with a temple,
              book sevas, make donations, or receive WhatsApp messages from a temple using TempleOS.
            </p>
            <h3>Our role: software provider, not the temple</h3>
            <p>
              TempleOS is a multi-tenant platform. Each temple operates its own independent account,
              connects its own Meta WhatsApp Business Account, and controls its own devotee records,
              seva schedules, pricing, and announcements. In privacy-law terms, <strong>each temple is
              the data controller</strong> for its devotees&apos; information, and{" "}
              <strong>TempleOS is the data processor</strong> — we provide and operate the software that
              stores and processes that information on the temple&apos;s behalf, under the temple&apos;s
              instructions. See{" "}
              <a href="#temple-responsibility">Temple Responsibility for Devotee Data</a> and{" "}
              <a href="#templeos-responsibility">TempleOS&apos;s Role as Software Provider</a> below for
              how this division of responsibility works in practice.
            </p>
          </LegalSection>

          <LegalSection id="information-from-admins" title="Information from Temple Admins" icon={Building2}>
            <p>When a temple signs up for TempleOS, we collect information about the temple and the people who administer it:</p>
            <ul>
              <li>
                <strong>Admin account details:</strong> name, phone number, and email address of temple
                administrators and staff granted dashboard access.
              </li>
              <li>
                <strong>Temple profile information:</strong> temple name, address, deity/tradition
                details, logo, description, and other content the temple chooses to publish.
              </li>
              <li>
                <strong>Seva and event configuration:</strong> seva names, schedules, pricing, capacity,
                and event details entered by the temple.
              </li>
              <li>
                <strong>WhatsApp Business Account details:</strong> the WhatsApp Business Account ID,
                phone number ID, and related configuration provided when a temple connects its account
                through Meta Embedded Signup (see{" "}
                <a href="#whatsapp-integration">WhatsApp Business Platform Integration</a>).
              </li>
              <li>
                <strong>Role and permission data:</strong> which staff members have which level of
                access within the dashboard.
              </li>
              <li>
                <strong>Technical information:</strong> device, browser, and access-log information
                (such as IP address and timestamps) generated when administrators use the dashboard.
              </li>
            </ul>
          </LegalSection>

          <LegalSection id="information-from-devotees" title="Information from Devotees" icon={Users}>
            <p>On behalf of the temple, TempleOS may store the following information about devotees:</p>
            <ul>
              <li>
                <strong>Identity information:</strong> devotee name, phone number, and WhatsApp number.
              </li>
              <li>
                <strong>Optional contact details:</strong> email address, where provided.
              </li>
              <li>
                <strong>Transaction history:</strong> donation history and seva booking history
                associated with the devotee&apos;s profile at a given temple.
              </li>
              <li>
                <strong>Preferences:</strong> event and announcement preferences, language preference,
                and WhatsApp messaging consent status.
              </li>
              <li>
                <strong>WhatsApp conversation data:</strong> messages exchanged with a temple&apos;s
                WhatsApp chatbot, including delivery and read status, to the extent needed to provide
                booking confirmations, receipts, and support.
              </li>
              <li>
                <strong>Technical information:</strong> device and browser information collected
                automatically if a devotee uses the temple&apos;s web-based booking or donation pages.
              </li>
            </ul>
            <p>
              We do not collect government identification numbers, and we do not treat religious
              affiliation with a particular temple as sensitive personal data requiring special handling
              beyond what is described in this policy.
            </p>
          </LegalSection>

          <LegalSection id="how-we-use-information" title="How We Use Information" icon={Settings2}>
            <p>Information collected through TempleOS is used to:</p>
            <ul>
              <li>Operate temple profiles, devotee registration, and the temple administration dashboard.</li>
              <li>Process and confirm seva bookings and record donations.</li>
              <li>Send event reminders, temple announcements, booking confirmations, and donation receipts via WhatsApp or email.</li>
              <li>Power the temple&apos;s WhatsApp chatbot for FAQs, bookings, and support requests.</li>
              <li>Maintain accurate records for temple administrators, including reporting and reconciliation.</li>
              <li>Maintain the security, reliability, and performance of the platform, and prevent fraud or abuse.</li>
              <li>Comply with applicable legal, tax, and regulatory obligations.</li>
            </ul>
            <p>
              We do not sell personal information, and we do not use devotee data for advertising or
              share it with unrelated third parties for their own marketing purposes.
            </p>
          </LegalSection>

          <LegalSection id="whatsapp-integration" title="WhatsApp Business Platform Integration" icon={Smartphone}>
            <p>
              TempleOS is built on <strong>Meta&apos;s WhatsApp Business Platform</strong> (WhatsApp
              Cloud API). This lets each temple run its own WhatsApp presence for devotee communication,
              while TempleOS provides the underlying software and infrastructure.
            </p>
            <h3>Meta Embedded Signup</h3>
            <p>
              Temples connect their own WhatsApp Business Account to TempleOS using{" "}
              <strong>Meta Embedded Signup</strong>, Meta&apos;s official onboarding flow. Through this
              flow, a temple grants TempleOS — acting as a Meta Tech Provider — permission to send and
              receive WhatsApp messages on the temple&apos;s behalf, using a single platform-level system
              user token. No temple&apos;s WhatsApp credentials or per-tenant access tokens are shared
              between temples, and TempleOS does not gain access to a temple&apos;s broader Meta Business
              Manager beyond what Embedded Signup explicitly grants.
            </p>
            <h3>How the WhatsApp Cloud API is used</h3>
            <ul>
              <li>Delivering event reminders, announcements, booking confirmations, and donation receipts that a devotee has opted in to receive.</li>
              <li>Operating each temple&apos;s WhatsApp chatbot for common devotee questions and requests.</li>
              <li>Recording delivery and read receipts so temples can see whether a message reached a devotee.</li>
            </ul>
            <p>
              Message content and delivery metadata are processed by Meta in the course of delivering
              WhatsApp messages, in accordance with Meta&apos;s own privacy practices, in addition to this
              policy.
            </p>
          </LegalSection>

          <LegalSection id="whatsapp-consent" title="WhatsApp Consent & Opt-Out" icon={MessageSquare}>
            <p>WhatsApp messaging through TempleOS is strictly opt-in. In practice, this means:</p>
            <ul>
              <li>
                A devotee must <strong>explicitly opt in</strong> — typically by registering their
                WhatsApp number with a temple and agreeing to receive messages — before they are sent
                event reminders, temple announcements, booking confirmations, or donation receipts.
              </li>
              <li>Consent is recorded per devotee, per temple, and is never assumed just because a phone number exists elsewhere in our systems.</li>
              <li>
                A devotee may <strong>opt out at any time</strong> by replying{" "}
                <strong>&quot;STOP&quot;</strong> (or another supported opt-out keyword configured by the
                temple) to any WhatsApp message, or by asking the temple administrator to remove them
                from messaging lists in the dashboard.
              </li>
              <li>Once a devotee opts out, TempleOS stops sending non-essential WhatsApp messages to that number until they opt in again.</li>
              <li>
                Message delivery depends on Meta&apos;s WhatsApp infrastructure and the devotee&apos;s
                own carrier or device, and may occasionally be delayed or temporarily unavailable for
                reasons outside TempleOS&apos;s control.
              </li>
              <li>
                TempleOS and every temple using the platform are required to comply with{" "}
                <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noreferrer">
                  Meta&apos;s WhatsApp Business Messaging Policy
                </a>
                , which prohibits unsolicited or unrelated marketing messages over this channel.
              </li>
            </ul>
          </LegalSection>

          <LegalSection id="donations-payments" title="Donations & Payment Processing" icon={CreditCard}>
            <p>
              Donations made through TempleOS are processed by secure, PCI-DSS compliant{" "}
              <strong>third-party payment gateways</strong>.{" "}
              <strong>TempleOS never stores card numbers, CVVs, UPI PINs, or banking credentials.</strong>{" "}
              We store only the information necessary to record the transaction and generate a receipt:
              donation amount, currency, date, payment status, and a reference ID linking back to the
              payment gateway&apos;s own transaction record.
            </p>
            <p>
              Because payment processing is handled by the gateway rather than by TempleOS directly, any
              issue with a card, bank transfer, or UPI payment (such as a declined transaction or a delay
              in settlement) is subject to the payment gateway&apos;s own terms and support process.
            </p>
          </LegalSection>

          <LegalSection id="cookies-analytics" title="Cookies & Analytics" icon={Cookie}>
            <p>
              The TempleOS dashboard uses strictly necessary cookies to keep administrators signed in
              (session cookies) and to remember display preferences such as language and light/dark
              theme. These cookies do not track devotees across other websites and are not used for
              advertising.
            </p>
            <p>
              Where TempleOS uses basic, privacy-respecting analytics to understand dashboard usage and
              improve the product, this data is aggregated and is not used to build advertising profiles
              of devotees or temple staff. We do not currently use third-party advertising or cross-site
              tracking cookies.
            </p>
          </LegalSection>

          <LegalSection id="data-retention" title="Data Retention & Deletion" icon={Clock}>
            <h3>Retention</h3>
            <p>
              Devotee, donation, and booking records are retained for as long as the temple maintains an
              active account on TempleOS, and thereafter for as long as reasonably necessary to comply
              with legal, accounting, or tax reporting obligations (for example, donation records that a
              temple is required to retain for tax purposes).
            </p>
            <h3>Deletion requests</h3>
            <p>
              A devotee who wants their information deleted should first contact the relevant temple
              administrator, since the temple controls its own devotee records. A temple administrator
              may request deletion or export of a devotee&apos;s data directly within the dashboard, or by
              contacting us at{" "}
              <a href="mailto:privacy@trytempleos.com">privacy@trytempleos.com</a>. Deletion requests are
              honored subject to any records a temple is legally required to keep — where full deletion
              isn&apos;t possible, we will anonymize or restrict further use of the data instead.
            </p>
          </LegalSection>

          <LegalSection id="data-security" title="Security Measures" icon={Lock}>
            <p>
              We apply industry-standard safeguards to protect information stored in TempleOS, including:
            </p>
            <ul>
              <li>Encrypted data transmission (HTTPS/TLS) between devices, our servers, and connected third-party services.</li>
              <li>Encrypted database connections and access-controlled infrastructure.</li>
              <li>Role-based permissions within each temple&apos;s dashboard, so staff only see what their role permits.</li>
              <li>Passwordless, OTP-based authentication for administrators, reducing risks associated with reused or weak passwords.</li>
              <li>Isolation between tenants, so one temple&apos;s data is not accessible to another temple&apos;s administrators.</li>
            </ul>
            <p>
              No method of transmission or storage is 100% secure. While we work hard to protect
              information under our control, we cannot guarantee absolute security, and we encourage
              administrators to safeguard their own login access.
            </p>
          </LegalSection>

          <LegalSection id="cross-border-data" title="Cross-Border Data Processing" icon={Globe}>
            <p>
              TempleOS and the third-party providers we rely on (such as cloud hosting, database, and
              messaging infrastructure) may process and store data in countries other than the one where
              a temple or devotee is located. Where this occurs, we take reasonable steps to ensure that
              any cross-border transfer is protected by appropriate contractual or technical safeguards
              consistent with applicable data protection law.
            </p>
          </LegalSection>

          <LegalSection id="third-party-services" title="Third-Party Services" icon={Share2}>
            <p>TempleOS relies on the following categories of third-party services to operate:</p>
            <ul>
              <li>
                <strong>Meta WhatsApp Business Platform:</strong> used to send and receive WhatsApp
                messages, as described in <a href="#whatsapp-integration">WhatsApp Business Platform
                Integration</a>.
              </li>
              <li>
                <strong>Payment gateways:</strong> used to process donations securely, as described in{" "}
                <a href="#donations-payments">Donations &amp; Payment Processing</a>.
              </li>
              <li>
                <strong>Firebase (Google):</strong> used for secure phone-number authentication of temple
                administrators.
              </li>
              <li>
                <strong>Cloud hosting and database providers:</strong> used to host the application and
                store data securely.
              </li>
            </ul>
            <p>
              These providers only receive the information necessary to perform their function and are
              contractually bound to appropriate confidentiality and security obligations.
            </p>
          </LegalSection>

          <LegalSection id="temple-responsibility" title="Temple Responsibility for Devotee Data" icon={Landmark}>
            <p>
              Each temple using TempleOS is responsible for the devotee data it collects, including:
            </p>
            <ul>
              <li>Obtaining valid consent from devotees before collecting their information or messaging them on WhatsApp.</li>
              <li>Ensuring the accuracy of devotee records, seva schedules, pricing, and announcements it publishes.</li>
              <li>Responding to devotee requests to access, correct, or delete their information.</li>
              <li>Using devotee data only for legitimate temple purposes, not for unrelated resale or disclosure.</li>
              <li>Complying with any additional local laws that apply to how the temple collects or uses personal data.</li>
            </ul>
            <p>
              TempleOS does not verify the accuracy of information a temple publishes about itself, its
              sevas, or its events — that responsibility rests with the temple administrator who entered
              it.
            </p>
          </LegalSection>

          <LegalSection id="templeos-responsibility" title="TempleOS's Role as Software Provider" icon={ShieldCheck}>
            <p>TempleOS is the software provider that makes temple management possible. Our responsibility is to:</p>
            <ul>
              <li>Securely host and process data on behalf of temples, in line with this Privacy Policy.</li>
              <li>Provide the technical infrastructure connecting temples to Meta&apos;s WhatsApp Business Platform and to payment gateways.</li>
              <li>Maintain reasonable security and availability of the platform.</li>
              <li>Support temples and devotees with data access, correction, and deletion requests routed through us.</li>
            </ul>
            <p>
              TempleOS does not own, operate, or control any individual temple, and does not independently
              verify the religious, doctrinal, or factual accuracy of content a temple publishes. We are
              not responsible for a temple&apos;s own decisions about how it collects consent, sets seva
              pricing, or manages its devotee relationships, beyond providing the tools to do so
              responsibly.
            </p>
          </LegalSection>

          <LegalSection id="user-rights" title="Your Rights" icon={UserCheck}>
            <p>Subject to applicable law, devotees and temple administrators may:</p>
            <ul>
              <li>Request access to the personal information held about them.</li>
              <li>Request correction of inaccurate or outdated information.</li>
              <li>Request deletion of their information, subject to legal retention requirements.</li>
              <li>Opt out of WhatsApp or other communications at any time.</li>
              <li>Request a copy of their donation or booking history in a portable format.</li>
            </ul>
            <p>
              Requests should be directed to the relevant temple administrator in the first instance, or
              to us directly using the contact details below, and will be forwarded to the responsible
              temple where appropriate.
            </p>
          </LegalSection>

          <LegalSection id="childrens-privacy" title="Children's Privacy" icon={Baby}>
            <p>
              TempleOS is intended for use by temple administrators and adult devotees. We do not
              knowingly collect personal information directly from children under the age of 13 (or the
              relevant age of digital consent in the devotee&apos;s jurisdiction). Where a temple records a
              minor as a dependent family member for seva or event purposes, this information is provided
              and managed by a parent, guardian, or the temple administrator, not collected directly from
              the child. If we learn that a child&apos;s personal information has been collected without
              appropriate parental or guardian involvement, we will work with the relevant temple to
              delete it.
            </p>
          </LegalSection>

          <LegalSection id="changes" title="Changes to This Policy" icon={FileEdit}>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices,
              technology, legal requirements, or for other operational reasons. The &quot;Last updated&quot;
              date at the top of this page indicates when this policy was last revised, and the
              &quot;Effective&quot; date indicates when the current version took effect. Material changes
              will be communicated to temple administrators via the dashboard or email where reasonably
              possible. Continued use of TempleOS after a policy update constitutes acceptance of the
              revised policy.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="Contact Us" icon={Mail}>
            <p>
              If you have questions about this Privacy Policy or how your information is handled, contact
              us at <a href="mailto:privacy@trytempleos.com">privacy@trytempleos.com</a>.
            </p>
          </LegalSection>
        </div>
      </div>
    </>
  );
}
