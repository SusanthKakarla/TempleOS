import { getPool } from "./pool";
import type { TempleFaq } from "@/types/db";

interface TempleFaqRow {
  id: string;
  tenant_id: string;
  question: string;
  answer: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

function mapFaq(row: TempleFaqRow): TempleFaq {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    question: row.question,
    answer: row.answer,
    displayOrder: row.display_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** The only remaining consumer is the WhatsApp bot's "faq" command (app/api/whatsapp/webhook/route.ts) — the admin management UI/API for FAQs has been removed. */
export async function listFaqs(tenantId: string): Promise<TempleFaq[]> {
  const { rows } = await getPool().query<TempleFaqRow>(
    "SELECT * FROM temple_faqs WHERE tenant_id = $1 ORDER BY display_order ASC, created_at ASC",
    [tenantId],
  );
  return rows.map(mapFaq);
}
