import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import MascotCompanion from "@/components/MascotCompanion";
import { MascotProvider } from "@/lib/mascotContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MascotProvider>
      <div className="flex min-h-screen flex-col">
        <TopNav showLogout />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1">{children}</div>
        </div>
      </div>
      <MascotCompanion />
    </MascotProvider>
  );
}
