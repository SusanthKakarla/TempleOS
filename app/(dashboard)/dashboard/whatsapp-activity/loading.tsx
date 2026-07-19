import { Skeleton } from "@/components/ui/skeleton";

export default function WhatsAppActivityLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-full max-w-xs" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="glass-panel space-y-3 rounded-2xl p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex flex-col gap-1 ${i % 2 === 0 ? "items-start" : "items-end"}`}>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
