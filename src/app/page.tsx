import { redirect } from "next/navigation";

// Canonical entry point. The DB app (/boards) is the source of truth (see
// CLAUDE.md "DB app is CANONICAL"); the localStorage workspace home is demoted.
// The legacy board shell (/b) + its Inbox/Planner dock still work if navigated
// to directly, but the front door is now the real DB boards landing.
export default function Home() {
  redirect("/boards");
}
