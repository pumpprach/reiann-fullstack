"use client";

import { Building2, Check, Clock3, FileText, GraduationCap, Globe, LockOpen, SearchX, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { cn } from "cn";
import { matchesQuery, type CourseStatus } from "@/core/courses";
import type { Course, CreditCategory } from "@/core/types";
import { Card, Chip, type PopColor } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_STYLE, CategoryDot, CategoryTag, CategoryTile } from "@/features/courses/category";
import { STATUS_ICON_COLOR, StatusLine, useCourseStatus } from "@/features/courses/status";
import { Link, useRouter } from "@/i18n/navigation";
import { PLAN_TERM, PREREQS } from "@/mocks/course-info";
import { CATALOG, CURRICULUM_CODES } from "@/mocks/courses";
import { GE_BY_CODE } from "@/mocks/ge-courses";

type Scope = "mine" | "ge" | "all";
type StatusFilter = "not-taken" | "can-take" | "in-progress" | "passed";
type Sort = "code" | "name" | "credits";

const CATEGORIES: CreditCategory[] = ["core", "required", "elective", "general", "free"];
const CREDIT_OPTIONS = [1, 2, 3, 6];
const CREDIT_POP: Record<number, PopColor> = { 1: "sky", 2: "matcha", 3: "mango", 6: "grape" };
const PAGE = 8;

const statusMatches: Record<StatusFilter, (s: CourseStatus) => boolean> = {
  "not-taken": (s) => s !== "passed" && s !== "in-progress",
  "can-take": (s) => s === "can-take",
  "in-progress": (s) => s === "in-progress",
  passed: (s) => s === "passed",
};

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function CourseSearchPage() {
  return (
    <Suspense>
      <CourseSearch />
    </Suspense>
  );
}

