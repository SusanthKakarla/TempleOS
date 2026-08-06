import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the page's section order (Hero/Story/Form/Impact) so the route doesn't flash from an old-style skeleton into the real layout. */
export default function DonatePageLoading() {
  return (
    <div>
      {/* Hero */}
      <Skeleton className="h-48 w-full rounded-none sm:h-64" />
      <div className="mx-auto max-w-lg space-y-3 px-5 pt-5 pb-6 md:px-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="mt-2 h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mt-2 flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 w-24 rounded-lg" />
        </div>
      </div>

      {/* Story */}
      <div className="mx-auto max-w-lg px-5 py-8 md:px-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>

      {/* Form */}
      <div className="mx-auto max-w-lg space-y-4 px-5 pb-8 md:px-6">
        <Skeleton className="h-7 w-48" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
