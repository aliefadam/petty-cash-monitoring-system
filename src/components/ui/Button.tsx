import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

interface ButtonProps {
  children?: ReactNode;
  icon?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  className?: string;
  title?: string;
  iconOnly?: boolean;
  full?: boolean;
}

const variants = {
  primary:
    "bg-linear-to-r from-blue-600 via-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-110",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/60",
  soft: "bg-blue-50 text-blue-700 hover:bg-blue-100",
  ghost: "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
  danger: "bg-linear-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/25 hover:brightness-110",
};

const sizes = {
  sm: "h-9 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-sm gap-2 rounded-xl",
};

const iconOnlySizes = { sm: "h-9 w-9 rounded-lg", md: "h-11 w-11 rounded-xl", lg: "h-12 w-12 rounded-xl" };

export function Button({
  children,
  icon,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  onClick,
  type = "button",
  className,
  title,
  iconOnly,
  full,
}: ButtonProps) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition-all duration-300 ease-out select-none",
        "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-blue-200 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        variants[variant],
        iconOnly ? iconOnlySizes[size] : sizes[size],
        full && "w-full",
        className
      )}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && <Icon name={icon} className="text-[1.05em]" />
      )}
      {children}
    </button>
  );
}
