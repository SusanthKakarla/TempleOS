import { Skeleton } from "@/components/ui/skeleton";

/** Generic row/column skeleton used by route `loading.tsx` files while a table's data loads. */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton key={col} className={col === 0 ? "h-5 w-1/4 min-w-24" : "h-5 flex-1"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Page title + subtitle + a trailing action button, skeletoned to match the real header shape. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-8 w-32" />
    </div>
  );
}
