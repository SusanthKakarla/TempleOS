import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/table-skeleton";

export default function DonationsLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-full max-w-sm flex-1" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-40" />
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
