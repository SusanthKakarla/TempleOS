import { PageHeaderSkeleton, TableSkeleton } from "@/components/table-skeleton";

export default function EventsLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <TableSkeleton rows={4} columns={5} />
    </div>
  );
}
