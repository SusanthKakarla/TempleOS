"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import type { TempleSpecialDay } from "@/types/db";
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
import { SpecialDayFormDialog } from "./special-day-form-dialog";

function formatDate(iso: string): string {
  // "YYYY-MM-DD" — construct as UTC noon to avoid local-timezone rollback.
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  const [hourStr, minuteStr] = value.split(":");
  const hour24 = Number(hourStr);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minuteStr} ${period}`;
}

function formatTimings(specialDay: TempleSpecialDay): string {
  if (specialDay.isClosed) return "Closed";
  const morning =
    specialDay.morningOpen && specialDay.morningClose
      ? `${formatTime(specialDay.morningOpen)} - ${formatTime(specialDay.morningClose)}`
      : null;
  const evening =
    specialDay.eveningOpen && specialDay.eveningClose
      ? `${formatTime(specialDay.eveningOpen)} - ${formatTime(specialDay.eveningClose)}`
      : null;
  return [morning, evening].filter(Boolean).join(" · ") || "Regular hours";
}

export function SpecialDaysTable({ specialDays }: { specialDays: TempleSpecialDay[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(specialDay: TempleSpecialDay) {
    if (!window.confirm(`Delete the "${specialDay.occasion}" entry? This cannot be undone.`)) return;
    setError(null);
    setPendingId(specialDay.id);
    try {
      const response = await fetch(`/api/temple-special-days/${specialDay.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete special day");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete special day");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Special Day Timings</CardTitle>
          <CardDescription>Overrides regular hours on festival days or closures.</CardDescription>
        </div>
        <SpecialDayFormDialog
          mode="create"
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Add special day
            </Button>
          }
          onSaved={refresh}
        />
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {specialDays.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <CalendarDays className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No special days added yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Timings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialDays.map((specialDay) => (
                  <TableRow key={specialDay.id}>
                    <TableCell>{formatDate(specialDay.date)}</TableCell>
                    <TableCell>{specialDay.occasion}</TableCell>
                    <TableCell>
                      {specialDay.isClosed ? (
                        <Badge variant="destructive">Closed</Badge>
                      ) : (
                        formatTimings(specialDay)
                      )}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <SpecialDayFormDialog
                        mode="edit"
                        specialDay={specialDay}
                        trigger={
                          <Button variant="outline" size="sm" disabled={pendingId === specialDay.id}>
                            Edit
                          </Button>
                        }
                        onSaved={refresh}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId === specialDay.id}
                        onClick={() => handleDelete(specialDay)}
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
