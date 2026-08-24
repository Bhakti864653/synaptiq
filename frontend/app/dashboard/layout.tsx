import TopNav from "@/components/TopNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav showLogout />
      {children}
    </div>
  );
}
