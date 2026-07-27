import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { listTransactionsForTenant, getPaymentDashboardSummary } from "@/lib/db/payment-transactions";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { PaymentTransactionStatus } from "@/types/db";

const STATUS_VALUES: PaymentTransactionStatus[] = ["created", "authorized", "captured", "failed", "refunded"];

export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const params = req.nextUrl.searchParams;
  const page = parsePageParam(params.get("page") ?? undefined);
  const status = STATUS_VALUES.find((value) => value === params.get("status"));

  const [{ transactions, totalCount }, summary] = await Promise.all([
    listTransactionsForTenant(session.tenantId, { page, pageSize: DEFAULT_PAGE_SIZE, status }),
    getPaymentDashboardSummary(session.tenantId),
  ]);

  return NextResponse.json({ transactions, totalCount, summary });
}
