"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Conversion } from "@/lib/types";

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
      </label>
      <button type="button" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      {saved && <span className="confirmation">Saved.</span>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
