import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { DocumentCategory, DocumentStatus } from "@/lib/types";

// Vercel Cron hits this once daily (see vercel.json). It's also the "direct
// URL" for manually confirming the logic without waiting a full day — see
// README for the testing steps. Per the 5B spec, "sending a reminder" here
// means recording it (updating date_last_reminded / status) and logging it;
// no real email/SMS is dispatched in this MVP (confirmed with the user).

const FINANCIAL_WINDOW_DAYS = 21; // 3 weeks
const SITE_BUILD_SEND_WINDOW_DAYS = 28; // 4 weeks
const SITE_BUILD_REMINDER_WINDOW_DAYS = 14; // 2 weeks
const REMINDER_COOLDOWN_DAYS = 7;

interface DocumentWithConversion {
  id: string;
  conversion_id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  date_sent: string | null;
  date_last_reminded: string | null;
  conversion: { go_live_date: string } | { go_live_date: string }[] | null;
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Whole days from `from` to `to` (positive if `to` is later).
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function getGoLiveDate(doc: DocumentWithConversion): string | null {
  if (!doc.conversion) return null;
  return Array.isArray(doc.conversion)
    ? (doc.conversion[0]?.go_live_date ?? null)
    : doc.conversion.go_live_date;
}

export async function GET() {
  const today = todayUTC();
  const todayStr = toDateOnlyString(today);

  const { data: documents, error } = await supabase
    .from("documents")
    .select("*, conversion:conversions(go_live_date)")
    .not("status", "in", "(received,approved)")
    .returns<DocumentWithConversion[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const markedSent: string[] = [];
  const remindersSent: string[] = [];
  const skipped: string[] = [];

  for (const doc of documents ?? []) {
    const goLiveDateStr = getGoLiveDate(doc);
    if (!goLiveDateStr) {
      skipped.push(doc.id);
      continue;
    }

    const daysUntilGoLive = daysBetween(today, parseDateOnly(goLiveDateStr));
    const dueForReminder =
      doc.date_last_reminded === null ||
      daysBetween(parseDateOnly(doc.date_last_reminded), today) > REMINDER_COOLDOWN_DAYS;

    if (doc.category === "financial") {
      if (daysUntilGoLive <= FINANCIAL_WINDOW_DAYS && dueForReminder) {
        const { error: updateError } = await supabase
          .from("documents")
          .update({ date_last_reminded: todayStr })
          .eq("id", doc.id);
        if (!updateError) {
          remindersSent.push(doc.id);
          console.log(`[reminder] financial doc ${doc.id} (${doc.name}) reminded`);
        }
      }
      continue;
    }

    if (doc.category === "site_build") {
      // Evaluated against the status as fetched this run, so a document
      // that just gets auto-marked "sent" below doesn't also fire the
      // reminder in the same run.
      const wasNotSent = doc.status === "not_sent";
      const wasSent = doc.status === "sent";

      if (daysUntilGoLive <= SITE_BUILD_SEND_WINDOW_DAYS && wasNotSent) {
        const { error: updateError } = await supabase
          .from("documents")
          .update({ status: "sent", date_sent: todayStr })
          .eq("id", doc.id);
        if (!updateError) {
          markedSent.push(doc.id);
          console.log(`[reminder] site_build doc ${doc.id} (${doc.name}) marked sent`);
        }
      } else if (
        daysUntilGoLive <= SITE_BUILD_REMINDER_WINDOW_DAYS &&
        wasSent &&
        dueForReminder
      ) {
        const { error: updateError } = await supabase
          .from("documents")
          .update({ date_last_reminded: todayStr })
          .eq("id", doc.id);
        if (!updateError) {
          remindersSent.push(doc.id);
          console.log(`[reminder] site_build doc ${doc.id} (${doc.name}) reminded`);
        }
      }
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    checked: documents?.length ?? 0,
    markedSent,
    remindersSent,
    skipped,
  });
}
