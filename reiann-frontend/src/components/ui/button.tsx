import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Figma: Components / Button
 * Style = Primary | Soft | Outline | Strawberry | Danger (+ Ghost for icon-only)
 * Size = Md (44) | Sm (36)
 * State = Default | Hover | Focus | Disabled — handled with CSS states.
 */
const buttonVariants = cva(
  "press inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent whitespace-nowrap outline-none select-none focus-visible:shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--btn)] disabled:pointer-events-none disabled:bg-surface-alt disabled:text-text-disabled disabled:border-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
        soft: "bg-primary-soft text-primary-active hover:bg-primary-soft-hover",
        outline:
          "border-border-strong bg-surface text-text hover:bg-surface-hover disabled:bg-surface disabled:border-border",
        strawberry: "bg-secondary text-on-secondary hover:bg-secondary-hover",
        danger: "bg-danger text-on-danger hover:bg-danger-hover",
        ghost: "text-text-secondary hover:bg-surface-hover hover:text-text",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 type-label",
        sm: "h-9 px-3 type-small-medium [&_svg:not([class*='size-'])]:size-4",
        icon: "size-11",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
