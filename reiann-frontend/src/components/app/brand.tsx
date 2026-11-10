import { cn } from "cn";

/** Figma: Brand Mark — the user's logo on a matcha tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="307 295 640 640" className="size-[78%]" fill="none" stroke="currentColor" strokeWidth={34} strokeLinecap="round" strokeLinejoin="round">
        <path d="M448 488 A182 182 0 0 1 806 488" />
        <path d="M600 543 C574 500 576 444 628 424 C652 415 678 414 697 415 C700 468 682 516 636 524" />
        <path d="M642 487 C622 498 606 518 600 543" />
        <path d="M627 632 C592 570 510 526 410 524 L410 794 C505 796 585 820 627 878 C669 820 749 796 844 794 L844 524 C744 526 662 570 627 632 Z" />
        <path d="M627 632 L627 878" />
        <path d="M382 581 L365 581 L365 842 L540 842 C580 848 607 862 627 880 C647 862 674 848 714 842 L889 842 L889 581 L872 581" />
      </svg>
    </span>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("group/brand inline-flex items-center gap-2", className)}>
      <BrandMark className="group-hover/brand:animate-jelly" />
      <span className="type-brand text-text">Reiann</span>
    </span>
  );
}
