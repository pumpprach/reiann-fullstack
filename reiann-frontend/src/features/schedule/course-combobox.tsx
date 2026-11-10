"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useLocale } from "next-intl";
import { Popover } from "radix-ui";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { matchesQuery } from "@/core/courses";
import type { Course } from "@/core/types";

export interface CourseGroup {
  label: string;
  courses: Course[];
}

/**
 * Type-to-filter course picker (WAI-ARIA combobox). The list is capped at
 * about 7 rows and scrolls, so a long GE catalog never covers the dialog.
 */
export function CourseCombobox({
  value,
  onChange,
  groups,
  label,
  placeholder,
  emptyText,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  groups: CourseGroup[];
  label: string;
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const all = groups.flatMap((g) => g.courses);
  const selected = all.find((c) => c.code === value);
  const filtered = useMemo(
    () => groups.map((g) => ({ ...g, courses: g.courses.filter((c) => matchesQuery(c, query)) })).filter((g) => g.courses.length > 0),
    [groups, query],
  );
  const flat = filtered.flatMap((g) => g.courses);
  // Index of each group's first row in `flat`, for keyboard focus.
  const offsets = filtered.map((_, gi) => filtered.slice(0, gi).reduce((n, g) => n + g.courses.length, 0));

  function openList() {
    if (disabled) return;
    setQuery("");
    // Start on the selected course so Enter keeps it.
    setActive(Math.max(0, all.findIndex((c) => c.code === value)));
    setOpen(true);
  }

  function pick(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  function move(next: number) {
    const i = (next + flat.length) % flat.length;
    setActive(i);
    listRef.current?.querySelector(`[data-index="${i}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open || flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(flat[active].code);
    } else if (e.key === "Escape") {
      // Close the list only; the dialog stays open.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  const display = open ? query : selected ? `${selected.code} ${selected.nameEn}` : "";

  return (
    <Popover.Root open={open} onOpenChange={(o) => (o ? openList() : setOpen(false))}>
      <Popover.Anchor asChild>
        <div
          className={cn(
            "field flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-3",
            disabled && "border-border bg-surface-alt",
          )}
        >
          <Search className="size-4 shrink-0 text-text-secondary" aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && flat[active] ? `${listId}-${flat[active].code}` : undefined}
            disabled={disabled}
            value={display}
            placeholder={selected ? `${selected.code} ${selected.nameEn}` : placeholder}
            // Open on click or typing, not on focus: the dialog focuses this field when it opens.
            onClick={() => !open && openList()}
            onChange={(e) => {
              const v = e.target.value;
              // Typing while closed starts a fresh search instead of editing the shown course name.
              setQuery(!open && v.startsWith(display) ? v.slice(display.length) : v);
              setActive(0);
              if (!open) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 truncate bg-transparent type-body text-text outline-none placeholder:text-text-secondary disabled:text-text-disabled"
          />
          <ChevronDown
            className={cn("size-4 shrink-0 text-text-secondary transition-transform duration-(--duration-base) ease-(--ease-bounce)", open && "rotate-180")}
            aria-hidden
          />
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          // Keep typing in the input while the list is open.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (e.target instanceof Node && inputRef.current?.parentElement?.contains(e.target)) e.preventDefault();
          }}
          className="z-50 w-(--radix-popover-trigger-width) origin-(--radix-popover-content-transform-origin) animate-pop-in overflow-hidden rounded-lg bg-popover shadow-lg ring-1 ring-foreground/10"
        >
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-[min(20rem,45dvh)] overflow-y-auto overscroll-contain p-1"
          >
            {flat.length === 0 && <li className="px-3 py-6 text-center type-small text-text-secondary">{emptyText}</li>}
            {filtered.map((g, gi) => (
              <li key={g.label} role="presentation">
                <p className="sticky top-0 z-10 bg-popover px-2 pt-2 pb-1 type-eyebrow text-text-secondary">{g.label}</p>
                <ul role="group" aria-label={g.label}>
                  {g.courses.map((c, ci) => {
                    const i = offsets[gi] + ci;
                    const isSelected = c.code === value;
                    return (
                      <li
                        key={c.code}
                        id={`${listId}-${c.code}`}
                        role="option"
                        aria-selected={isSelected}
                        data-index={i}
                        onMouseEnter={() => setActive(i)}
                        // mousedown keeps focus in the input
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(c.code)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5",
                          i === active && "bg-surface-hover",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate type-small text-text">
                            <span className="text-text-secondary">{c.code}</span> {c.nameEn}
                          </span>
                          {locale === "th" && <span className="block truncate type-caption text-text-secondary">{c.nameTh}</span>}
                        </span>
                        {isSelected && <Check className="size-4 shrink-0 animate-pop-in text-primary" aria-hidden />}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
