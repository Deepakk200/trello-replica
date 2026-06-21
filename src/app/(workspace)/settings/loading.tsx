import { SettingsSkeleton } from "@/components/ui/loading-skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-trello-bg">
      <SettingsSkeleton />
    </main>
  );
}
