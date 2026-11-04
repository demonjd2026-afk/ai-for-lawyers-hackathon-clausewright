import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-saffron-500 text-ink-950 shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_6px_16px_-8px_rgb(245_165_36/0.9)] hover:bg-saffron-400 active:bg-saffron-600",
  secondary: "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950",
  ghost: "bg-white text-ink-900 border border-mist-300 hover:border-mist-500 hover:bg-mist-50",
  danger: "bg-vermilion-500 text-white hover:bg-vermilion-600",
  link: "bg-transparent text-ink-600 underline underline-offset-4 decoration-ink-300 hover:decoration-ink-600 px-0 py-0 h-auto rounded-none",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8rem] gap-1.5",
  md: "h-10 px-4 text-[0.9rem] gap-2",
  lg: "h-12 px-6 text-[1rem] gap-2.5",
};

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold whitespace-nowrap transition-[background-color,border-color,transform,box-shadow] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        VARIANT[variant], variant === "link" ? "" : SIZE[size], className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
