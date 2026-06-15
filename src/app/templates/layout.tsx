import { TopBar } from "@/components/ui/top-bar";

// Templates gallery shares the global top bar (same chrome as the rest of the app).
export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#1D2125" }}>
      <TopBar />
      <main className="flex-1 min-h-0 overflow-y-auto bg-trello-bg">{children}</main>
    </div>
  );
}
