"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Plus } from "lucide-react";
import type { TempleSeva } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr } from "@/lib/currency";
import { SevaFormDialog } from "./seva-form-dialog";

function formatDays(days: TempleSeva["availableDays"]): string {
  if (days.length === 0) return "Every day";
  return days.map((day) => day.slice(0, 3)).join(", ");
}

export function SevasTable({ sevas }: { sevas: TempleSeva[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(seva: TempleSeva) {
    if (!window.confirm(`Delete "${seva.name}"? This cannot be undone.`)) return;
    setError(null);
    setPendingId(seva.id);
    try {
      const response = await fetch(`/api/temple-sevas/${seva.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete seva");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete seva");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Temple Sevas</CardTitle>
          <CardDescription>
            Browsable in the WhatsApp chatbot&apos;s Sevas option. Booking isn&apos;t available yet.
          </CardDescription>
        </div>
        <SevaFormDialog
          mode="create"
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Add seva
            </Button>
          }
          onSaved={refresh}
        />
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {sevas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <HandCoins className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No sevas added yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Available days</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sevas.map((seva) => (
                  <TableRow key={seva.id}>
                    <TableCell>
                      <p className="font-medium">{seva.name}</p>
                      {seva.description && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {seva.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{seva.price ? formatInr(seva.price) : "—"}</TableCell>
                    <TableCell>{seva.duration ?? "—"}</TableCell>
                    <TableCell>{formatDays(seva.availableDays)}</TableCell>
                    <TableCell>
                      <Badge variant={seva.bookingEnabled ? "default" : "secondary"}>
                        {seva.bookingEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <SevaFormDialog
                        mode="edit"
                        seva={seva}
                        trigger={
                          <Button variant="outline" size="sm" disabled={pendingId === seva.id}>
                            Edit
                          </Button>
                        }
                        onSaved={refresh}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId === seva.id}
                        onClick={() => handleDelete(seva)}
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
      </CardContent>
    </Card>
  );
}
