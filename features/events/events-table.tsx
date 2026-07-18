"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LayoutGrid, PlusCircle, Rows3 } from "lucide-react";
import type { Event } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventFormDialog } from "./event-form-dialog";
import { EventCard } from "./event-card";
import { AnnounceDialog } from "./announce-dialog";

function formatEventTime(event: Event): string {
  const start = new Date(event.startsAt);
  const startLabel = start.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (!event.endsAt) return startLabel;
  const end = new Date(event.endsAt);
  const endLabel = end.toLocaleTimeString("en-IN", { timeStyle: "short" });
  return `${startLabel} - ${endLabel}`;
}

export function EventsTable({ events }: { events: Event[] }) {
  const router = useRouter();
  const [view, setView] = useState<"table" | "card">("table");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleTogglePublish(event: Event) {
    setError(null);
    setPendingId(event.id);
    try {
      const nextStatus = event.status === "published" ? "draft" : "published";
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to update event");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(event: Event) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setError(null);
    setPendingId(event.id);
    try {
      const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete event");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">Create and publish temple events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "table" | "card")}>
            <TabsList>
              <TabsTrigger value="table">
                <Rows3 className="size-3.5" />
                Table
              </TabsTrigger>
              <TabsTrigger value="card">
                <LayoutGrid className="size-3.5" />
                Card
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <EventFormDialog
            mode="create"
            trigger={
              <Button className="hidden gap-1.5 sm:inline-flex">
                <PlusCircle className="size-4" />
                Create event
              </Button>
            }
            onSaved={refresh}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No events yet</p>
          <p className="text-sm text-muted-foreground">Create your first temple event to get started.</p>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              pending={pendingId === event.id}
              onSaved={refresh}
              onTogglePublish={handleTogglePublish}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{formatEventTime(event)}</TableCell>
                  <TableCell>{event.location ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={event.status === "published" ? "default" : "secondary"}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <EventFormDialog
                      mode="edit"
                      event={event}
                      trigger={
                        <Button variant="outline" size="sm" disabled={pendingId === event.id}>
                          Edit
                        </Button>
                      }
                      onSaved={refresh}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === event.id}
                      onClick={() => handleTogglePublish(event)}
                    >
                      {event.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    {event.status === "published" && (
                      <AnnounceDialog
                        event={event}
                        onAnnounced={refresh}
                        trigger={
                          <Button variant="outline" size="sm" disabled={pendingId === event.id}>
                            Announce
                          </Button>
                        }
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === event.id}
                      onClick={() => handleDelete(event)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EventFormDialog
        mode="create"
        trigger={
          <Button size="icon-lg" className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg sm:hidden">
            <PlusCircle className="size-5" />
            <span className="sr-only">Create event</span>
          </Button>
        }
        onSaved={refresh}
      />
    </div>
  );
}
