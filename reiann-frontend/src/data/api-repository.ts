import type { ClassSlot } from "@/core/schedule";
import type { CourseRecord } from "@/core/types";
import type {
  CalculatorState, DemoUser, Profile, Repository, ShareLink,
  ShareLinkOptions, SharedSchedule,
} from "./repository";
import { supabase } from "./supabase-client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(path: string, method = "GET", body?: unknown, isPublic = false): Promise<T> {
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is required");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isPublic) {
    const { data, error } = await supabase().auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const response = await fetch(new URL(path, apiUrl), {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store",
  });
  const payload = await response.json() as { data?: T; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `API error ${response.status}`);
  return payload.data as T;
}

export const apiRepository: Repository = {
  async getUser(): Promise<DemoUser | null> {
    const { data: session, error: sessionError } = await supabase().auth.getSession();
    if (sessionError) throw sessionError;
    if (!session.session) return null;
    const { data, error } = await supabase().auth.getUser();
    if (error) throw error;
    const user = data.user;
    if (!user) return null;
    return {
      id: user.id, email: user.email ?? "", displayName: "นิสิต",
      kuVerified: user.email?.toLowerCase().endsWith("@ku.th") ?? false,
    };
  },
  async signIn() {
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google", options: { redirectTo: window.location.href },
    });
    if (error) throw error;
  },
  async signOut() {
    const { error } = await supabase().auth.signOut();
    if (error) throw error;
  },
  getProfile: () => request<Profile | null>("/v1/profile"),
  saveProfile: (p) => request<Profile>("/v1/profile", "PUT", p),
  getRecords: () => request<CourseRecord[]>("/v1/records"),
  async confirmTranscript(records, issued) {
    await request<CourseRecord[]>("/v1/records", "PUT", { records, issued, status: "confirmed" });
  },
  async skipTranscript() {
    await request<null>("/v1/transcript/skip", "POST");
  },
  saveRecords: (records) => request<CourseRecord[]>("/v1/records", "PUT", { records }),
  getCalculator: (code) => request<CalculatorState>(`/v1/calculators/${encodeURIComponent(code)}`),
  saveCalculator: (state) => request<CalculatorState>(
    `/v1/calculators/${encodeURIComponent(state.courseCode)}`, "PUT", state,
  ),
  getLastCalculatorCode: () => request<string | null>("/v1/calculators/last"),
  getSlots: () => request<ClassSlot[]>("/v1/slots"),
  saveSlot: (slot) => request<ClassSlot>(`/v1/slots/${encodeURIComponent(slot.id)}`, "PUT", slot),
  async deleteSlot(id) {
    await request<null>(`/v1/slots/${encodeURIComponent(id)}`, "DELETE");
  },
  listShareLinks: () => request<ShareLink[]>("/v1/share-links"),
  createShareLink: (opts: ShareLinkOptions) => request<ShareLink>("/v1/share-links", "POST", opts),
  async revokeShareLink(token) {
    await request<null>(`/v1/share-links/${encodeURIComponent(token)}/revoke`, "POST");
  },
  getSharedSchedule: (token) => request<SharedSchedule | null>(
    `/v1/shared/${encodeURIComponent(token)}`, "GET", undefined, true,
  ),
  getNextTermPlan: () => request<string[] | null>("/v1/plan"),
  saveNextTermPlan: (codes) => request<string[]>("/v1/plan", "PUT", { codes }),
  async resetData() {
    await request<null>("/v1/data", "DELETE");
    const { error } = await supabase().auth.signOut();
    if (error) throw error;
  },
};
