"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Issue } from "@/lib/types";

export function IssuesTable({ issues }: { issues: Issue[] }) {
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
    return <p>No issues logged yet.</p>;
  }

  return (
    <div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Classification</th>
            <th>Date logged</th>
            <th>Resolved</th>
            <th>Date resolved</th>
            <th></th>
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
              <td>
                {!issue.resolved && (
                  <button
                    type="button"
                    onClick={() => handleMarkResolved(issue.id)}
                    disabled={resolvingId === issue.id}
                  >
                    {resolvingId === issue.id ? "Saving…" : "Mark resolved"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
