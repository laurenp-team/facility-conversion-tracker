"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Issue, IssueComment } from "@/lib/types";
import { IssueComments } from "./issue-comments";

export function IssuesTable({
  issues,
  commentsByIssueId,
  emptyMessage = "No issues logged yet.",
}: {
  issues: Issue[];
  commentsByIssueId: Record<string, IssueComment[]>;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkResolved(issueId: string) {
    setResolvingId(issueId);
    setError(null);

    const res = await fetch(`/api/issues/${issueId}`, { method: "PATCH" });

    setResolvingId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to mark resolved");
      return;
    }

    router.refresh();
  }

  if (issues.length === 0) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <div className="issue-list">
      {error && <p className="error">{error}</p>}
      {issues.map((issue) => (
        <div key={issue.id} className="issue-card">
          <p className="issue-description">{issue.description}</p>
          <div className="issue-meta">
            <span>Classification: {issue.classification ?? "pending"}</span>
            <span>Logged: {new Date(issue.date_logged).toLocaleString()}</span>
            <span>Resolved: {issue.resolved ? "Yes" : "No"}</span>
            <span>
              Resolved on:{" "}
              {issue.date_resolved
                ? new Date(issue.date_resolved).toLocaleString()
                : "—"}
            </span>
            {!issue.resolved && (
              <button
                type="button"
                onClick={() => handleMarkResolved(issue.id)}
                disabled={resolvingId === issue.id}
              >
                {resolvingId === issue.id ? "Saving…" : "Mark resolved"}
              </button>
            )}
          </div>

          <h3>Comments</h3>
          <IssueComments
            issueId={issue.id}
            comments={commentsByIssueId[issue.id] ?? []}
          />
        </div>
      ))}
    </div>
  );
}
