import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the redesigned page's section order (Hero/Story/Impact/Form) so the route doesn't flash from an old-style skeleton into the new layout. */
export default function DonatePageLoading() {
  return (
    <div>
      {/* Hero */}
      <div className="flex min-h-[100dvh] flex-col justify-end bg-[#8B1E1E]/10 px-5 pt-24 pb-8 md:min-h-0 md:justify-center md:py-24">
        <div className="mx-auto w-full max-w-lg space-y-3">
          <Skeleton className="mx-auto h-3 w-24" />
          <Skeleton className="mx-auto h-9 w-4/5" />
          <Skeleton className="mx-auto h-4 w-3/5" />
          <Skeleton className="mt-6 h-20 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-12 w-full rounded-lg" />
        </div>
      </div>

      {/* Story */}
      <div className="mx-auto max-w-lg space-y-4 px-5 py-14 md:px-6">
        <Skeleton className="mx-auto h-7 w-32" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Impact */}
      <div className="mx-auto max-w-lg space-y-4 px-5 py-14 md:px-6">
        <Skeleton className="mx-auto h-7 w-64" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-lg space-y-4 px-5 pb-14 md:px-6">
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
