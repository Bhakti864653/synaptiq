import { HTMLAttributes } from "react";
import { masteryColorVar } from "@/lib/mastery";

export default function Card({
  mastery,
  className = "",
  style,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { mastery?: number }) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-4 ${className}`}
      style={{
        ...(mastery !== undefined
          ? { borderLeft: `4px solid ${masteryColorVar(mastery)}` }
          : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
