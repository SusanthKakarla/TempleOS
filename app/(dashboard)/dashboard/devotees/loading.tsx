import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/table-skeleton";

export default function DevoteesLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-8 w-full max-w-sm" />
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}
