import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key";
process.env.FRONTEND_ORIGIN = "http://localhost:3000";

const { route } = await import("../src/routes.ts");
const { recordsSchema, slotSchema } = await import("../src/validation.ts");

test("health works without a session", async () => {
  assert.deepEqual(await route("GET", "/health", undefined, undefined), { status: "ok" });
});

test("private data requires a bearer token", async () => {
  await assert.rejects(route("GET", "/v1/records", undefined, undefined),
    (error: unknown) => error instanceof Error && "status" in error && error.status === 401);
});

test("invalid public share token cannot access private routes", async () => {
  assert.equal(await route("GET", "/v1/shared/not-a-token", undefined, undefined), null);
});

test("course replacement rejects duplicate attempts in one term", () => {
  const record = { code: "01418231", term: "2569/1", credits: 3, grade: null };
  assert.equal(recordsSchema.safeParse({ records: [record, record] }).success, false);
});

test("class slots reject times outside study hours", () => {
  const value = {
    id: "00000000-0000-4000-8000-000000000001", courseCode: "01418231",
    day: 0, start: "06:00", end: "08:00", kind: "lecture",
  };
  assert.equal(slotSchema.safeParse(value).success, false);
});
