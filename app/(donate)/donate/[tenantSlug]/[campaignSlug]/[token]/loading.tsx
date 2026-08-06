import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the page's section order (Banner+Campaign Card/Story/Form/Trust) so the route doesn't flash from an old-style skeleton into the real layout. */
export default function DonatePageLoading() {
  return (
    <div>
      {/* Banner */}
      <Skeleton className="h-[200px] w-full rounded-none sm:h-[300px]" />
      <div className="mx-auto -mt-10 max-w-[760px] px-5 md:px-6">
        <div className="space-y-4 rounded-[20px] border border-[#E9E4DD] bg-white p-6 shadow-sm">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-12 flex-1 rounded-lg" />
            <Skeleton className="h-12 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Story */}
      <div className="mx-auto mt-8 max-w-[760px] px-5 md:px-6">
        <Skeleton className="h-40 w-full rounded-[20px]" />
      </div>

      {/* Form */}
      <div className="mx-auto mt-8 max-w-[760px] space-y-5 px-5 pb-8 md:px-6">
        <Skeleton className="h-7 w-48" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-[52px] w-full rounded-[14px]" />
        <Skeleton className="h-[52px] w-full rounded-[14px]" />
        <Skeleton className="h-[52px] w-full rounded-[14px]" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
