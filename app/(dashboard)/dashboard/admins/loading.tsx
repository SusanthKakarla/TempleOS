import { PageHeaderSkeleton, TableSkeleton } from "@/components/table-skeleton";

export default function AdminsLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <TableSkeleton rows={3} columns={4} />
    </div>
  );
}
