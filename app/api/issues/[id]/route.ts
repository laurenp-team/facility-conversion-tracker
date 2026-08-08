import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// "Mark resolved" action — plain write, no Claude call. Sets resolved=true
// and date_resolved=now. Not in the original spec's button list (the spec
// only described these as display fields), added after the fact per user
// request since there was otherwise no way to resolve an issue.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("issues")
    .update({ resolved: true, date_resolved: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
