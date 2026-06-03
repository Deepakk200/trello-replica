import { BoardSkeleton } from "@/components/ui/loading-skeleton";

export default function Loading() {
  return (
    <div className="h-screen w-full bg-trello-bg">
      <BoardSkeleton />
    </div>
  );
}
