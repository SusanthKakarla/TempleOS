import { Skeleton } from "@/components/ui/skeleton";

export default function DonatePageLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Skeleton className="size-12 rounded-2xl" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <Skeleton className="h-48 w-full rounded-none" />
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border bg-background p-6">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
