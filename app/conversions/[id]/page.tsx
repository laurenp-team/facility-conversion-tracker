import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Conversion, DocumentRow } from "@/lib/types";
import { ConversionDetailsForm } from "./conversion-details-form";
import { DocumentsTable } from "./documents-table";

export const dynamic = "force-dynamic";

export default async function ConversionRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [conversionResult, documentsResult] = await Promise.all([
    supabase.from("conversions").select("*").eq("id", id).single(),
    supabase
      .from("documents")
      .select("*")
      .eq("conversion_id", id)
      .order("name"),
  ]);

  const conversion = conversionResult.data as Conversion | null;
  const documents = documentsResult.data as DocumentRow[] | null;

  if (conversionResult.error || !conversion) {
    notFound();
  }

  return (
    <main className="page">
      <p>
        <Link href="/">&larr; All conversions</Link>
      </p>
      <h1>Conversion Record</h1>

      <ConversionDetailsForm conversion={conversion} />

      <h2>Documents</h2>
      {documentsResult.error && (
        <p className="error">
          Failed to load documents: {documentsResult.error.message}
        </p>
      )}
      <DocumentsTable conversionId={id} initialDocuments={documents ?? []} />

      <p className="section-nav">
        <Link href={`/conversions/${id}/issues`}>Go to Issue Log &rarr;</Link>
      </p>
    </main>
  );
}
