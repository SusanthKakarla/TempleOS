import { cache } from "react";
import { getPool } from "./pool";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import type { Person } from "@/types/db";

interface PersonRow {
  id: string;
  phone_number: string;
  display_name: string;
  firebase_uid: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapPerson(row: PersonRow): Person {
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    displayName: row.display_name,
    firebaseUid: row.firebase_uid,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findPersonByPhone(phoneNumber: string): Promise<Person | null> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return null;

  const { rows } = await getPool().query<PersonRow>(
    "SELECT * FROM persons WHERE phone_number = $1 LIMIT 1",
    [normalized],
  );
  return rows[0] ? mapPerson(rows[0]) : null;
}

export const getPersonById = cache(async function getPersonById(personId: string): Promise<Person | null> {
  const { rows } = await getPool().query<PersonRow>("SELECT * FROM persons WHERE id = $1 LIMIT 1", [
    personId,
  ]);
  return rows[0] ? mapPerson(rows[0]) : null;
});

export async function bindPersonFirebaseUid(personId: string, firebaseUid: string): Promise<boolean> {
  try {
    const { rowCount } = await getPool().query(
      `UPDATE persons
       SET firebase_uid = $2, updated_at = now()
       WHERE id = $1
         AND (firebase_uid IS NULL OR firebase_uid = $2)
         AND NOT EXISTS (
           SELECT 1 FROM persons
           WHERE firebase_uid = $2 AND id <> $1
         )`,
      [personId, firebaseUid],
    );
    return (rowCount ?? 0) > 0;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
