import type { Devotee } from "@/types/db";
import { formatInr } from "@/lib/currency";
import type { ColumnDef } from "../types";

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-IN") : "—";
}

export interface DevoteeExportLabels {
  headers: {
    name: string;
    phone: string;
    whatsappOptIn: string;
    language: string;
    donor: string;
    totalDonated: string;
    birthStar: string;
    gothram: string;
    dateOfBirth: string;
    gender: string;
    maritalStatus: string;
    weddingAnniversary: string;
    registrationType: string;
    familyName: string;
    relationship: string;
    firstSeen: string;
    lastSeen: string;
  };
  yes: string;
  no: string;
  individual: string;
  family: string;
  /** Keyed by the closed RelationshipCode union (head_of_family, husband, ...) — see devotees.relationshipNames. */
  relationshipLabels: Record<string, string>;
  /** Keyed by the stored gender value — see devotees.formDialog.genderOptions. */
  genderLabels: Record<string, string>;
  /** Keyed by the stored marital status value — see devotees.formDialog.maritalStatusOptions. */
  maritalStatusLabels: Record<string, string>;
}

export function buildDevoteeExportColumns(labels: DevoteeExportLabels): ColumnDef<Devotee>[] {
  return [
    { key: "displayName", header: labels.headers.name, accessor: (d) => d.displayName, width: 24 },
    { key: "whatsappPhone", header: labels.headers.phone, accessor: (d) => d.whatsappPhone ?? "—", width: 18 },
    {
      key: "whatsappOptInStatus",
      header: labels.headers.whatsappOptIn,
      accessor: (d) => (d.whatsappOptInStatus ? labels.yes : labels.no),
      width: 14,
    },
    { key: "preferredLanguage", header: labels.headers.language, accessor: (d) => d.preferredLanguage?.toUpperCase() ?? "—", width: 10 },
    { key: "isDonor", header: labels.headers.donor, accessor: (d) => (d.isDonor ? labels.yes : labels.no), width: 10 },
    { key: "totalDonatedAmount", header: labels.headers.totalDonated, accessor: (d) => formatInr(Number(d.totalDonatedAmount)), width: 16 },
    { key: "birthStar", header: labels.headers.birthStar, accessor: (d) => d.birthStar ?? "—", width: 16 },
    { key: "ancestralLineage", header: labels.headers.gothram, accessor: (d) => d.ancestralLineage ?? "—", width: 16 },
    { key: "dateOfBirth", header: labels.headers.dateOfBirth, accessor: (d) => d.dateOfBirth ?? "—", width: 14 },
    {
      key: "gender",
      header: labels.headers.gender,
      accessor: (d) => (d.gender ? (labels.genderLabels[d.gender] ?? d.gender) : "—"),
      width: 10,
    },
    {
      key: "maritalStatus",
      header: labels.headers.maritalStatus,
      accessor: (d) => (d.maritalStatus ? (labels.maritalStatusLabels[d.maritalStatus] ?? d.maritalStatus) : "—"),
      width: 14,
    },
    { key: "weddingAnniversary", header: labels.headers.weddingAnniversary, accessor: (d) => d.weddingAnniversary ?? "—", width: 18 },
    {
      key: "registrationType",
      header: labels.headers.registrationType,
      accessor: (d) => (d.familyId ? labels.family : labels.individual),
      width: 16,
    },
    { key: "familyName", header: labels.headers.familyName, accessor: (d) => d.familyName ?? "—", width: 20 },
    {
      key: "relationship",
      header: labels.headers.relationship,
      accessor: (d) => (d.relationship ? (labels.relationshipLabels[d.relationship] ?? d.relationship) : "—"),
      width: 16,
    },
    { key: "firstSeenAt", header: labels.headers.firstSeen, accessor: (d) => formatDate(d.firstSeenAt), width: 14 },
    { key: "lastSeenAt", header: labels.headers.lastSeen, accessor: (d) => formatDate(d.lastSeenAt), width: 14 },
  ];
}

