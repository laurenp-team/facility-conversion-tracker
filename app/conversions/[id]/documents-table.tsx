"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DocumentCategory, DocumentRow, DocumentStatus } from "@/lib/types";
import { DOCUMENT_NAME_OPTIONS, OTHER_OPTION } from "@/lib/document-options";

const STATUSES: DocumentStatus[] = ["not_sent", "sent", "received", "approved"];
const CATEGORIES: DocumentCategory[] = ["financial", "site_build"];

// Past the go-live date and still not received/approved — flagged visually
// so it's obvious at a glance without reading every row.
function isOverdue(doc: DocumentRow, goLiveDate: string): boolean {
  const todayStr = new Date().toISOString().slice(0, 10);
  return (
    goLiveDate < todayStr && doc.status !== "received" && doc.status !== "approved"
  );
}

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export function DocumentsTable({
  conversionId,
  initialDocuments,
  goLiveDate,
}: {
  conversionId: string;
  initialDocuments: DocumentRow[];
  goLiveDate: string;
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>("financial");
  const [selectedName, setSelectedName] = useState<string>(
    DOCUMENT_NAME_OPTIONS.financial[0]
  );
  const [customName, setCustomName] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function handleCategoryChange(next: DocumentCategory) {
    setCategory(next);
    setSelectedName(DOCUMENT_NAME_OPTIONS[next][0]);
    setCustomName("");
  }

  // Draft status per document row, so the "Update status" button submits
  // whatever the select is currently set to for that row.
  const [statusDrafts, setStatusDrafts] = useState<Record<string, DocumentStatus>>(
    () => Object.fromEntries(initialDocuments.map((d) => [d.id, d.status]))
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function handleAddDocument(e: FormEvent) {
    e.preventDefault();

    const name =
      selectedName === OTHER_OPTION ? customName.trim() : selectedName;

    if (!name) {
      setAddError("Enter a name for the document");
      return;
    }

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

    handleCategoryChange("financial");
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
            <tr
              key={doc.id}
              className={isOverdue(doc, goLiveDate) ? "overdue-row" : undefined}
            >
              <td>{doc.name}</td>
              <td>{doc.category}</td>
              <td>
                <span className={`badge badge-${doc.status}`}>{doc.status}</span>
              </td>
              <td>{formatTimestamp(doc.date_sent)}</td>
              <td>{formatTimestamp(doc.date_last_reminded)}</td>
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
            Category
            <select
              value={category}
              onChange={(e) =>
                handleCategoryChange(e.target.value as DocumentCategory)
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <select
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
            >
              {DOCUMENT_NAME_OPTIONS[category].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={OTHER_OPTION}>Other…</option>
            </select>
          </label>
          {selectedName === OTHER_OPTION && (
            <label>
              Other name
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
              />
            </label>
          )}
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
