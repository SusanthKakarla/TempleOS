import { PageHeaderSkeleton, TableSkeleton } from "@/components/table-skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
