import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Conversion, Issue } from "@/lib/types";
import { IssueForm } from "./issue-form";

export const dynamic = "force-dynamic";

export default async function IssueLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [conversionResult, issuesResult] = await Promise.all([
    supabase.from("conversions").select("*").eq("id", id).single(),
    supabase
      .from("issues")
      .select("*")
      .eq("conversion_id", id)
      .order("date_logged", { ascending: false }),
  ]);

  const conversion = conversionResult.data as Conversion | null;
  const issues = issuesResult.data as Issue[] | null;

  if (conversionResult.error || !conversion) {
    notFound();
  }

  return (
    <main className="page">
      <p>
        <Link href={`/conversions/${id}`}>&larr; Conversion Record</Link>
      </p>
      <h1>Issue Log — {conversion.facility_name}</h1>

      <IssueForm conversionId={id} />

      <h2>Logged issues</h2>
      {issuesResult.error && (
        <p className="error">Failed to load issues: {issuesResult.error.message}</p>
      )}
      {!issuesResult.error && (!issues || issues.length === 0) && (
        <p>No issues logged yet.</p>
      )}
      {!issuesResult.error && issues && issues.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Classification</th>
              <th>Date logged</th>
              <th>Resolved</th>
              <th>Date resolved</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td>{issue.description}</td>
                <td>{issue.classification ?? "pending"}</td>
                <td>{new Date(issue.date_logged).toLocaleString()}</td>
                <td>{issue.resolved ? "Yes" : "No"}</td>
                <td>
                  {issue.date_resolved
                    ? new Date(issue.date_resolved).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