/** Figma: Light / Course Search. Route /search?q=… (frontend-flows §1). */
function CourseSearch() {
  const t = useTranslations("courses");
  const ts = useTranslations("courses.search");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const st = useCourseStatus();

  const [draft, setDraft] = useState(params.get("q") ?? "");
  const [query, setQuery] = useState(draft);
  const scopeParam = params.get("scope");
  const categoryParam = params.get("category") as CreditCategory | null;
  const [scope, setScope] = useState<Scope>(scopeParam === "ge" || scopeParam === "all" ? scopeParam : "mine");
  const statusParam = params.get("status") as StatusFilter | null;
  const [statuses, setStatuses] = useState<StatusFilter[]>(statusParam && statusParam in statusMatches ? [statusParam] : []);
  const [categories, setCategories] = useState<CreditCategory[]>(
    categoryParam && CATEGORIES.includes(categoryParam) ? [categoryParam] : [],
  );
  const [credits, setCredits] = useState<number[]>([]);
  const [sort, setSort] = useState<Sort>("code");
  const [shown, setShown] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const inScope = (c: Course) =>
      scope === "all" ? true : scope === "ge" ? GE_BY_CODE.has(c.code) : CURRICULUM_CODES.has(c.code);
    const list = CATALOG.filter(
      (c) =>
        inScope(c) &&
        matchesQuery(c, query) &&
        (statuses.length === 0 || statuses.some((f) => statusMatches[f](st.status(c.code)))) &&
        (categories.length === 0 || categories.includes(c.category)) &&
        (credits.length === 0 || credits.includes(c.credits)),
    );
    const byName = (a: Course, b: Course) => a.nameEn.localeCompare(b.nameEn);
    return list.sort(
      sort === "name" ? byName : sort === "credits" ? (a, b) => b.credits - a.credits || a.code.localeCompare(b.code) : (a, b) => a.code.localeCompare(b.code),
    );
  }, [scope, query, statuses, categories, credits, sort, st]);

  const activeFilters = statuses.length + categories.length + credits.length + (scope === "mine" ? 0 : 1);
  const clearAll = () => {
    setScope("mine");
    setStatuses([]);
    setCategories([]);
    setCredits([]);
    setShown(PAGE);
  };
  // Any filter change starts the list from the top again.
  const withReset = <A,>(fn: (a: A) => void) => (a: A) => {
    fn(a);
    setShown(PAGE);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setQuery(draft);
    setShown(PAGE);
    router.replace(draft ? `/search?q=${encodeURIComponent(draft)}` : "/search");
  }

  const planText = (c: Course) => {
    const plan = PLAN_TERM[c.code];
    if (plan) return t("planTerm", { year: plan[0], sem: String(plan[1]) });
    const ge = GE_BY_CODE.get(c.code);
    if (ge?.geGroup) return t("planGe", { group: ge.geGroup });
    return c.category === "free" ? t("planFree") : t("planElective");
  };

  const filterPanel = (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="type-h3 text-text">{ts("filters")}</h2>
        <button
          type="button"
          onClick={clearAll}
          disabled={activeFilters === 0}
          className="press type-small-medium text-primary disabled:text-text-disabled"
        >
          {ts("clearAll")}
        </button>
      </div>
      <FilterGroup label={ts("scope")}>
        {(["mine", "ge", "all"] as const).map((s) => {
          const Icon = s === "mine" ? GraduationCap : s === "ge" ? Globe : Building2;
          return (
          <Chip key={s} check selected={scope === s} pop={s === "mine" ? "pink" : s === "ge" ? "mango" : "grape"} onClick={() => withReset(setScope)(s)}>
            {scope !== s && <Icon className="size-4 text-text-secondary" aria-hidden />}
            {ts(s === "mine" ? "scopeMine" : s === "ge" ? "scopeGe" : "scopeAll")}
          </Chip>
          );
        })}
      </FilterGroup>
      <FilterGroup label={ts("yourStatus")}>
        {(
          [
            ["not-taken", "statusNotTaken"],
            ["can-take", "statusCanTake"],
            ["in-progress", "statusInProgress"],
            ["passed", "statusPassed"],
          ] as const
        ).map(([v, key]) => (
          <Chip key={v} check selected={statuses.includes(v)} pop={v === "passed" || v === "can-take" ? "matcha" : v === "in-progress" ? "sky" : "pink"} onClick={() => withReset(setStatuses)(toggle(statuses, v))}>
            {!statuses.includes(v) && (() => {
              const Icon = v === "passed" ? Check : v === "in-progress" ? Clock3 : v === "can-take" ? LockOpen : Search;
              const color = v === "not-taken" ? "text-text-secondary" : STATUS_ICON_COLOR[v];
              return <Icon className={cn("size-4", color)} aria-hidden />;
            })()}
            {ts(key)}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label={ts("category")}>
        {CATEGORIES.map((c) => (
          <Chip key={c} check selected={categories.includes(c)} pop={CATEGORY_STYLE[c].color} onClick={() => withReset(setCategories)(toggle(categories, c))}>
            {!categories.includes(c) && <CategoryDot category={c} />}
            {tc(`category.${c}`)}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label={ts("credits")}>
        {CREDIT_OPTIONS.map((n) => (
          <Chip
            key={n}
            check
            selected={credits.includes(n)}
            pop={CREDIT_POP[n] ?? "pink"}
            onClick={() => withReset(setCredits)(toggle(credits, n))}
            className="min-w-9 justify-center px-2.5"
          >
            {n}
          </Chip>
        ))}
      </FilterGroup>
    </Card>
  );

  return (
    <div>
      <h1 className="type-h2 text-text md:type-h1">{ts("title")}</h1>

      <form
        onSubmit={submit}
        role="search"
        className="field mt-4 flex items-center gap-2 rounded-lg border border-border-strong bg-surface py-2 pr-2 pl-4 md:mt-6"
      >
        <Search className="size-6 shrink-0 text-text-secondary" aria-hidden />
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // Search as you type; the button is there for people who expect one.
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder={ts("placeholder")}
          aria-label={ts("placeholder")}
          className="h-11 min-w-0 flex-1 bg-transparent type-body text-text outline-none placeholder:text-text-secondary"
        />
        <Button type="submit" className="hidden sm:inline-flex">
          {ts("submit")}
        </Button>
      </form>

      <div className="mt-5 grid grid-cols-1 gap-5 md:mt-6 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-6">
        {/* Filters: side panel on desktop, toggled panel on smaller screens */}
        <div className="hidden lg:block">{filterPanel}</div>
        <div className="lg:hidden">
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
            <SlidersHorizontal />
            {ts("showFilters")}
            {activeFilters > 0 && (
              <span className="inline-flex size-5 animate-pop-in items-center justify-center rounded-full bg-secondary type-badge text-on-secondary">
                {activeFilters}
              </span>
            )}
          </Button>
          {filtersOpen && <div className="mt-3 animate-rise-in">{filterPanel}</div>}
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="type-h3 text-text" aria-live="polite">
              <span key={results.length} className="inline-block animate-pop-in">
                {ts("found", { count: results.length })}
              </span>
            </p>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger size="sm" aria-label={ts("sort")} className="w-auto">
                <span className="text-text-secondary">{ts("sort")}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="code">{ts("sortCode")}</SelectItem>
                <SelectItem value="name">{ts("sortName")}</SelectItem>
                <SelectItem value="credits">{ts("sortCredits")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {results.length === 0 ? (
            <Card className="flex animate-pop-in flex-col items-center gap-2 py-12 text-center">
              <span className="inline-flex size-14 animate-float items-center justify-center rounded-lg bg-secondary-soft text-secondary-strong">
                <SearchX className="size-7" aria-hidden />
              </span>
              <p className="type-h3 text-text">{ts("emptyTitle")}</p>
              <p className="type-small text-text-secondary">{ts("emptyBody")}</p>
              {activeFilters > 0 && (
                <Button variant="outline" size="sm" className="mt-2" onClick={clearAll}>
                  {ts("clearAll")}
                </Button>
              )}
            </Card>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {results.slice(0, shown).map((c, i) => {
                const status = st.status(c.code);
                return (
                  <li
                    key={`${c.code}-${query}-${scope}`}
                    style={{ "--i": i % PAGE } as React.CSSProperties}
                    className="stagger animate-rise-in border-b border-border last:border-b-0"
                  >
                    <Link
                      href={`/course/${c.code}`}
                      className={cn("pop-row group grid grid-cols-1 gap-3 px-4 py-4 transition-colors outline-none hover:bg-surface-hover focus-visible:bg-surface-hover sm:grid-cols-[minmax(0,1fr)_auto] md:px-5 md:py-5 xl:grid-cols-[minmax(0,1fr)_220px_auto]", CATEGORY_STYLE[c.category].pop)}
                    >
                      <div className="flex min-w-0 gap-3 md:gap-4">
                        <CategoryTile category={c.category} className="mt-0.5 transition-transform duration-(--duration-base) ease-(--ease-bounce) group-hover:-rotate-6 group-hover:scale-105" />
                        <div className="min-w-0">
                          <p className="type-label text-text md:type-h3">{c.nameEn}</p>
                          {locale === "th" && <p className="type-small text-text-secondary">{c.nameTh}</p>}
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 type-small text-text-secondary">
                            <span className="type-small-medium text-text">{c.code}</span>
                            <CategoryTag category={c.category} />
                            <span>{tc("credits", { count: c.credits })}</span>
                          </p>
                          <div className="mt-1.5">
                            <StatusLine status={status} missing={st.missing(c.code)} prereqs={PREREQS[c.code]} />
                          </div>
                        </div>
                      </div>
                      <div className="hidden flex-col gap-1.5 type-small text-text-secondary xl:flex">
                        <span className="flex items-center gap-1.5">
                          <Clock3 className="size-4 shrink-0 text-info" aria-hidden />
                          {c.creditPattern ?? tc("credits", { count: c.credits })}
                        </span>
                        <span className="flex items-start gap-1.5">
                          <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          <span className="line-clamp-2">{planText(c)}</span>
                        </span>
                      </div>
                      <span
                        className={cn(
                          "hidden h-9 items-center self-center rounded-md border border-border-strong px-3 type-small-medium text-text transition-transform duration-(--duration-base) ease-(--ease-bounce) sm:inline-flex",
                          "group-hover:translate-x-1 group-hover:border-primary group-hover:text-primary",
                        )}
                      >
                        {t("viewCourse")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {results.length > shown && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setShown((n) => n + PAGE)}>
              {ts("showMore", { count: Math.min(PAGE, results.length - shown) })}
            </Button>
          )}
        </div>
      </div>
      <p className="mt-6 type-caption text-text-secondary">{ts("footnote")}</p>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 type-small text-text-secondary">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}
