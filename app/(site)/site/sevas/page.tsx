import type { Metadata } from "next";
import { requireSite } from "@/lib/site/get-site";
import { listSiteSevas } from "@/lib/site/site-data";
import { EmptyNotice, PageHeader, SevaCard } from "@/features/site/site-sections";

export const metadata: Metadata = { title: "Sevas" };

export default async function SevasPage() {
  const { tenant, content } = await requireSite();
  const sevas = await listSiteSevas(tenant.id);

  return (
    <>
      <PageHeader
        title="Sevas"
        subtitle="Offerings and services performed at the temple."
        content={content}
      />

      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        {sevas.length === 0 ? (
          <EmptyNotice message="This temple hasn't published its sevas yet." content={content} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sevas.map((seva) => (
              <SevaCard key={seva.id} seva={seva} content={content} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