interface TemplateExampleRow {
  name: string;
  phone: string;
  registrationType: string;
  familyName: string;
  relationship: string;
  gender: string;
  maritalStatus: string;
  dob: string;
  anniversary: string;
  birthStar: string;
  gothram: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  primaryLanguage: string;
}

export const DEVOTEE_IMPORT_TEMPLATE_COLUMNS: ColumnDef<TemplateExampleRow>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, width: 24 },
  { key: "phone", header: "WhatsApp Phone", accessor: (r) => r.phone, width: 18 },
  { key: "registrationType", header: "Registration Type", accessor: (r) => r.registrationType, width: 16 },
  { key: "familyName", header: "Family Name", accessor: (r) => r.familyName, width: 20 },
  { key: "relationship", header: "Relationship", accessor: (r) => r.relationship, width: 18 },
  { key: "gender", header: "Gender", accessor: (r) => r.gender, width: 10 },
  { key: "maritalStatus", header: "Marital Status", accessor: (r) => r.maritalStatus, width: 14 },
  { key: "dob", header: "Date of Birth (YYYY-MM-DD)", accessor: (r) => r.dob, width: 22 },
  { key: "anniversary", header: "Wedding Anniversary (YYYY-MM-DD)", accessor: (r) => r.anniversary, width: 26 },
  { key: "birthStar", header: "Birth Star", accessor: (r) => r.birthStar, width: 16 },
  { key: "gothram", header: "Gothram/Ancestral Lineage", accessor: (r) => r.gothram, width: 20 },
  { key: "address", header: "Address (family only)", accessor: (r) => r.address, width: 24 },
  { key: "city", header: "City (family only)", accessor: (r) => r.city, width: 16 },
  { key: "state", header: "State (family only)", accessor: (r) => r.state, width: 16 },
  { key: "pincode", header: "Pincode (family only)", accessor: (r) => r.pincode, width: 12 },
  { key: "primaryLanguage", header: "Primary Language (family only)", accessor: (r) => r.primaryLanguage, width: 20 },
];

/**
 * Worked example — one individual row and a 3-row family group — since the
 * "same Family Name groups rows into one household, exactly one row must be
 * Head of Family" convention isn't self-explanatory from headers alone.
 */
export const DEVOTEE_IMPORT_TEMPLATE_EXAMPLE_ROWS: TemplateExampleRow[] = [
  {
    name: "Anjali Rao",
    phone: "+919876543210",
    registrationType: "Individual",
    familyName: "",
    relationship: "",
    gender: "Female",
    maritalStatus: "Married",
    dob: "1985-04-12",
    anniversary: "",
    birthStar: "Rohini",
    gothram: "Kashyapa",
    address: "",
    city: "",
    state: "",
    pincode: "",
    primaryLanguage: "",
  },
  {
    name: "Ramesh Reddy",
    phone: "+919000000001",
    registrationType: "Family",
    familyName: "Reddy Family",
    relationship: "Head of Family",
    gender: "Male",
    maritalStatus: "Married",
    dob: "1975-06-01",
    anniversary: "2000-02-14",
    birthStar: "Ashwini",
    gothram: "Bharadwaja",
    address: "12 Temple Street",
    city: "Vijayawada",
    state: "Andhra Pradesh",
    pincode: "520001",
    primaryLanguage: "Telugu",
  },
  {
    name: "Lakshmi Reddy",
    phone: "",
    registrationType: "Family",
    familyName: "Reddy Family",
    relationship: "Wife",
    gender: "Female",
    maritalStatus: "Married",
    dob: "1978-09-23",
    anniversary: "2000-02-14",
    birthStar: "Revati",
    gothram: "Bharadwaja",
    address: "",
    city: "",
    state: "",
    pincode: "",
    primaryLanguage: "",
  },
  {
    name: "Rahul Reddy",
    phone: "",
    registrationType: "Family",
    familyName: "Reddy Family",
    relationship: "Son",
    gender: "Male",
    maritalStatus: "Single",
    dob: "2005-11-05",
    anniversary: "",
    birthStar: "Pushya",
    gothram: "Bharadwaja",
    address: "",
    city: "",
    state: "",
    pincode: "",
    primaryLanguage: "",
  },
];
