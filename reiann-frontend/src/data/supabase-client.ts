import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if ([url, key, apiUrl].some(Boolean) && ![url, key, apiUrl].every(Boolean)) {
  throw new Error("Set Supabase URL, publishable key and API URL together");
}

export const isSupabaseConfigured = Boolean(url && key && apiUrl);
let client: SupabaseClient | undefined;

/** Browser client is used for Google login only; app data goes through the API. */
export function supabase(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase URL and publishable key are required");
  if (!client) client = createClient(url, key);
  return client;
}
