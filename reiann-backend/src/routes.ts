import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalculatorState, ClassSlot, CourseRecord, Profile, ShareLink, SharedSchedule } from "./contracts.js";
import { authenticatedDb, checked, HttpError, publicDb } from "./db.js";
import {
  calculatorSchema, planSchema, profileSchema, recordsSchema,
  shareOptionsSchema, slotSchema,
} from "./validation.js";

const CURRENT_TERM = "2569/1";
const TERM_END = "2026-12-20T23:59:59+07:00";
const TOKEN = /^[0-9a-f]{48}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slot(row: Record<string, unknown>): ClassSlot {
  return {
    id: String(row.id), courseCode: String(row.course_code), day: Number(row.day),
    start: String(row.start_time).slice(0, 5), end: String(row.end_time).slice(0, 5),
    kind: row.kind as ClassSlot["kind"],
    room: row.room ? String(row.room) : undefined,
    section: row.section ? String(row.section) : undefined,
  };
}

function share(row: Record<string, unknown>): ShareLink {
  return {
    token: String(row.token), name: String(row.name), expiresInDays: null,
    showCourseNames: Boolean(row.show_course_names), allowCompare: Boolean(row.allow_compare),
    createdAt: String(row.created_at), expiresAt: String(row.expires_at),
    revoked: Boolean(row.revoked_at),
  };
}

function defaultCalculator(code: string): CalculatorState {
  const split = [
    ["hw", "การบ้าน", 10], ["proj", "โปรเจกต์", 10], ["quiz", "ควิซ", 10],
    ["mid", "สอบกลางภาค", 30], ["final", "สอบปลายภาค", 40],
  ] as const;
  return {
    courseCode: code,
    categories: split.map(([id, name, weight]) => ({ id, name, weight, max: weight, score: null })),
    target: "B+", cutoffMode: "fixed",
    cutoffs: { A: 80, "B+": 75, B: 70, "C+": 65, C: 60, "D+": 55, D: 50, F: 0 },
    updatedAt: new Date().toISOString(),
  };
}

function profile(row: Record<string, unknown> | null): Profile | null {
  if (!row) return null;
  return {
    programId: String(row.program_id), campusId: String(row.campus_id),
    year: Number(row.study_year), transcript: row.transcript_status as Profile["transcript"],
    transcriptIssued: row.transcript_issued ? String(row.transcript_issued) : undefined,
  };
}

type UserDb = SupabaseClient;

