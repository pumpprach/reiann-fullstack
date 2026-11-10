import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const sharedOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
export const publicDb = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, sharedOptions);

/** The Auth server verifies the caller; database requests carry that same JWT for RLS. */
export async function authenticatedDb(header: string | undefined) {
  const token = /^Bearer\s+(.+)$/i.exec(header ?? "")?.[1];
  if (!token) throw new HttpError(401, "Sign in required");
  const { data, error } = await publicDb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid or expired session");
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    ...sharedOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { db, userId: data.user.id };
}

export function checked<T>(result: { data?: T; error: { code?: string; message: string } | null }): T {
  if (result.error) {
    const status = result.error.code === "23505" ? 409
      : result.error.code === "42501" ? 403
      : result.error.code?.startsWith("23") ? 400 : 502;
    throw new HttpError(status, status === 502 ? "Database request failed" : result.error.message);
  }
  return result.data as T;
}
