import Link from "next/link";
import { CalendarCheck, Clock } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";

export function LegalHero({
  eyebrow,
  title,
  description,
  lastUpdated,
  effectiveDate,
}: {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  effectiveDate: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="blob-drift gradient-ocean-blue absolute -top-32 -left-24 size-[28rem] rounded-full opacity-10 blur-3xl" />
        <div className="blob-drift gradient-saffron-gold absolute top-0 -right-24 size-[24rem] rounded-full opacity-10 blur-3xl [animation-delay:-10s]" />
        <div className="noise-overlay absolute inset-0" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{eyebrow}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 py-1">
            <Clock className="size-3" aria-hidden="true" />
            Last updated {lastUpdated}
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1">
            <CalendarCheck className="size-3" aria-hidden="true" />
            Effective {effectiveDate}
          </Badge>
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
