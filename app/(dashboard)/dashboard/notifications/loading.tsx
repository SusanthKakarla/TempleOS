import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/table-skeleton";

function MetricCardSkeleton() {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16" />
    </Card>
  );
}

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      <TableSkeleton rows={5} columns={5} />
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}
