import type { Metadata } from "next";
import { requireSite } from "@/lib/site/get-site";
import { EmptyNotice, PageHeader } from "@/features/site/site-sections";

export const metadata: Metadata = { title: "Slokas" };

/**
 * Slokas are the one page of the reference site TempleOS cannot yet populate.
 *
 * The reference keeps a hand-authored list of verses (Devanagari, Telugu,
 * transliteration, meaning) in its content file. TempleOS has no equivalent:
 * `temple_faqs` is chatbot question/answer pairs, `temple_special_days` is a
 * calendar, and the website's story/about fields are prose — none carries a
 * verse with its script variants and meaning.
 *
 * Rather than invent a schema in the same pass as the rest of the site, or
 * quietly reuse a field that means something else, this page renders the same
 * honest empty state every other section uses. Adding real slokas needs a
 * small persistent structure plus an admin surface to enter them, which is
 * called out as the single remaining blocker.
 */
export default async function SlokasPage() {
  const { content } = await requireSite();

  return (
    <>
      <PageHeader title="Slokas" subtitle="Verses recited at the temple." content={content} />

      <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        <EmptyNotice message="This temple hasn't published any slokas yet." content={content} />
      </div>
    </>
  );
}
