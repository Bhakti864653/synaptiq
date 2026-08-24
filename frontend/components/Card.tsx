import { HTMLAttributes } from "react";

export default function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border border-line bg-surface p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
