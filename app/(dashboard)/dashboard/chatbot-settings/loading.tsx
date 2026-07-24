import { PageHeaderSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatbotSettingsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
