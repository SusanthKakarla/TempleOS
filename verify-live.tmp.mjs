// READ-ONLY: proves the public site renders current operational data, not a copy.
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env", quiet: true });
config({ path: ".env.local", quiet: true, override: true });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("BEGIN READ ONLY");

// undici forbids setting Host, so use x-forwarded-host — the header the
// Railway proxy actually sets and the one resolveRequestHostname reads first.
const get = async (host, path) => {
  const res = await fetch(`http://127.0.0.1:3000${path}`, { headers: { "x-forwarded-host": host } });
  return res.text();
};

try {
  const { rows: tenants } = await client.query(
    `SELECT t.id, t.slug, t.name, t.morning_open, t.morning_close, t.evening_open, t.evening_close,
            t.address, t.contact_email, t.default_contact_phone, w.enabled
     FROM tenants t JOIN tenant_websites w ON w.tenant_id = t.id
     WHERE t.status='active' ORDER BY t.created_at`);

  console.log("=== Each hostname resolves to its OWN temple ===");
  for (const t of tenants) {
    const html = await get(`${t.slug}.templos.in`, "/");
    const shown = html.match(/<h1[^>]*>([^<]{2,80})</)?.[1] ?? html.match(/([A-Z][^<>]{5,70}) hasn&#x27;t published/)?.[1] ?? "?";
    const leaked = tenants.filter((o) => o.id !== t.id && o.name.length > 6 && html.includes(o.name)).map((o) => o.slug);
    console.log(`  ${t.slug.padEnd(38)} published=${String(t.enabled).padEnd(5)} shows="${shown.trim().slice(0, 46)}"`);
    if (leaked.length) console.log(`     !! LEAK: also contains other tenants' names: ${leaked.join(", ")}`);
  }

  const sample = tenants.find((t) => t.enabled);
  if (!sample) {
    console.log("\n(no published tenant to check live data against)");
  } else {
    console.log(`\n=== Live operational data on ${sample.slug}.templos.in (DB value -> present in rendered HTML?) ===`);
    const host = `${sample.slug}.templos.in`;

    const timings = await get(host, "/timings");
    for (const [label, val] of [
      ["morning_open", sample.morning_open],
      ["morning_close", sample.morning_close],
      ["evening_open", sample.evening_open],
      ["evening_close", sample.evening_close],
    ]) {
      if (!val) { console.log(`  timings.${label}: (null in DB)`); continue; }
      const hhmm = String(val).slice(0, 5);
      const [h, m] = hhmm.split(":").map(Number);
      const ampm = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}`;
      console.log(`  timings.${label} = ${hhmm} -> rendered: ${timings.includes(hhmm) || timings.includes(ampm) ? "YES" : "no"}`);
    }

    const { rows: sevas } = await client.query(
      `SELECT name, price FROM temple_sevas WHERE tenant_id=$1 ORDER BY display_order, name`, [sample.id]);
    const sevaHtml = await get(host, "/sevas");
    console.log(`  sevas in DB: ${sevas.length}`);
    for (const s of sevas) console.log(`    "${s.name}" -> rendered: ${sevaHtml.includes(s.name) ? "YES" : "no"}`);

    const { rows: events } = await client.query(
      `SELECT title FROM events WHERE tenant_id=$1 AND status='published' ORDER BY starts_at`, [sample.id]);
    const eventHtml = await get(host, "/events");
    console.log(`  published events in DB: ${events.length}`);
    for (const e of events) console.log(`    "${e.title}" -> rendered: ${eventHtml.includes(e.title) ? "YES" : "no"}`);

    const { rows: gallery } = await client.query(
      `SELECT image_url FROM notification_media WHERE tenant_id=$1 AND category='temple_gallery'`, [sample.id]);
    const galleryHtml = await get(host, "/gallery");
    const shownImgs = gallery.filter((g) => galleryHtml.includes(g.image_url.split("/").pop().split("?")[0]));
    console.log(`  gallery images in DB: ${gallery.length} -> referenced in /gallery: ${shownImgs.length}`);

    const contactHtml = await get(host, "/contact");
    for (const [label, val] of [["address", sample.address], ["email", sample.contact_email], ["phone", sample.default_contact_phone]]) {
      if (!val) { console.log(`  contact.${label}: (null in DB)`); continue; }
      console.log(`  contact.${label} -> rendered: ${contactHtml.includes(val) ? "YES" : "no"}`);
    }
  }
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
