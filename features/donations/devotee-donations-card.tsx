"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HandCoins, Plus } from "lucide-react";
import type { Devotee, Donation } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr } from "@/lib/currency";
import { PAYMENT_METHOD_OPTIONS } from "./donation-options";
import { DonationFormDialog } from "./donation-form-dialog";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function paymentMethodLabel(value: string): string {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function DevoteeDonationsCard({
  devotee,
  donations,
}: {
  devotee: Devotee;
  donations: Donation[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(donation: Donation) {
    if (!window.confirm(`Delete this ${formatInr(donation.amount)} donation? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setPendingId(donation.id);
    try {
      const response = await fetch(`/api/donations/${donation.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete donation");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete donation");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Donations</h2>
          <p className="text-sm text-muted-foreground">
            {devotee.isDonor
              ? `${formatInr(devotee.totalDonatedAmount)} total · last on ${formatDate(devotee.lastDonationAt!)}`
              : "No donations recorded yet."}
          </p>
        </div>
        <DonationFormDialog
          mode="create"
          devotees={[devotee]}
          fixedDevoteeId={devotee.id}
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Add donation
            </Button>
          }
          onSaved={refresh}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {donations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
          <HandCoins className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No donation history for this devotee.</p>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell className="font-medium tabular-nums">{formatInr(donation.amount)}</TableCell>
                  <TableCell>{donation.purpose}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{paymentMethodLabel(donation.paymentMethod)}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(donation.donatedAt)}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <DonationFormDialog
                      mode="edit"
                      donation={donation}
                      devotees={[devotee]}
                      fixedDevoteeId={devotee.id}
                      trigger={
                        <Button variant="outline" size="sm" disabled={pendingId === donation.id}>
                          Edit
                        </Button>
                      }
                      onSaved={refresh}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === donation.id}
                      onClick={() => handleDelete(donation)}
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
    </Card>
  );
}
