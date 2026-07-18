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

export async function listFaqs(tenantId: string): Promise<TempleFaq[]> {
  const { rows } = await getPool().query<TempleFaqRow>(
    "SELECT * FROM temple_faqs WHERE tenant_id = $1 ORDER BY display_order ASC, created_at ASC",
    [tenantId],
  );
  return rows.map(mapFaq);
}

export async function getFaqById(tenantId: string, id: string): Promise<TempleFaq | null> {
  const { rows } = await getPool().query<TempleFaqRow>(
    "SELECT * FROM temple_faqs WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
  return rows[0] ? mapFaq(rows[0]) : null;
}

export interface CreateFaqInput {
  question: string;
  answer: string;
}

/** display_order is server-computed (append to the end), never client-supplied. */
export async function createFaq(tenantId: string, input: CreateFaqInput): Promise<TempleFaq> {
  const { rows } = await getPool().query<TempleFaqRow>(
    `INSERT INTO temple_faqs (tenant_id, question, answer, display_order)
     VALUES ($1, $2, $3, (SELECT COALESCE(MAX(display_order), -1) + 1 FROM temple_faqs WHERE tenant_id = $1))
     RETURNING *`,
    [tenantId, input.question, input.answer],
  );
  return mapFaq(rows[0]);
}

export type UpdateFaqInput = Partial<CreateFaqInput>;

export async function updateFaq(
  tenantId: string,
  id: string,
  input: UpdateFaqInput,
): Promise<TempleFaq | null> {
  const { rows } = await getPool().query<TempleFaqRow>(
    `UPDATE temple_faqs
     SET question = COALESCE($3, question),
         answer = COALESCE($4, answer),
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, id, input.question ?? null, input.answer ?? null],
  );
  return rows[0] ? mapFaq(rows[0]) : null;
}

export async function deleteFaq(tenantId: string, id: string): Promise<boolean> {
  const result = await getPool().query("DELETE FROM temple_faqs WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}
