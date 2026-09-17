import SynaptiqMark, { LogoVariant } from "./SynaptiqMark";

// Full horizontal lockup: the mark plus the "Synaptiq" wordmark in the
// app's existing editorial display face (Fraunces) - this is the one place
// the mark and the name are guaranteed to appear together, so every other
// usage (nav, favicon, loading states) can safely use the symbol alone.
export default function SynaptiqLogo({
  size = 28,
  variant = "gradient",
  className = "",
  wordmarkClassName = "",
}: {
  size?: number;
  variant?: LogoVariant;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SynaptiqMark size={size} variant={variant} title="Synaptiq" />
      <span
        className={`font-semibold leading-none ${wordmarkClassName}`}
        style={{ fontFamily: "var(--font-fraunces)", fontSize: size * 0.64 }}
      >
        Synaptiq
      </span>
    </span>
  );
}
