import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { Event } from "@/types/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatChipDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function UpcomingEventsWidget({ events }: { events: Event[] }) {
  return (
    <Card className="gap-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Upcoming Events</CardTitle>
        <Link href="/dashboard/events" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CalendarDays className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No upcoming published events yet.</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-accent"
            >
              <span className="gradient-maroon-orange flex size-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-semibold leading-none text-white shadow-sm">
                <CalendarDays className="mb-0.5 size-3.5" />
                {formatChipDate(event.startsAt)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="truncate text-xs text-muted-foreground">{event.location ?? "—"}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                Published
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
