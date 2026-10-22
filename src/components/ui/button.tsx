import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium cursor-pointer transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-burgundy text-ivory shadow-[0_10px_24px_-14px_rgba(232,93,58,0.65)] hover:bg-charcoal hover:shadow-[0_18px_34px_-18px_rgba(26,26,26,0.7)]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-charcoal/15 bg-transparent text-charcoal hover:border-burgundy hover:text-burgundy",
        secondary: "bg-bone text-charcoal hover:bg-bone/70",
        ghost: "hover:bg-bone hover:text-charcoal",
        link: "text-burgundy underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default: "h-11 px-6 py-2.5 text-[13px]",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-[13px] tracking-[0.18em] uppercase",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
