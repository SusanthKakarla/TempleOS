"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Devotee } from "@/types/db";
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
import { DevoteeFormDialog } from "./devotee-form-dialog";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function DevoteesTable({ devotees }: { devotees: Devotee[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (query.trim()) {
        params.set("search", query.trim());
      } else {
        params.delete("search");
      }
      router.replace(`/dashboard/devotees?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when the debounced query changes
  }, [query]);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Devotees</h1>
          <p className="text-sm text-muted-foreground">
            Devotees who message the temple WhatsApp number, plus any you add manually.
          </p>
        </div>
        <DevoteeFormDialog
          mode="create"
          trigger={<Button>Add devotee</Button>}
          onSaved={refresh}
        />
      </div>

      <Input
        placeholder="Search by name or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Birth star</TableHead>
              <TableHead>Gothram</TableHead>
              <TableHead>First seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devotees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No devotees found.
                </TableCell>
              </TableRow>
            ) : (
              devotees.map((devotee) => (
                <TableRow key={devotee.id}>
                  <TableCell className="font-medium">{devotee.displayName}</TableCell>
                  <TableCell>{devotee.whatsappPhone}</TableCell>
                  <TableCell>
                    <Badge variant={devotee.whatsappOptInStatus ? "default" : "secondary"}>
                      {devotee.whatsappOptInStatus ? "Opted in" : "Not opted in"}
                    </Badge>
                  </TableCell>
                  <TableCell>{devotee.birthStar ?? "—"}</TableCell>
                  <TableCell>{devotee.ancestralLineage ?? "—"}</TableCell>
                  <TableCell>{formatDate(devotee.firstSeenAt)}</TableCell>
                  <TableCell className="text-right">
                    <DevoteeFormDialog
                      mode="edit"
                      devotee={devotee}
                      trigger={
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      }
                      onSaved={refresh}
                    />
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
