import { BASIC_SCORE_PLAN, DEFAULT_CUTOFFS, type ScoreCategory } from "@/core/calculator";
import type { ClassSlot } from "@/core/schedule";
import type { CourseRecord } from "@/core/types";
import { FRIEND_SCHEDULE, SAMPLE_SLOTS } from "@/mocks/schedule";
import type {
  CalculatorState,
  DemoUser,
  Profile,
  Repository,
  ShareLink,
  ShareLinkOptions,
  SharedSchedule,
} from "./repository";

/**
 * Demo backend: keeps everything in this browser's localStorage. Data never
 * leaves the device. Swap for the Supabase repository later.
 */

const KEY = "reiann.demo.v1";
const TERM_END = "2026-12-20";

interface DemoState {
  user: DemoUser | null;
  profile: Profile | null;
  records: CourseRecord[];
  calculators: Record<string, CalculatorState>;
  lastCalculatorCode: string | null;
  slots: ClassSlot[];
  shareLinks: ShareLink[];
  nextTermPlan: string[] | null;
}

const empty = (): DemoState => ({
  user: null,
  profile: null,
  records: [],
  calculators: {},
  lastCalculatorCode: null,
  slots: SAMPLE_SLOTS,
  shareLinks: [],
  nextTermPlan: null,
});

function read(): DemoState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Partial<DemoState>) } : empty();
  } catch {
    return empty();
  }
}

function write(state: DemoState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or storage full: the demo keeps working for this page view.
  }
}

function update(fn: (s: DemoState) => void): DemoState {
  const s = read();
  fn(s);
  write(s);
  return s;
}

const tick = () => new Promise((r) => setTimeout(r, 120));

function randomToken() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
}

/** Score categories the calculator starts with. Numbers are examples. */
function defaultCategories(code: string): ScoreCategory[] {
  const example: Record<string, number> = code === "01418231" ? { hw: 8, proj: 9, quiz: 8, mid: 24 } : {};
  return BASIC_SCORE_PLAN.map((c) => ({ ...c, max: c.weight, score: example[c.id] ?? null }));
}

export const localRepository: Repository = {
  async getUser() {
    return read().user;
  },
  async signIn() {
    await tick();
    const user: DemoUser = {
      id: "demo-user",
      email: "demo@reiann.app",
      displayName: "นิสิตทดลอง",
      kuVerified: false,
    };
    update((s) => {
      // A different account signing in replaces leftover local data.
      if (s.user && s.user.id !== user.id) Object.assign(s, empty());
      s.user = user;
    });
  },
  async signOut() {
    update((s) => {
      s.user = null;
    });
  },

  async getProfile() {
    return read().profile;
  },
  async saveProfile(p) {
    await tick();
    update((s) => {
      s.profile = p;
    });
    return p;
  },

  async getRecords() {
    return read().records;
  },
  async confirmTranscript(records, issued) {
    await tick();
    update((s) => {
      s.records = records;
      if (s.profile) {
        s.profile.transcript = "confirmed";
        s.profile.transcriptIssued = issued;
      }
    });
  },
  async saveRecords(records) {
    update((s) => {
      s.records = records;
    });
    return records;
  },
  async skipTranscript() {
    update((s) => {
      if (s.profile) s.profile.transcript = "skipped";
    });
  },

  async getCalculator(code) {
    const s = read();
    return (
      s.calculators[code] ?? {
        courseCode: code,
        categories: defaultCategories(code),
        target: "B+",
        cutoffMode: "fixed",
        cutoffs: DEFAULT_CUTOFFS,
        updatedAt: new Date().toISOString(),
      }
    );
  },
  async saveCalculator(state) {
    const saved = { ...state, updatedAt: new Date().toISOString() };
    update((s) => {
      s.calculators[state.courseCode] = saved;
      s.lastCalculatorCode = state.courseCode;
    });
    return saved;
  },
  async getLastCalculatorCode() {
    return read().lastCalculatorCode;
  },

  async getSlots() {
    return read().slots;
  },
  async saveSlot(slot) {
    await tick();
    update((s) => {
      const i = s.slots.findIndex((x) => x.id === slot.id);
      if (i >= 0) s.slots[i] = slot;
      else s.slots.push(slot);
    });
    return slot;
  },
  async deleteSlot(id) {
    update((s) => {
      s.slots = s.slots.filter((x) => x.id !== id);
    });
  },

  async listShareLinks() {
    return read().shareLinks.filter((l) => !l.revoked);
  },
  async createShareLink(opts: ShareLinkOptions) {
    await tick();
    const now = new Date();
    const expires = opts.expiresInDays
      ? new Date(now.getTime() + opts.expiresInDays * 86_400_000).toISOString().slice(0, 10)
      : TERM_END;
    const link: ShareLink = {
      ...opts,
      token: randomToken(),
      createdAt: now.toISOString(),
      expiresAt: expires,
      revoked: false,
    };
    update((s) => {
      s.shareLinks.unshift(link);
    });
    return link;
  },
  async revokeShareLink(token) {
    update((s) => {
      const l = s.shareLinks.find((x) => x.token === token);
      if (l) l.revoked = true;
    });
  },
  async getSharedSchedule(token): Promise<SharedSchedule | null> {
    await tick();
    if (token === "demo") {
      return { ...FRIEND_SCHEDULE, showCourseNames: true, allowCompare: true };
    }
    // Demo only: links created here resolve in this same browser.
    const s = read();
    const link = s.shareLinks.find((l) => l.token === token);
    if (!link || link.revoked || link.expiresAt < new Date().toISOString().slice(0, 10)) {
      return null;
    }
    return {
      ownerLabel: s.user?.displayName ?? "เพื่อน",
      term: "2569/1",
      expiresAt: link.expiresAt,
      updatedAt: new Date().toISOString(),
      showCourseNames: link.showCourseNames,
      allowCompare: link.allowCompare,
      slots: s.slots,
    };
  },

  async getNextTermPlan() {
    return read().nextTermPlan;
  },
  async saveNextTermPlan(codes) {
    await tick();
    return update((s) => {
      s.nextTermPlan = [...new Set(codes)];
    }).nextTermPlan!;
  },

  async resetData() {
    write(empty());
  },
};
