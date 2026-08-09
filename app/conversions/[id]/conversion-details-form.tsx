"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Conversion } from "@/lib/types";

function describeGoLiveOffset(goLiveDate: string): string {
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const [y, m, d] = goLiveDate.split("-").map(Number);
  const goLiveUTC = Date.UTC(y, m - 1, d);
  const days = Math.round((goLiveUTC - todayUTC) / 86_400_000);

  if (days === 0) return "Go-live is today";
  if (days > 0) return `Go-live in ${days} day${days === 1 ? "" : "s"}`;
  return `Go-live was ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
}

export function ConversionDetailsForm({ conversion }: { conversion: Conversion }) {
  const router = useRouter();
  const [facilityName, setFacilityName] = useState(conversion.facility_name);
  const [goLiveDate, setGoLiveDate] = useState(conversion.go_live_date);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch(`/api/conversions/${conversion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_name: facilityName,
        go_live_date: goLiveDate,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <div className="inline-form">
      <label>
        Facility name
        <input
          type="text"
          value={facilityName}
          onChange={(e) => setFacilityName(e.target.value)}
        />
      </label>
      <label>
        Go-live date
        <input
          type="date"
          value={goLiveDate}
          onChange={(e) => setGoLiveDate(e.target.value)}
        />
        {goLiveDate && (
          <span className="hint">{describeGoLiveOffset(goLiveDate)}</span>
        )}
      </label>
      <button type="button" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      {saved && <span className="confirmation">Saved.</span>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
