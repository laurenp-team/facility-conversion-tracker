import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Conversion, Issue, IssueComment } from "@/lib/types";
import { IssueForm } from "./issue-form";
import { IssuesTable } from "./issues-table";

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

  const issueIds = (issues ?? []).map((issue) => issue.id);
  const commentsByIssueId: Record<string, IssueComment[]> = {};

  if (issueIds.length > 0) {
    const { data: comments } = await supabase
      .from("issue_comments")
      .select("*")
      .in("issue_id", issueIds)
      .order("created_at", { ascending: true })
      .returns<IssueComment[]>();

    for (const comment of comments ?? []) {
      (commentsByIssueId[comment.issue_id] ??= []).push(comment);
    }
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
      {!issuesResult.error && (
        <IssuesTable
          issues={issues ?? []}
          commentsByIssueId={commentsByIssueId}
        />
      )}
    </main>
  );
}
