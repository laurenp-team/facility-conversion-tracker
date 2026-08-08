"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DocumentCategory, DocumentRow, DocumentStatus } from "@/lib/types";

const STATUSES: DocumentStatus[] = ["not_sent", "sent", "received", "approved"];
const CATEGORIES: DocumentCategory[] = ["financial", "site_build"];

export function DocumentsTable({
  conversionId,
  initialDocuments,
}: {
  conversionId: string;
  initialDocuments: DocumentRow[];
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("financial");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Draft status per document row, so the "Update status" button submits
  // whatever the select is currently set to for that row.
  const [statusDrafts, setStatusDrafts] = useState<Record<string, DocumentStatus>>(
    () => Object.fromEntries(initialDocuments.map((d) => [d.id, d.status]))
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function handleAddDocument(e: FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversion_id: conversionId, name, category }),
    });

    setAddSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setAddError(body.error ?? "Failed to add document");
      return;
    }

    setName("");
    setCategory("financial");
    setShowAddForm(false);
    router.refresh();
  }

  async function handleUpdateStatus(documentId: string) {
    setUpdatingId(documentId);
    setUpdateError(null);

    const res = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusDrafts[documentId] }),
    });

    setUpdatingId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUpdateError(body.error ?? "Failed to update status");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date sent</th>
            <th>Date last reminded</th>
            <th>Update status</th>
          </tr>
        </thead>
        <tbody>
          {initialDocuments.length === 0 && (
            <tr>
              <td colSpan={6}>No documents yet.</td>
            </tr>
          )}
          {initialDocuments.map((doc) => (
            <tr key={doc.id}>
              <td>{doc.name}</td>
              <td>{doc.category}</td>
              <td>{doc.status}</td>
              <td>{doc.date_sent ?? "—"}</td>
              <td>{doc.date_last_reminded ?? "—"}</td>
              <td className="row-actions">
                <select
                  value={statusDrafts[doc.id]}
                  onChange={(e) =>
                    setStatusDrafts((prev) => ({
                      ...prev,
                      [doc.id]: e.target.value as DocumentStatus,
                    }))
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(doc.id)}
                  disabled={updatingId === doc.id}
                >
                  {updatingId === doc.id ? "Updating…" : "Update status"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {updateError && <p className="error">{updateError}</p>}

      {!showAddForm && (
        <button type="button" onClick={() => setShowAddForm(true)}>
          Add document
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddDocument} className="inline-form">
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={addSubmitting}>
            {addSubmitting ? "Adding…" : "Save document"}
          </button>
          <button type="button" onClick={() => setShowAddForm(false)}>
            Cancel
          </button>
          {addError && <p className="error">{addError}</p>}
        </form>
      )}
    </div>
  );
}
