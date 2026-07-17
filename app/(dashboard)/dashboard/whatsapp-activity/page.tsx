import { getSessionAdmin } from "@/lib/auth/session";
import { listRecentMessages } from "@/lib/db/whatsapp-messages";
import type { MessageStatus, WhatsAppMessage } from "@/types/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusVariant(status: MessageStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed") return "destructive";
  if (status === "queued") return "outline";
  return status === "delivered" || status === "sent" ? "default" : "secondary";
}

function counterpartyPhone(message: WhatsAppMessage): string {
  return message.direction === "inbound" ? message.fromPhone : message.toPhone;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function WhatsAppActivityPage() {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  const messages = await listRecentMessages(session.tenantId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">WhatsApp Activity</h1>
        <p className="text-sm text-muted-foreground">
          Recent inbound and outbound messages with the temple WhatsApp number.
        </p>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Direction</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No WhatsApp activity yet.
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    <Badge variant={message.direction === "inbound" ? "secondary" : "outline"}>
                      {message.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>{counterpartyPhone(message)}</TableCell>
                  <TableCell className="max-w-xs truncate" title={message.body}>
                    {message.body}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(message.status)}>{message.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatTimestamp(message.createdAt)}
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
