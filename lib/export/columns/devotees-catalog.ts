/**
 * Client-safe column catalog for the Devotees export column picker —
 * {id, labelKey} pairs only, no server-only imports (translated headers,
 * accessors) so this can be imported directly by the client-side
 * ExportColumnPicker. `id` matches the `key` each ColumnDef in
 * buildDevoteeExportColumns (../columns/devotees.ts) uses, and `labelKey`
 * resolves under the `exportLabels.devotees.*` i18n namespace — the same
 * keys the server-side column builder's labels object already uses, so the
 * picker's checkbox text and the exported file's header text can never
 * drift apart.
 */
export interface ExportColumnCatalogEntry {
  id: string;
  labelKey: string;
}

export const DEVOTEE_EXPORT_COLUMN_CATALOG: ExportColumnCatalogEntry[] = [
  { id: "displayName", labelKey: "name" },
  { id: "whatsappPhone", labelKey: "phone" },
  { id: "familyName", labelKey: "familyName" },
  { id: "whatsappOptInStatus", labelKey: "whatsappOptIn" },
  { id: "birthStar", labelKey: "birthStar" },
  { id: "ancestralLineage", labelKey: "gothram" },
  { id: "gender", labelKey: "gender" },
  { id: "dateOfBirth", labelKey: "dateOfBirth" },
  { id: "address", labelKey: "address" },
  { id: "notes", labelKey: "notes" },
  { id: "firstSeenAt", labelKey: "firstSeen" },
  { id: "lastSeenAt", labelKey: "lastSeen" },
  { id: "totalDonatedAmount", labelKey: "totalDonated" },
  { id: "isDonor", labelKey: "donor" },
  { id: "createdAt", labelKey: "createdDate" },
  { id: "updatedAt", labelKey: "updatedDate" },
  { id: "preferredLanguage", labelKey: "language" },
  { id: "maritalStatus", labelKey: "maritalStatus" },
  { id: "weddingAnniversary", labelKey: "weddingAnniversary" },
  { id: "registrationType", labelKey: "registrationType" },
  { id: "relationship", labelKey: "relationship" },
];
