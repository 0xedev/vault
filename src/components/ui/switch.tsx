import * as React from "react";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      role="switch"
      className={cn("h-5 w-9 cursor-pointer appearance-none rounded-full bg-secondary transition-colors checked:bg-primary before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  ),
);
Switch.displayName = "Switch";