async function handlePrivate(method: string, path: string, body: unknown, db: UserDb, id: string): Promise<unknown> {
  if (path === "/v1/profile") {
    if (method === "GET") {
      const row = checked(await db.from("profiles").select("*").eq("user_id", id).maybeSingle());
      return profile(row as Record<string, unknown> | null);
    }
    if (method === "PUT") {
      const p = profileSchema.parse(body);
      checked(await db.from("profiles").upsert({
        user_id: id, program_id: p.programId, campus_id: p.campusId,
        study_year: p.year, transcript_status: p.transcript,
        transcript_issued: p.transcriptIssued ?? null, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }));
      return p;
    }
  }

  if (path === "/v1/records") {
    if (method === "GET") {
      const rows = checked(await db.from("course_records").select("code,term,credits,grade")
        .eq("user_id", id).order("term").order("code")) as Record<string, unknown>[] | null;
      return (rows ?? []).map((r): CourseRecord => ({
        code: String(r.code), term: String(r.term), credits: Number(r.credits),
        grade: r.grade as CourseRecord["grade"],
      }));
    }
    if (method === "PUT") {
      const p = recordsSchema.parse(body);
      checked(await db.rpc("replace_course_records", {
        p_records: p.records, p_status: p.status ?? null, p_issued: p.issued ?? null,
      }));
      return p.records;
    }
  }
  if (path === "/v1/transcript/skip" && method === "POST") {
    checked(await db.from("profiles").update({
      transcript_status: "skipped", updated_at: new Date().toISOString(),
    }).eq("user_id", id));
    return null;
  }

  if (path === "/v1/calculators/last" && method === "GET") {
    const row = checked(await db.from("calculators").select("course_code").eq("user_id", id)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle()) as Record<string, unknown> | null;
    return row ? String(row.course_code) : null;
  }
  const calculatorCode = /^\/v1\/calculators\/(\d{8})$/.exec(path)?.[1];
  if (calculatorCode) {
    if (method === "GET") {
      const row = checked(await db.from("calculators").select("state,updated_at")
        .eq("user_id", id).eq("course_code", calculatorCode).maybeSingle()) as Record<string, unknown> | null;
      return row ? { ...(row.state as CalculatorState), updatedAt: String(row.updated_at) }
        : defaultCalculator(calculatorCode);
    }
    if (method === "PUT") {
      const p = calculatorSchema.parse(body);
      if (p.courseCode !== calculatorCode) throw new HttpError(400, "Course code mismatch");
      const saved = { ...p, updatedAt: new Date().toISOString() };
      checked(await db.from("calculators").upsert({
        user_id: id, course_code: calculatorCode, state: saved, updated_at: saved.updatedAt,
      }, { onConflict: "user_id,course_code" }));
      return saved;
    }
  }

  if (path === "/v1/slots" && method === "GET") {
    const rows = checked(await db.from("class_slots").select("*").eq("user_id", id)
      .eq("term", CURRENT_TERM).order("day").order("start_time")) as Record<string, unknown>[] | null;
    return (rows ?? []).map(slot);
  }
  const slotId = /^\/v1\/slots\/([0-9a-f-]+)$/i.exec(path)?.[1];
  if (slotId && UUID.test(slotId)) {
    if (method === "PUT") {
      const p = slotSchema.parse(body);
      if (p.id !== slotId) throw new HttpError(400, "Slot ID mismatch");
      const row = checked(await db.from("class_slots").upsert({
        id: p.id, user_id: id, term: CURRENT_TERM, course_code: p.courseCode,
        day: p.day, start_time: p.start, end_time: p.end, kind: p.kind,
        room: p.room ?? null, section: p.section ?? null, updated_at: new Date().toISOString(),
      }, { onConflict: "id" }).select().single());
      return slot(row as unknown as Record<string, unknown>);
    }
    if (method === "DELETE") {
      checked(await db.from("class_slots").delete().eq("id", slotId).eq("user_id", id));
      return null;
    }
  }

  if (path === "/v1/share-links") {
    if (method === "GET") {
      const rows = checked(await db.from("share_links").select("*").eq("user_id", id)
        .is("revoked_at", null).gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })) as Record<string, unknown>[] | null;
      return (rows ?? []).map(share);
    }
    if (method === "POST") {
      const p = shareOptionsSchema.parse(body);
      const expires = p.expiresInDays
        ? new Date(Date.now() + p.expiresInDays * 86_400_000).toISOString()
        : new Date(TERM_END).toISOString();
      if (new Date(expires).getTime() <= Date.now()) throw new HttpError(400, "Term has ended");
      const row = checked(await db.from("share_links").insert({
        user_id: id, name: p.name, term: CURRENT_TERM, expires_at: expires,
        show_course_names: p.showCourseNames, allow_compare: p.allowCompare,
      }).select().single());
      return { ...share(row as unknown as Record<string, unknown>), expiresInDays: p.expiresInDays };
    }
  }
  const revokeToken = /^\/v1\/share-links\/([0-9a-f]{48})\/revoke$/.exec(path)?.[1];
  if (revokeToken && method === "POST") {
    checked(await db.from("share_links").update({ revoked_at: new Date().toISOString() })
      .eq("user_id", id).eq("token", revokeToken));
    return null;
  }

  if (path === "/v1/plan") {
    if (method === "GET") {
      const row = checked(await db.from("next_term_plans").select("codes")
        .eq("user_id", id).maybeSingle()) as Record<string, unknown> | null;
      return row ? row.codes : null;
    }
    if (method === "PUT") {
      const p = planSchema.parse(body);
      const codes = [...new Set(p.codes)];
      checked(await db.from("next_term_plans").upsert({
        user_id: id, codes, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }));
      return codes;
    }
  }
  if (path === "/v1/data" && method === "DELETE") {
    checked(await db.rpc("reset_my_data"));
    return null;
  }
  throw new HttpError(404, "Endpoint not found");
}

/** Returns the response payload. All private routes verify Auth before database access. */
export async function route(method: string, path: string, body: unknown, authorization: string | undefined): Promise<unknown> {
  if (path === "/health" && method === "GET") return { status: "ok" };
  if (path.startsWith("/v1/shared/") && method === "GET") {
    const sharedToken = path.slice("/v1/shared/".length);
    if (!TOKEN.test(sharedToken)) return null;
    return checked(await publicDb.rpc("get_shared_schedule", { p_token: sharedToken })) as SharedSchedule | null;
  }
  const { db, userId } = await authenticatedDb(authorization);
  return handlePrivate(method, path, body, db, userId);
}
