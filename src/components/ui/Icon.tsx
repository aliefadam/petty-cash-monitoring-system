import { cn } from "../../utils/cn";

interface IconProps {
  name: string;
  bold?: boolean;
  className?: string;
}

/** Icon dari CDN Flaticon UIcons (rounded) */
export function Icon({ name, bold, className }: IconProps) {
  return <i aria-hidden="true" className={cn(bold ? `fi fi-br-${name}` : `fi fi-rr-${name}`, className)} />;
}
