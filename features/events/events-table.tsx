"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Event } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventFormDialog } from "./event-form-dialog";

function formatEventTime(event: Event): string {
  const start = new Date(event.startsAt);
  const startLabel = start.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (!event.endsAt) return startLabel;
  const end = new Date(event.endsAt);
  const endLabel = end.toLocaleTimeString(undefined, { timeStyle: "short" });
  return `${startLabel} - ${endLabel}`;
}

export function EventsTable({ events }: { events: Event[] }) {
  const router = useRouter();
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

  async function handleSendAnnouncement(event: Event) {
    if (
      !window.confirm(
        `Send a WhatsApp announcement for "${event.title}" to all opted-in devotees?`,
      )
    ) {
      return;
    }
    setError(null);
    setPendingId(event.id);
    try {
      const response = await fetch(`/api/events/${event.id}/announce`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        total?: number;
        sent?: number;
        failed?: number;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to send announcement");
      }
      if (body.total === 0) {
        toast.info("No opted-in devotees to announce to yet.");
      } else {
        toast.success(`Announcement sent: ${body.sent} sent, ${body.failed} failed.`);
      }
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send announcement";
      setError(message);
      toast.error(message);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">Create and publish temple events.</p>
        </div>
        <EventFormDialog
          mode="create"
          trigger={<Button>Create event</Button>}
          onSaved={refresh}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No events yet.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
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
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingId === event.id}
                        onClick={() => handleSendAnnouncement(event)}
                      >
                        Send WhatsApp Announcement
                      </Button>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
