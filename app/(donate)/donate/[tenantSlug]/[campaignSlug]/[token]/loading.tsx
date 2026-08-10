import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the page's current section order (Hero/Campaign Summary/Trust/About) so the route doesn't flash from a stale skeleton into the real layout. */
export default function DonatePageLoading() {
  return (
    <div>
      {/* Hero */}
      <Skeleton className="h-[340px] w-full rounded-none sm:h-[380px]" />

      {/* Campaign Summary */}
      <div className="mx-auto -mt-8 max-w-[640px] px-5 sm:px-6">
        <div className="space-y-4 rounded-[24px] border border-[#E9DED0] bg-white p-5 shadow-[0_8px_28px_rgba(47,33,27,0.08)] sm:p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-[52px] flex-1 rounded-full" />
            <Skeleton className="h-[52px] w-14 rounded-full" />
          </div>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="mx-auto max-w-[640px] px-5 py-5 sm:px-6">
        <Skeleton className="mx-auto h-4 w-64" />
      </div>

      {/* About */}
      <div className="mx-auto max-w-[640px] space-y-3 px-5 py-8 sm:px-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
