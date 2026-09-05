import { HTMLAttributes } from "react";

export default function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[12px_5px_12px_5px] border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(44,36,26,0.15)] dark:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.4)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
