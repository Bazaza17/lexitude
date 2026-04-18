import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("audit_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ run: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH toggles archive state. Body: `{ archived: boolean }`.
 *   archived=true  → set archived_at = now()  (archive)
 *   archived=false → set archived_at = null   (restore)
 *
 * Archive is a soft delete: the row stays, just gets filtered out of the
 * default history view. Requires the audit_runs_public_update RLS policy
 * added in the schema migration — without it, this silently no-ops.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    if (typeof body?.archived !== "boolean") {
      return Response.json(
        { error: "Body must include { archived: boolean }" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("audit_runs")
      .update({ archived_at: body.archived ? new Date().toISOString() : null })
      .eq("id", id)
      .select("id, archived_at")
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      // No row updated means either the id doesn't exist OR RLS silently
      // filtered it. We surface a 404 either way — the client can't fix
      // an RLS misconfiguration but it knows the update didn't land.
      return Response.json(
        { error: "Run not found or update blocked by RLS policy" },
        { status: 404 },
      );
    }

    return Response.json({
      id: data.id,
      archivedAt: data.archived_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("audit_runs")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      // Same RLS-vs-missing-row ambiguity as PATCH. Surface it so the UI
      // doesn't silently claim success.
      return Response.json(
        { error: "Run not found or delete blocked by RLS policy" },
        { status: 404 },
      );
    }

    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
