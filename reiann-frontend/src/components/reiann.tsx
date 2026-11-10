/**
 * Small Reiann components that map 1:1 to Figma components
 * (Text Field, Banner, Tag, Filter Chip, Segment, Card, Progress Bar).
 */
import * as React from "react";
import { cn } from "cn";
import { AlertTriangle, Check, CheckCircle2, Info, XCircle } from "lucide-react";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-lg border border-border bg-surface p-5", className)}
      {...props}
    />
  );
}

/** Figma: Text Field (State = Default | Focus | Error | Disabled). */
export const TextField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { invalid?: boolean }
>(function TextField({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "field h-11 w-full rounded-md border border-border-strong bg-surface px-3 type-body text-text outline-none placeholder:text-text-secondary",
        "disabled:border-border disabled:bg-surface-alt disabled:text-text-disabled",
        className,
      )}
      {...props}
    />
  );
});

export function FieldLabel({
  children,
  hint,
  htmlFor,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline gap-2 type-small-medium text-text">
      {children}
      {hint && <span className="type-caption text-text-muted">{hint}</span>}
    </label>
  );
}

const bannerTone = {
  warning: { cls: "bg-warning-bg", Icon: AlertTriangle, icon: "text-warning" },
  info: { cls: "bg-info-bg", Icon: Info, icon: "text-info" },
  success: { cls: "bg-success-bg", Icon: CheckCircle2, icon: "text-success" },
  error: { cls: "bg-error-bg", Icon: XCircle, icon: "text-error" },
};

/** Figma: Banner (Tone = Warning | Info | Success | Error). */
export function Banner({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof bannerTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const t = bannerTone[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex animate-rise-in items-start gap-3 rounded-md px-4 py-3", t.cls, className)}
    >
      <t.Icon className={cn("mt-0.5 size-5 shrink-0", t.icon)} aria-hidden />
      <div className="min-w-0 flex-1 type-small text-text">
        {title && <p className="type-small-medium">{title}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}

const tagTone = {
  neutral: "bg-surface-alt text-text-secondary",
  matcha: "bg-primary-soft text-primary-active",
  strawberry: "bg-secondary-soft text-secondary-strong",
  amber: "bg-warning-bg text-warning",
  blue: "bg-info-bg text-info",
  purple: "bg-career-bg text-text",
};

/** Figma: Tag (Tone = Neutral | Matcha | Strawberry | Amber | Blue | Purple). */
export function Tag({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: keyof typeof tagTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 type-badge",
        tagTone[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export type PopColor = "pink" | "sky" | "mango" | "matcha" | "grape";

/** Figma: Filter Chip / Segment (State = Default | Selected). `pop` is its hover and selected colour. */
export function Chip({
  selected,
  className,
  children,
  check,
  pop = "pink",
  style,
  ...props
}: React.ComponentProps<"button"> & { selected?: boolean; check?: boolean; pop?: PopColor }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      style={{ "--pop": `var(--color-pop-${pop})`, ...style } as React.CSSProperties}
      className={cn(
        "chip-pop press inline-flex h-9 items-center gap-1.5 rounded-full border px-3 type-small-medium outline-none focus-visible:ring-3 focus-visible:ring-focus/30",
        selected
          ? "animate-jelly border-secondary-strong bg-secondary-soft text-text"
          : "border-border-strong bg-surface text-text hover:bg-surface-hover",
        className,
      )}
      {...props}
    >
      {check && selected && <Check className="size-4 animate-pop-in" aria-hidden />}
      {children}
    </button>
  );
}

/** Figma: Segment inside a segmented control or tab bar. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex rounded-md bg-surface-alt p-1", className)}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "press h-10 rounded-sm px-4 type-small-medium outline-none focus-visible:ring-3 focus-visible:ring-focus/30",
              selected
                ? "animate-jelly border border-border bg-surface text-text shadow-sm"
                : "text-text-secondary hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Figma: Progress Bar. */
export function ProgressBar({
  value,
  className,
  barClassName,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-alt", className)}
    >
      <div className={cn("h-full origin-left animate-grow-x rounded-full bg-primary transition-[width] duration-(--duration-slow) ease-(--ease-out-soft)", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("type-small text-text-secondary", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-wave rounded-md", className)} aria-hidden />;
}
