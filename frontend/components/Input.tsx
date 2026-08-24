import { InputHTMLAttributes } from "react";

export default function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors focus:border-brand ${className}`}
      {...props}
    />
  );
}
