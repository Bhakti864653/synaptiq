import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import MascotCompanion from "@/components/MascotCompanion";
import DashboardBackdrop from "@/components/DashboardBackdrop";
import { MascotProvider } from "@/lib/mascotContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MascotProvider>
      <DashboardBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav showLogout />
        <div className="flex flex-1">
          <Sidebar />
          {/* min-w-0: a flex item defaults to min-width:auto, which can
              keep it pinned to its content's full intrinsic width and
              force real horizontal overflow on narrow screens once any
              page's content is wide enough to hit it - this is the one
              shared wrapper around every dashboard page, so the fix
              belongs here rather than on each page individually. */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
      <MascotCompanion />
    </MascotProvider>
  );
}
