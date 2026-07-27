import { CheckCircle2, Clock3, CreditCard, HandCoins, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { listTransactionsForTenant, getPaymentDashboardSummary } from "@/lib/db/payment-transactions";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { formatInr } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PaginationControls } from "@/components/pagination-controls";
import { TableShell } from "@/components/table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard } from "@/features/dashboard/metric-card";
import type { PaymentTransactionStatus } from "@/types/db";

const STATUS_VARIANT: Record<PaymentTransactionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  created: "secondary",
  authorized: "secondary",
  captured: "default",
  failed: "destructive",
  refunded: "outline",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "donations");
  const t = await getTranslations("paymentsDashboard");
  const params = await searchParams;
  const page = parsePageParam(typeof params.page === "string" ? params.page : undefined);

  const [account, { transactions, totalCount }, summary] = await Promise.all([
    getActivePaymentAccountForTenant(session.tenantId),
    listTransactionsForTenant(session.tenantId, { page, pageSize: DEFAULT_PAGE_SIZE }),
    getPaymentDashboardSummary(session.tenantId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageHeader.title")}
        subtitle={t("pageHeader.subtitle")}
        actions={
          <Badge variant={account ? "default" : "secondary"} className="gap-1">
            <CreditCard className="size-3.5" />
            {account ? t("providerConnected", { provider: account.providerKey }) : t("providerNotConnected")}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("metrics.todayDonations")}
          value={summary.todayTotal}
          format="currency"
          icon={<HandCoins className="size-4.5" />}
          gradient="gradient-saffron-gold"
        />
        <MetricCard
          label={t("metrics.campaignRevenue")}
          value={summary.campaignRevenueTotal}
          format="currency"
          icon={<CheckCircle2 className="size-4.5" />}
          gradient="gradient-blue-purple"
        />
        <MetricCard
          label={t("metrics.pending")}
          value={summary.pendingCount}
          icon={<Clock3 className="size-4.5" />}
          gradient="gradient-maroon-orange"
        />
        <MetricCard
          label={t("metrics.failed")}
          value={summary.failedCount}
          icon={<XCircle className="size-4.5" />}
          gradient="bg-destructive"
        />
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
        />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.donor")}</TableHead>
                <TableHead>{t("table.amount")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.date")}</TableHead>
                <TableHead>{t("table.receipt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.isAnonymous ? t("anonymousDonor") : transaction.donorName}</TableCell>
                  <TableCell>{formatInr(transaction.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[transaction.status]}>{t(`status.${transaction.status}`)}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(transaction.createdAt, "en")}</TableCell>
                  <TableCell>
                    {transaction.receiptUrl ? (
                      <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        {t("table.download")}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls page={page} pageSize={DEFAULT_PAGE_SIZE} totalCount={totalCount} pathname="/dashboard/payments" />
        </TableShell>
      )}
    </div>
  );
}
