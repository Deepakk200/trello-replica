// Workspace settings — Server Component. Loads workspace + members, then hands
// off to a client component for the interactive tabs.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyWorkspace, listMyWorkspaces } from "@/features/workspaces/actions";
import { getBillingInfo } from "@/features/billing/actions";
import { DbWorkspaceSwitcher } from "@/components/ui/db-workspace-switcher";
import { SettingsTabs } from "./settings-tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/settings");

  const workspace = await getMyWorkspace();
  if (!workspace) {
    return <main className="min-h-screen bg-trello-bg p-8 text-trello-text">No workspace found.</main>;
  }

  const myRole = workspace.members.find((m) => m.user.id === session.user!.id)?.role ?? "MEMBER";
  const [billing, workspaces] = await Promise.all([getBillingInfo(), listMyWorkspaces()]);

  return (
    <main className="min-h-screen bg-trello-bg">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <a href="/boards" className="text-sm text-trello-textSubtle hover:text-trello-text">← Back to boards</a>
        <div className="flex items-center justify-between gap-3 mt-2 mb-6 flex-wrap">
          <h1 className="text-xl font-bold text-trello-text">Workspace Settings</h1>
          <DbWorkspaceSwitcher workspaces={workspaces} />
        </div>
        <SettingsTabs
          workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
          members={workspace.members.map((m) => ({
            id: m.user.id, name: m.user.name, email: m.user.email, avatarUrl: m.user.avatarUrl, role: m.role,
          }))}
          myUserId={session.user.id}
          myRole={myRole}
          billing={billing}
        />
      </div>
    </main>
  );
}
