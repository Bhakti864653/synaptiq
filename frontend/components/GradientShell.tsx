import TopNav from "./TopNav";
import CursorGlow from "./CursorGlow";

// Shared bold/colorful chrome for the landing, login, and signup pages —
// the main app (dashboard and its tabs) intentionally keeps the flat,
// no-shadow/no-glow design and does not use this.
export default function GradientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden gradient-hero">
      <CursorGlow />
      <div className="relative z-10">
        <TopNav />
      </div>
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
