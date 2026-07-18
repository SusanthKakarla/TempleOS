"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HandCoins, Plus } from "lucide-react";
import type { Devotee, DonationWithDonor } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { DonationsSearchInput } from "./donations-search-input";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function paymentMethodLabel(value: string): string {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function DonationsTable({
  donations,
  devotees,
}: {
  donations: DonationWithDonor[];
  devotees: Devotee[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (dateFrom) params.set("dateFrom", dateFrom);
      else params.delete("dateFrom");
      if (dateTo) params.set("dateTo", dateTo);
      else params.delete("dateTo");
      router.replace(`/dashboard/donations?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when the debounced date filters change
  }, [dateFrom, dateTo]);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(donation: DonationWithDonor) {
    if (
      !window.confirm(
        `Delete this ${formatInr(donation.amount)} donation from ${donation.donorName}? This cannot be undone.`,
      )
    ) {
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Donations</h1>
          <p className="text-sm text-muted-foreground">
            Manually recorded donations. No online payments or receipts.
          </p>
        </div>
        <DonationFormDialog
          mode="create"
          devotees={devotees}
          trigger={
            <Button className="hidden gap-1.5 sm:inline-flex">
              <Plus className="size-4" />
              Add donation
            </Button>
          }
          onSaved={refresh}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DonationsSearchInput />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
          aria-label="From date"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
          aria-label="To date"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {donations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <HandCoins className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No donations found</p>
          <p className="text-sm text-muted-foreground">
            Record a donation to start tracking donor history.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
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
                  <TableCell>
                    <Link
                      href={`/dashboard/devotees/${donation.devoteeId}`}
                      className="font-medium hover:underline"
                    >
                      {donation.donorName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{donation.donorPhone}</p>
                  </TableCell>
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
                      devotees={devotees}
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

      <DonationFormDialog
        mode="create"
        devotees={devotees}
        trigger={
          <Button size="icon-lg" className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg sm:hidden">
            <Plus className="size-5" />
            <span className="sr-only">Add donation</span>
          </Button>
        }
        onSaved={refresh}
      />
    </div>
  );
}
