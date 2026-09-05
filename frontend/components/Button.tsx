import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "organic" | "organic-primary";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:opacity-85",
  secondary: "border border-line bg-surface text-ink hover:bg-line/40",
  ghost: "text-ink-muted hover:bg-line/40 hover:text-ink",
  // Landing-page-only ("Warm Margin" redesign): organic asymmetric corners
  // instead of the app-wide rounded-md, on the landing palette's tokens.
  organic:
    "!rounded-[14px_6px_14px_6px] bg-landing-glow-violet/10 text-landing-glow-violet hover:bg-landing-glow-violet/[0.16]",
  // Landing-page-only: the solid dark CTA style (landing hero's "Sign up",
  // and login/signup form submit buttons).
  "organic-primary":
    "!rounded-[14px_6px_14px_6px] !bg-landing-ink !text-landing-paper shadow-[4px_4px_0_rgba(242,166,63,0.35)] hover:opacity-90",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
